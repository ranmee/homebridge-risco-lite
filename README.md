# Homebridge Risco Lite

A simple Homebridge plugin to arm and disarm Risco alarm systems. This plugin allows you to control your Risco security system through Apple's HomeKit, enabling you to arm and disarm your system using the Home app or Siri.

## Features

- Control your Risco alarm system through HomeKit
- Support for different arm states:
  - Away Armed (All sensors active)
  - Stay Armed (Partial/Home mode)
  - Disarmed
- Real-time status updates
- Secure authentication with Risco Cloud

## Prerequisites

- Node.js 18.20.4 or later
- Homebridge v1.8.0 or later
- A Risco alarm system with cloud connectivity
- Your Risco cloud account credentials

## Installation

You can install this plugin through the Homebridge UI or manually using npm:

```bash
npm install -g homebridge-risco-lite
```

## Configuration

Add the following to your Homebridge `config.json` or configure through the Homebridge UI:

```json
{
    "platforms": [
        {
            "platform": "RiscoAlarmLite",
            "name": "Risco Alarm",
            "riscoUsername": "YOUR_RISCO_USERNAME",
            "riscoPassword": "YOUR_RISCO_PASSWORD",
            "riscoSiteId": YOUR_SITE_ID,
            "riscoPIN": "YOUR_RISCO_PIN"
        }
    ]
}
```

### Configuration Parameters

- `platform`: Must be "RiscoAlarmLite" (required)
- `name`: The name that will appear in HomeKit (required)
- `riscoUsername`: Your Risco Cloud username (required)
- `riscoPassword`: Your Risco Cloud password (required)
- `riscoSiteId`: Your Risco site ID (required)
- `riscoPIN`: Your Risco alarm PIN code (required)

## How to get your riscoSiteId

To get your riscoSiteId, login to riscocloud via ChromeBrowser (first login screen), and before providing your PIN (second login page), display source of the page and find string: `<div class="site-name"` ... it will look like:

`<div class="site-name" id="site_12345_div">`

In that case "12345" is your siteId which should be placed in new config file.

## Usage

Once configured, your Risco alarm system will appear in the Home app as a security system accessory. You can:

- View the current arm state
- Arm the system (Away/Stay)
- Disarm the system
- Use Siri commands to control the system

## Development

If you want to contribute to the development:

1. Clone the repository
```bash
git clone https://github.com/ranmee/homebridge-risco-lite.git
```

2. Install dependencies
```bash
npm install
```

3. Build the plugin
```bash
npm run build
```

4. Link to your local Homebridge installation
```bash
npm link
```

## Troubleshooting

If you encounter any issues:

1. Make sure your Risco credentials are correct
2. Verify your Risco system has cloud connectivity
3. Check the Homebridge logs for any error messages
4. Ensure your network can reach the Risco Cloud servers

## Support

For bugs, feature requests, and discussions please use the [GitHub Issues](https://github.com/ranmee/homebridge-risco-lite/issues) page.

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This plugin is not affiliated with, funded, or in any way associated with Risco Group.
