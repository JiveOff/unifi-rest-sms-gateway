import { z } from "zod";
import { isGsm7Valid } from "./utils";

export const SimInfoSchema = z.object({
  type: z.string(),
  iccid: z.string(),
  homeNetworkOperator: z.string(),
  eid: z.string(),
  imsi: z.string(),
  phoneNumber: z.string(),
});

export type SimInfo = z.infer<typeof SimInfoSchema>;

export const SmsMessageSchema = z.object({
  index: z.number(),
  type: z.string(),
  sender: z.string(),
  timestamp: z.date(),
  format: z.string(),
  text: z.string(),
  textLength: z.number(),
});

export type SmsMessage = z.infer<typeof SmsMessageSchema>;

export const MessageIndexParamsSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
});

export type MessageIndexParams = z.infer<typeof MessageIndexParamsSchema>;

export const SendSmsSchema = z.object({
  number: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters"),
  content: z
    .string()
    .min(1, "Message content is required")
    .refine(
      (val) => isGsm7Valid(val),
      "Content must only contain characters from GSM 7-bit alphabet (ISO8859-15)",
    ),
});

export type SendSms = z.infer<typeof SendSmsSchema>;

// Response schemas
export const MessageCountResponseSchema = z.object({
  count: z.number(),
});

export const ClearMessagesResponseSchema = z.object({
  success: z.boolean(),
  cleared: z.number(),
});

export const SendMessageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
