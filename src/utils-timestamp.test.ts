import { describe, expect, test } from "bun:test";
import { parseTimestamp } from "./utils";

describe("parseTimestamp", () => {
  test("should parse GSM timestamp with quarter-hour timezone conversion", () => {
    // +04 quarter-hours = +1 hour = 21:47:12+01:00 = 20:47:12 UTC
    const timestamp = parseTimestamp("26/01/08,21:47:12+04");
    expect(timestamp.toISOString()).toBe("2026-01-08T20:47:12.000Z");
  });

  test("should handle negative timezone offset", () => {
    // -08 quarter-hours = -2 hours = 10:30:00-02:00 = 12:30:00 UTC
    const timestamp = parseTimestamp("26/01/15,10:30:00-08");
    expect(timestamp.toISOString()).toBe("2026-01-15T12:30:00.000Z");
  });

  test("should handle zero timezone offset", () => {
    const timestamp = parseTimestamp("26/06/01,15:00:00+00");
    expect(timestamp.toISOString()).toBe("2026-06-01T15:00:00.000Z");
  });

  test("should handle timezone with minutes (not evenly divisible)", () => {
    // +03 quarter-hours = 45 minutes = 12:00:00+00:45 = 11:15:00 UTC
    const timestamp = parseTimestamp("26/03/20,12:00:00+03");
    expect(timestamp.toISOString()).toBe("2026-03-20T11:15:00.000Z");
  });

  test("should return Invalid Date for invalid timestamp format", () => {
    const timestamp = parseTimestamp("invalid-timestamp");
    expect(isNaN(timestamp.getTime())).toBe(true);
  });

  test("should handle midnight timestamps", () => {
    const timestamp = parseTimestamp("26/12/25,00:00:00+04");
    expect(timestamp.toISOString()).toBe("2026-12-24T23:00:00.000Z");
  });

  test("should handle end of day timestamps", () => {
    const timestamp = parseTimestamp("26/12/31,23:59:59+00");
    expect(timestamp.toISOString()).toBe("2026-12-31T23:59:59.000Z");
  });
});
