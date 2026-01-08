import { describe, expect, test } from "bun:test";
import { isGsm7Valid } from "./utils";

describe("isGsm7Valid", () => {
  test("should accept basic ASCII text", () => {
    expect(isGsm7Valid("Hello World")).toBe(true);
    expect(isGsm7Valid("Test message 123")).toBe(true);
    expect(isGsm7Valid("ABC xyz 0-9")).toBe(true);
  });

  test("should accept GSM special characters", () => {
    expect(isGsm7Valid("Price: £50")).toBe(true);
    expect(isGsm7Valid("Cost: $100")).toBe(true);
    expect(isGsm7Valid("Email: user@example.com")).toBe(true);
  });

  test("should accept GSM extended characters", () => {
    expect(isGsm7Valid("Euro: €10")).toBe(true);
    expect(isGsm7Valid("Brackets: [test]")).toBe(true);
    expect(isGsm7Valid("Curly: {data}")).toBe(true);
    expect(isGsm7Valid("Path: C:\\folder")).toBe(true);
  });

  test("should accept European characters", () => {
    expect(isGsm7Valid("èéùì")).toBe(true);
    expect(isGsm7Valid("èéùìò")).toBe(true);
    expect(isGsm7Valid("äöñüß")).toBe(true);
    expect(isGsm7Valid("ÄÖÑÜ§")).toBe(true);
  });

  test("should accept punctuation and symbols", () => {
    expect(isGsm7Valid("Hello! How are you?")).toBe(true);
    expect(isGsm7Valid("Price: £50 (50%)")).toBe(true);
    expect(isGsm7Valid("Test #1, #2, #3")).toBe(true);
  });

  test("should accept newlines and carriage returns", () => {
    expect(isGsm7Valid("Line 1\nLine 2")).toBe(true);
    expect(isGsm7Valid("Text\r\nMore text")).toBe(true);
  });

  test("should reject emojis", () => {
    expect(isGsm7Valid("Hello 👋")).toBe(false);
    expect(isGsm7Valid("🎉 Party")).toBe(false);
    expect(isGsm7Valid("Test 😀")).toBe(false);
  });

  test("should reject non-GSM Unicode characters", () => {
    expect(isGsm7Valid("中文")).toBe(false);
    expect(isGsm7Valid("Привет")).toBe(false);
    expect(isGsm7Valid("日本語")).toBe(false);
  });

  test("should reject special Unicode symbols", () => {
    expect(isGsm7Valid("Arrow →")).toBe(false);
    expect(isGsm7Valid("Bullet •")).toBe(false);
    expect(isGsm7Valid("Copyright ©")).toBe(false);
  });

  test("should handle empty string", () => {
    expect(isGsm7Valid("")).toBe(true);
  });

  test("should handle whitespace only", () => {
    expect(isGsm7Valid("   ")).toBe(true);
    expect(isGsm7Valid("\n\n")).toBe(true);
  });

  test("should handle mixed valid and invalid characters", () => {
    expect(isGsm7Valid("Hello 世界")).toBe(false);
    expect(isGsm7Valid("Test emoji 🔥 here")).toBe(false);
  });
});
