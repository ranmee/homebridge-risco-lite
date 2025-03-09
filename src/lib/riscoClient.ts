import { Logger, PlatformConfig } from 'homebridge';
import axios from 'axios';

const RISCO_BASE_URL = 'https://www.riscocloud.com/webapi';
const USER_AGENT = 'iRISCO/0002 CFNetwork/1197 Darwin/20.0.0';

/**
 * Enum representing the possible arm states of the system
 */
export enum ArmState {
  NotArmed = 1,
  StayArmed = 2,
  AwayArmed = 3
}

/**
 * Configuration interface for RiscoClient
 */
interface RiscoConfig {
  username: string;
  password: string;
  pinCode: string;
  siteId: string;
}

interface LoginResponse {
  status: number;
  response: {
    accessToken: string;
    expiresAt: string;
    tokenType: string;
    refreshToken: string;
  };
}

interface SessionResponse {
  status: number;
  response: {
    sessionId: string;
    expiresAt: string;
  };
}

interface StateResponse {
  status: number;
  response: {
    state: {
      status: {
        partitions: Array<{
          id: number;
          armedState: number;
        }>;
      };
    };
  };
}

interface ArmStateResponse {
  status: number;
}

/**
 * Client for interacting with the Risco Cloud API
 */
export class RiscoClient {
  private readonly config: RiscoConfig;
  private readonly log: Logger;
  private accessToken?: string;
  private refreshToken?: string;
  private sessionId?: string;

  constructor(config: PlatformConfig, log: Logger) {
    this.config = {
      username: config.riscoUsername as string,
      password: config.riscoPassword as string,
      siteId: config.riscoSiteId as string,
      pinCode: config.riscoPIN as string,
    };
    this.log = log;
  }

  /**
   * Initialize the client and authenticate with Risco Cloud
   */
  async init(): Promise<void> {
    try {
      await this.login();
      await this.getSession();
    } catch (error) {
      this.log.error('Failed to initialize RiscoClient:', error);
      throw error;
    }
  }

  async reAuthenticate(): Promise<void> {
    try {
      await this.login();
      await this.getSession();
    } catch (error) {
      this.log.error('Failed to re-authenticate RiscoClient:', error);
      throw error;
    }
  }

  /**
   * Login to Risco Cloud and get access token
   */
  private async login(): Promise<void> {
    try {
      const response = await axios.post<LoginResponse>(
        `${RISCO_BASE_URL}/api/auth/login`,
        {
          userName: this.config.username,
          password: this.config.password,
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.response?.accessToken) {
        throw new Error('No access token received from Risco Cloud');
      }

      this.accessToken = response.data.response.accessToken;
      this.refreshToken = response.data.response.refreshToken;
      this.log.debug('Successfully logged in to Risco Cloud');
    } catch (error) {
      this.log.error('Failed to login to Risco Cloud:', error);
      throw error;
    }
  }

  /**
   * Get a session ID from Risco Cloud
   */
  private async getSession(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available. Please login first.');
    }

    try {
      const response = await axios.post<SessionResponse>(
        `${RISCO_BASE_URL}/api/wuws/site/${this.config.siteId}/Login`,
        {
          languageId: 'en-en',
          pinCode: this.config.pinCode,
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.data.response?.sessionId) {
        throw new Error('No session ID received from Risco Cloud');
      }

      this.sessionId = response.data.response.sessionId;
      this.log.debug('Successfully acquired session ID from Risco Cloud');
    } catch (error) {
      this.log.error('Failed to get session ID from Risco Cloud:', error);
      throw error;
    }
  }

  /**
   * Get the current armed state of the system
   */
  async getArmedState(): Promise<ArmState> {
    if (!this.accessToken || !this.sessionId) {
      await this.reAuthenticate();
    }

    try {
      const response = await axios.post<StateResponse>(
        `${RISCO_BASE_URL}/api/wuws/site/${this.config.siteId}/ControlPanel/GetState`,
        {
          sessionToken: this.sessionId,
          fromControlPanel: false,
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
        },
      );

      const firstPartition = response.data.response.state.status.partitions[0];
      if (!firstPartition) {
        this.log.warn('No partition information received from Risco Cloud');
        throw new Error('No partition information available');
      }

      return firstPartition.armedState as ArmState;
    } catch (error) {
      this.log.error('Failed to get armed state from Risco Cloud:', error);
      throw error;
    }
  }

  /**
   * Set the arm state of the system
   * @param state The desired arm state (NotArmed, StayArmed, or AwayArmed)
   */
  async setArmedState(state: ArmState): Promise<void> {
    if (!this.accessToken || !this.sessionId) {
      await this.reAuthenticate();
    }

    try {
      const response = await axios.post<ArmStateResponse>(
        `${RISCO_BASE_URL}/api/wuws/site/${this.config.siteId}/ControlPanel/PartArm`,
        {
          sessionToken: this.sessionId,
          partitions: [{
            id: 0,
            armedState: state as number,
          }],
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
        },
      );

      if (response.data.status !== 200) {
        throw new Error(`Failed to set arm state. Server returned status: ${response.data.status}`);
      }

      this.log.debug(`Successfully set system to arm state: ${ArmState[state]}`);
    } catch (error) {
      this.log.error('Failed to set arm state:', error);
      throw error;
    }
  }
} 