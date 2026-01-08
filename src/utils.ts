import consola from "consola";
import type { SmsMessage } from "./schemas";
import { SmsMessageSchema } from "./schemas";

// https://frightanic.com/software-development/regex-for-gsm-03-38-7bit-character-set/
const GSM_7BIT = new RegExp(
  "^[A-Za-z0-9 \\r\\n@£$¥èéùìòÇØøÅå\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ!\"#$%&'()*+,\\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\\\\[~\\]|\u20AC]*$",
);

export const isGsm7Valid = (text: string): boolean => {
  return GSM_7BIT.test(text);
};

export const sanitizeSmsContent = (content: string): string => {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
};

export const parseRemovedSmsCount = (output: string): number => {
  const match = output.match(/Removed (\d+) SMS/);
  return match && match[1] ? parseInt(match[1]) : 0;
};

export const sanitizePhoneNumber = (number: string): string => {
  return number.replace(/[^0-9+\-\s()]/g, "");
};

export const parseTimestamp = (timestamp: string): Date => {
  // Format: "yy/MM/dd,hh:mm:ss+/-zz"
  // Example: "26/01/07,21:14:13+04" = January 7th, 2026 at 21:14:13
  // Note: zz is timezone in quarter-hours (GSM specification)
  // +04 = 4 * 15 minutes = +1 hour from UTC
  const match = timestamp.match(
    /(\d{2})\/(\d{2})\/(\d{2}),(\d{2}):(\d{2}):(\d{2})([\+\-])(\d{2})/,
  );

  if (!match) return new Date(timestamp);

  const yy = match[1]; // Year (2 digits)
  const MM = match[2]; // Month (01-12)
  const dd = match[3]; // Day (01-31)
  const hh = match[4]; // Hour (00-23)
  const mm = match[5]; // Minutes (00-59)
  const ss = match[6]; // Seconds (00-59)
  const sign = match[7]; // Timezone sign (+/-)
  const zz = match[8]; // Timezone in quarter-hours

  const year = 2000 + parseInt(yy || "0");

  // Convert quarter-hours to minutes
  const tzQuarters = parseInt(zz || "0");
  const tzMinutes = tzQuarters * 15;
  const tzHours = Math.floor(tzMinutes / 60);
  const tzMins = tzMinutes % 60;

  // Format timezone as +HH:MM or -HH:MM
  const tzString = `${sign}${String(tzHours).padStart(2, "0")}:${String(tzMins).padStart(2, "0")}`;

  // Create ISO 8601 format: YYYY-MM-DDTHH:MM:SS+HH:MM
  const isoString = `${year}-${MM}-${dd}T${hh}:${mm}:${ss}${tzString}`;
  return new Date(isoString);
};

export const parseSmsListOutput = (smsListOutput: string): SmsMessage[] => {
  const messages: SmsMessage[] = [];

  const messagePattern = /--\[\s*(\d+)\]-+\s*([\s\S]*?)(?=--\[\s*\d+\]|$)/g;
  const matches = [...smsListOutput.matchAll(messagePattern)];

  for (const match of matches) {
    const indexStr = match[1];
    const block = match[2];

    if (!indexStr || !block) continue;

    const index = parseInt(indexStr);
    const lines = block.trim().split("\n");

    let type = "";
    let sender = "";
    let timestamp: Date = new Date();
    let format = "";
    let text = "";
    let textLength = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("Type:")) {
        type = trimmedLine.replace("Type:", "").trim();
      } else if (trimmedLine.startsWith("Sender:")) {
        sender = trimmedLine.replace("Sender:", "").trim();
      } else if (trimmedLine.startsWith("Timestamp:")) {
        const rawTimestamp = trimmedLine.replace("Timestamp:", "").trim();
        timestamp = parseTimestamp(rawTimestamp);
      } else if (trimmedLine.startsWith("Format:")) {
        format = trimmedLine.replace("Format:", "").trim();
      } else if (trimmedLine.startsWith("Text (")) {
        const textMatch = trimmedLine.match(/Text \((\d+)\):\s*(.*)/);
        if (textMatch && textMatch[1] && textMatch[2] !== undefined) {
          textLength = parseInt(textMatch[1]);
          text = textMatch[2];
        }
      }
    }

    // Only process TEXT format messages
    if (format === "LE_SMS_FORMAT_TEXT") {
      try {
        const message = SmsMessageSchema.parse({
          index,
          type,
          sender,
          timestamp,
          format,
          text,
          textLength,
        });
        messages.push(message);
      } catch (error) {
        consola.error("Failed to parse message (not supported):", error);
      }
    }
  }

  return messages;
};
