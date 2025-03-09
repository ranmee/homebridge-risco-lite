import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { ArmState } from './lib/riscoClient.js';
import type { RiscoAlarmPlatform } from './platform.js';

/**
 * Security System States in HomeKit:
 * 0 = STAY_ARM     / Home - Some sensors are active
 * 1 = AWAY_ARM     / Away - All sensors are active
 * 2 = NIGHT_ARM    / Night - Subset of sensors are active
 * 3 = DISARMED     / Off - All sensors inactive
 * 4 = ALARM_TRIGGERED / Alarm is triggered
 */
export class RiscoSecuritySystemAccessory {
  private service: Service;

  // Store both current and target states
  private securityState = {
    currentState: 3, // Start DISARMED
    targetState: 3,  // Start DISARMED
    isConnected: true,
  };

  constructor(
    private readonly platform: RiscoAlarmPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Risco')
      .setCharacteristic(this.platform.Characteristic.Model, 'Security System')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id || 'Unknown');

    // get the SecuritySystem service if it exists, otherwise create a new SecuritySystem service
    this.service = this.accessory.getService(this.platform.Service.SecuritySystem) || 
      this.accessory.addService(this.platform.Service.SecuritySystem);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name || 'Risco Alarm');

    // register handlers for the SecuritySystemCurrentState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState)
      .onGet(this.getCurrentState.bind(this));

    // register handlers for the SecuritySystemTargetState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.setTargetState.bind(this))
      .onGet(this.getTargetState.bind(this));

    // Initialize the current state
    this.updateCurrentState();
  }

  /**
   * Convert Risco ArmState to HomeKit security state
   */
  private riscoToHomeKit(armState: ArmState): number {
    switch (armState) {
      case ArmState.NotArmed:
        return 3; // DISARMED
      case ArmState.StayArmed:
        return 0; // STAY_ARM
      case ArmState.AwayArmed:
        return 1; // AWAY_ARM
      default:
        return 3; // Default to DISARMED
    }
  }

  /**
   * Convert HomeKit security state to Risco ArmState
   */
  private homeKitToRisco(state: number): ArmState {
    switch (state) {
      case 0: // STAY_ARM
        return ArmState.StayArmed;
      case 1: // AWAY_ARM
        return ArmState.AwayArmed;
      case 2: // NIGHT_ARM (treat as Stay)
        return ArmState.StayArmed;
      case 3: // DISARMED
        return ArmState.NotArmed;
      default:
        return ArmState.NotArmed;
    }
  }

  /**
   * Get a human-readable description of the security state
   */
  private getStateDescription(state: number): string {
    switch (state) {
      case 0:
        return 'STAY_ARM (Home)';
      case 1:
        return 'AWAY_ARM (Away)';
      case 2:
        return 'NIGHT_ARM (Night)';
      case 3:
        return 'DISARMED (Off)';
      case 4:
        return 'ALARM_TRIGGERED';
      default:
        return `Unknown (${state})`;
    }
  }

  /**
   * Update the current state from Risco
   */
  private async updateCurrentState(): Promise<void> {
    try {
      const riscoState = await this.platform.riscoClient.getArmedState();
      const homekitState = this.riscoToHomeKit(riscoState);
      
      this.securityState.currentState = homekitState;
      this.securityState.targetState = homekitState;
      
      this.service.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        homekitState,
      );
      this.service.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemTargetState,
        homekitState,
      );
    } catch (error) {
      this.platform.log.error('Failed to update current state:', error);
      this.securityState.isConnected = false;
    }
  }

  /**
   * Handle "GET" requests from HomeKit for current state
   */
  async getCurrentState(): Promise<CharacteristicValue> {
    if (!this.securityState.isConnected) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    try {
      const riscoState = await this.platform.riscoClient.getArmedState();
      const homekitState = this.riscoToHomeKit(riscoState);
      this.securityState.currentState = homekitState;

      this.platform.log.debug(
        'Get CurrentState ->',
        this.getStateDescription(homekitState),
      );

      return homekitState;
    } catch (error) {
      this.platform.log.error('Failed to get current state:', error);
      this.securityState.isConnected = false;
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  /**
   * Handle "GET" requests from HomeKit for target state
   */
  async getTargetState(): Promise<CharacteristicValue> {
    if (!this.securityState.isConnected) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    try {
      const riscoState = await this.platform.riscoClient.getArmedState();
      const homekitState = this.riscoToHomeKit(riscoState);
      this.securityState.targetState = homekitState;

      this.platform.log.debug(
        'Get TargetState ->',
        this.getStateDescription(homekitState),
      );

      return homekitState;
    } catch (error) {
      this.platform.log.error('Failed to get target state:', error);
      this.securityState.isConnected = false;
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  /**
   * Handle "SET" requests from HomeKit for target state
   */
  async setTargetState(value: CharacteristicValue) {
    if (!this.securityState.isConnected) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    const newState = value as number;
    this.platform.log.info(
      'Setting target state to:',
      this.getStateDescription(newState),
    );

    try {
      const riscoState = this.homeKitToRisco(newState);
      await this.platform.riscoClient.setArmedState(riscoState);
      
      // Update both target and current state
      this.securityState.targetState = newState;
      this.securityState.currentState = newState;
      
      this.service.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        newState,
      );

      this.platform.log.info(
        'Successfully changed alarm state to:',
        this.getStateDescription(newState),
      );
    } catch (error) {
      this.platform.log.error('Failed to set alarm state:', error);
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }
}
