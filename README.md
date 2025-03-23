# Cal.com Calendar MCP Server

An MCP server implementation that integrates with Cal.com Calendar API, providing appointment scheduling capabilities.

## Features

- **Add Appointments**: Schedule new calendar appointments with attendee details
- **Update Appointments**: Modify existing appointment details such as time and notes
- **Delete Appointments**: Cancel and remove existing appointments
- **List Appointments**: View scheduled appointments for specific date ranges

## Tools

- **calcom_add_appointment**
  - Create new calendar appointments
  - Inputs:
    - `eventTypeId` (number): The Cal.com event type ID
    - `startTime` (string): Start time in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
    - `endTime` (string): End time in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
    - `name` (string): Attendee's name
    - `email` (string): Attendee's email
    - `notes` (string, optional): Additional notes for the appointment

- **calcom_update_appointment**
  - Update existing calendar appointments
  - Inputs:
    - `bookingId` (number): The Cal.com booking ID to update
    - `startTime` (string, optional): New start time in ISO format
    - `endTime` (string, optional): New end time in ISO format
    - `notes` (string, optional): New notes for the appointment

- **calcom_delete_appointment**
  - Delete existing calendar appointments
  - Inputs:
    - `bookingId` (number): The Cal.com booking ID to delete
    - `reason` (string, optional): Reason for cancellation

- **calcom_list_appointments**
  - List calendar appointments in a date range
  - Inputs:
    - `startDate` (string): Start date in YYYY-MM-DD format
    - `endDate` (string): End date in YYYY-MM-DD format


## Configuration

### Getting an API Key
1. Sign up for a [Cal.com account](https://cal.com)
2. Navigate to Settings > Developer > API Keys
3. Generate a new API key with appropriate permissions

### Usage with Claude Desktop
Add this to your `claude_desktop_config.json`:

### Docker

```json
{
  "mcpServers": {
    "calcom-calendar": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "CALCOM_API_KEY",
        "mcp/calcom-calendar"
      ],
      "env": {
        "CALCOM_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "calcom-calendar": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-calcom-calendar"
      ],
      "env": {
        "CALCOM_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```


## Build

Docker build:

```bash
docker build -t mcp/calcom-calendar:latest -f Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
