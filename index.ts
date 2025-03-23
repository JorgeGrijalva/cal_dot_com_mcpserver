#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { CalComAPI } from "@calcom/api";

const ADD_APPOINTMENT_TOOL: Tool = {
  name: "calcom_add_appointment",
  description:
    "Creates a new appointment in Cal.com calendar. " +
    "Use this for scheduling new meetings or appointments. " +
    "Requires event type ID, start time, end time, name, email, and optional notes. ",
  inputSchema: {
    type: "object",
    properties: {
      eventTypeId: {
        type: "number",
        description: "The Cal.com event type ID"
      },
      startTime: {
        type: "string",
        description: "Start time in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)"
      },
      endTime: {
        type: "string",
        description: "End time in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)"
      },
      name: {
        type: "string",
        description: "Attendee's name"
      },
      email: {
        type: "string",
        description: "Attendee's email"
      },
      notes: {
        type: "string",
        description: "Optional notes for the appointment",
      }
    },
    required: ["eventTypeId", "startTime", "endTime", "name", "email"],
  },
};

const UPDATE_APPOINTMENT_TOOL: Tool = {
  name: "calcom_update_appointment",
  description:
    "Updates an existing appointment in Cal.com calendar. " +
    "Use this for rescheduling or modifying existing appointments. " +
    "Requires booking ID and the fields to update. ",
  inputSchema: {
    type: "object",
    properties: {
      bookingId: {
        type: "number",
        description: "The Cal.com booking ID to update"
      },
      startTime: {
        type: "string",
        description: "New start time in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)"
      },
      endTime: {
        type: "string",
        description: "New end time in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)"
      },
      notes: {
        type: "string",
        description: "New notes for the appointment"
      }
    },
    required: ["bookingId"],
  }
};

const DELETE_APPOINTMENT_TOOL: Tool = {
  name: "calcom_delete_appointment",
  description:
    "Deletes an existing appointment from Cal.com calendar. " +
    "Use this for canceling appointments. " +
    "Requires booking ID. ",
  inputSchema: {
    type: "object",
    properties: {
      bookingId: {
        type: "number",
        description: "The Cal.com booking ID to delete"
      },
      reason: {
        type: "string",
        description: "Optional reason for cancellation"
      }
    },
    required: ["bookingId"],
  }
};

const LIST_APPOINTMENTS_TOOL: Tool = {
  name: "calcom_list_appointments",
  description:
    "Lists appointments from Cal.com calendar. " +
    "Can be filtered by date range. " +
    "Returns a list of appointments with their details. ",
  inputSchema: {
    type: "object",
    properties: {
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format"
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format"
      }
    },
    required: ["startDate", "endDate"],
  }
};

// Server implementation
const server = new Server(
  {
    name: "example-servers/calcom-calendar",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Check for API key
const CALCOM_API_KEY = process.env.CALCOM_API_KEY!;
if (!CALCOM_API_KEY) {
  console.error("Error: CALCOM_API_KEY environment variable is required");
  process.exit(1);
}

// Initialize Cal.com API client
const calComClient = new CalComAPI({
  apiKey: CALCOM_API_KEY,
});

// Rate limiting
const RATE_LIMIT = {
  perSecond: 5,
  perDay: 1000
};

let requestCount = {
  second: 0,
  day: 0,
  lastSecReset: Date.now(),
  lastDayReset: Date.now()
};

function checkRateLimit() {
  const now = Date.now();
  
  // Reset per-second counter
  if (now - requestCount.lastSecReset > 1000) {
    requestCount.second = 0;
    requestCount.lastSecReset = now;
  }
  
  // Reset per-day counter 
  if (now - requestCount.lastDayReset > 86400000) { // 24 hours
    requestCount.day = 0;
    requestCount.lastDayReset = now;
  }
  
  if (requestCount.second >= RATE_LIMIT.perSecond || 
      requestCount.day >= RATE_LIMIT.perDay) {
    throw new Error('Rate limit exceeded');
  }
  
  requestCount.second++;
  requestCount.day++;
}

// Cal.com API functions
interface Appointment {
  id: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  status: string;
  attendees: {
    name: string;
    email: string;
  }[];
  notes?: string;
}

function isCalComAddAppointmentArgs(args: unknown): args is { 
  eventTypeId: number; 
  startTime: string; 
  endTime: string; 
  name: string; 
  email: string; 
  notes?: string;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "eventTypeId" in args &&
    "startTime" in args &&
    "endTime" in args &&
    "name" in args &&
    "email" in args
  );
}

function isCalComUpdateAppointmentArgs(args: unknown): args is { 
  bookingId: number; 
  startTime?: string; 
  endTime?: string; 
  notes?: string;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "bookingId" in args
  );
}

