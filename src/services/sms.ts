import { session } from "../clients/ssh";
import type { SmsMessage } from "../schemas";
import {
  parseSmsListOutput,
  sanitizeSmsContent,
  parseRemovedSmsCount,
  sanitizePhoneNumber,
} from "../utils";

export const getAllMessages = async (): Promise<SmsMessage[]> => {
  const smsCommand = await session.executeCommand(`sms list`);
  return parseSmsListOutput(smsCommand);
};

export const getOneMessage = async (
  index: number,
): Promise<SmsMessage | null> => {
  const smsCommand = await session.executeCommand(`sms get ${index}`);
  const messages = parseSmsListOutput(smsCommand);
  return messages[0] ?? null;
};

export const getMessageCount = async (): Promise<number> => {
  const smsCommand = await session.executeCommand(`sms count`);
  const count = parseInt(smsCommand.trim());
  return isNaN(count) ? 0 : count;
};

export const clearAllMessages = async (): Promise<number> => {
  const output = await session.executeCommand(`sms clear`);
  return parseRemovedSmsCount(output);
};

export const sendMessage = async (
  number: string,
  content: string,
): Promise<void> => {
  const sanitizedNumber = sanitizePhoneNumber(number);
  const escapedContent = sanitizeSmsContent(content);

  await session.executeCommand(
    `sms send ${sanitizedNumber} "${escapedContent}"`,
  );
};
