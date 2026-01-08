import { describe, expect, test } from "bun:test";
import { sanitizeSmsContent, parseRemovedSmsCount, sanitizePhoneNumber } from "../utils";

describe("SMS message parsing", () => {
  test("should parse 'Removed X SMS messages' output", () => {
    const outputs = [
      { input: "Removed 3 SMS messages.", expected: 3 },
      { input: "Removed 1 SMS messages.", expected: 1 },
      { input: "Removed 15 SMS messages.", expected: 15 },
      { input: "Removed 0 SMS messages.", expected: 0 },
    ];

    outputs.forEach(({ input, expected }) => {
      const result = parseRemovedSmsCount(input);
      expect(result).toBe(expected);
    });
  });

  test("should handle 'No stored SMS' output", () => {
    const output = "No stored SMS.";
    const result = parseRemovedSmsCount(output);
    expect(result).toBe(0);
  });

  test("should handle malformed output gracefully", () => {
    const outputs = [
      "Error occurred",
      "Invalid response",
      "",
      "Removed SMS messages.",
      "3 messages removed",
    ];

    outputs.forEach((input) => {
      const result = parseRemovedSmsCount(input);
      expect(result).toBe(0);
    });
  });
});

describe("Phone number sanitization", () => {
  test("should preserve valid phone number characters", () => {
    const numbers = [
      "+1234567890",
      "+1 (555) 123-4567",
      "+33 6 12 34 56 78",
      "555-1234",
    ];

    numbers.forEach((number) => {
      const sanitized = sanitizePhoneNumber(number);
      expect(sanitized).toBe(number);
    });
  });

  test("should remove dangerous characters", () => {
    const testCases = [
      { input: "+123; rm -rf /", expected: "+123  - " },
      { input: "+123|echo test", expected: "+123 ", comment: "pipe and text removed, space from 'echo test' remains" },
      { input: "+123$USER", expected: "+123" },
      { input: "+123`whoami`", expected: "+123" },
      { input: "+123&sudo", expected: "+123" },
    ];

    testCases.forEach(({ input, expected }) => {
      const sanitized = sanitizePhoneNumber(input);
      expect(sanitized).toBe(expected);
    });
  });

  test("should handle empty or whitespace input", () => {
    expect(sanitizePhoneNumber("")).toBe("");
    expect(sanitizePhoneNumber("   ")).toBe("   ");
  });
});

describe("Content escaping", () => {
  test("should escape backslashes", () => {
    const content = "Path: C:\\Users\\Test";
    const escaped = sanitizeSmsContent(content);
    expect(escaped).toBe("Path: C:\\\\Users\\\\Test");
  });

  test("should escape double quotes", () => {
    const content = 'He said "hello"';
    const escaped = sanitizeSmsContent(content);
    expect(escaped).toBe('He said \\"hello\\"');
  });

  test("should escape dollar signs", () => {
    const content = "Price: $100";
    const escaped = sanitizeSmsContent(content);
    expect(escaped).toBe("Price: \\$100");
  });

  test("should escape backticks", () => {
    const content = "Code: `test`";
    const escaped = sanitizeSmsContent(content);
    expect(escaped).toBe("Code: \\`test\\`");
  });

  test("should handle multiple escape sequences", () => {
    const content = "Test: $100 \"quote\" `code` C:\\path";
    const escaped = sanitizeSmsContent(content);
    expect(escaped).toBe("Test: \\$100 \\\"quote\\\" \\`code\\` C:\\\\path");
  });

  test("should preserve spaces", () => {
    const content = "Hello World Test";
    const escaped = sanitizeSmsContent(content);
    expect(escaped).toBe("Hello World Test");
  });
});