function isCalComDeleteAppointmentArgs(args: unknown): args is { 
  bookingId: number; 
  reason?: string;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "bookingId" in args
  );
}

function isCalComListAppointmentsArgs(args: unknown): args is { 
  startDate: string; 
  endDate: string;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "startDate" in args &&
    "endDate" in args
  );
}

async function addAppointment(
  eventTypeId: number, 
  startTime: string, 
  endTime: string, 
  name: string, 
  email: string, 
  notes?: string
) {
  checkRateLimit();
  
  try {
    const booking = await calComClient.bookings.create({
      eventTypeId,
      start: new Date(startTime),
      end: new Date(endTime),
      name,
      email,
      notes,
    });
    
    return `Appointment created successfully! Booking ID: ${booking.id}
Event Type: ${booking.eventTypeId}
Start Time: ${booking.startTime}
End Time: ${booking.endTime}
Attendee: ${name} (${email})
${notes ? `Notes: ${notes}` : ""}`;
  } catch (error) {
    throw new Error(`Failed to create appointment: ${error}`);
  }
}

async function updateAppointment(
  bookingId: number, 
  startTime?: string, 
  endTime?: string, 
  notes?: string
) {
  checkRateLimit();
  
  try {
    const updateData: any = {};
    
    if (startTime) updateData.start = new Date(startTime);
    if (endTime) updateData.end = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;
    
    const booking = await calComClient.bookings.update(bookingId, updateData);
    
    return `Appointment updated successfully! Booking ID: ${booking.id}
${startTime ? `New Start Time: ${booking.startTime}` : ""}
${endTime ? `New End Time: ${booking.endTime}` : ""}
${notes !== undefined ? `New Notes: ${notes}` : ""}`;
  } catch (error) {
    throw new Error(`Failed to update appointment: ${error}`);
  }
}

async function deleteAppointment(bookingId: number, reason?: string) {
  checkRateLimit();
  
  try {
    await calComClient.bookings.delete(bookingId, reason);
    
    return `Appointment deleted successfully! Booking ID: ${bookingId}
${reason ? `Reason: ${reason}` : ""}`;
  } catch (error) {
    throw new Error(`Failed to delete appointment: ${error}`);
  }
}

async function listAppointments(startDate: string, endDate: string) {
  checkRateLimit();
  
  try {
    const bookings = await calComClient.bookings.list({
      dateFrom: startDate,
      dateTo: endDate,
    });
    
    if (bookings.length === 0) {
      return "No appointments found for the selected date range.";
    }
    
    return bookings.map(booking => `
ID: ${booking.id}
Event Type: ${booking.eventTypeId}
Status: ${booking.status}
Start Time: ${booking.startTime}
End Time: ${booking.endTime}
Attendees: ${booking.attendees.map(a => `${a.name} (${a.email})`).join(", ")}
${booking.notes ? `Notes: ${booking.notes}` : ""}
`).join("\n---\n");
  } catch (error) {
    throw new Error(`Failed to list appointments: ${error}`);
  }
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ADD_APPOINTMENT_TOOL, 
    UPDATE_APPOINTMENT_TOOL, 
    DELETE_APPOINTMENT_TOOL, 
    LIST_APPOINTMENTS_TOOL
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "calcom_add_appointment": {
        if (!isCalComAddAppointmentArgs(args)) {
          throw new Error("Invalid arguments for calcom_add_appointment");
        }
        const { eventTypeId, startTime, endTime, name, email, notes } = args;
        const result = await addAppointment(eventTypeId, startTime, endTime, name, email, notes);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "calcom_update_appointment": {
        if (!isCalComUpdateAppointmentArgs(args)) {
          throw new Error("Invalid arguments for calcom_update_appointment");
        }
        const { bookingId, startTime, endTime, notes } = args;
        const result = await updateAppointment(bookingId, startTime, endTime, notes);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "calcom_delete_appointment": {
        if (!isCalComDeleteAppointmentArgs(args)) {
          throw new Error("Invalid arguments for calcom_delete_appointment");
        }
        const { bookingId, reason } = args;
        const result = await deleteAppointment(bookingId, reason);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "calcom_list_appointments": {
        if (!isCalComListAppointmentsArgs(args)) {
          throw new Error("Invalid arguments for calcom_list_appointments");
        }
        const { startDate, endDate } = args;
        const result = await listAppointments(startDate, endDate);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cal.com Calendar MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
