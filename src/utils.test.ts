import { describe, expect, test } from "bun:test";
import { parseSmsListOutput } from "./utils";

describe("parseSmsListOutput", () => {
  test("should parse a single SMS message correctly", () => {
    const input = `--[ 2]---------------------------------------------------------------
 Type:                         LE_SMS_TYPE_RX
 Sender:                       +1234567890
 Timestamp:                    26/01/08,21:47:12+04
 Format:                       LE_SMS_FORMAT_TEXT
 Text (15):                    Test message 123`;

    const result = parseSmsListOutput(input);

    expect(result).toHaveLength(1);
    
    const message = result[0]!;
    expect(message.index).toBe(2);
    expect(message.type).toBe("LE_SMS_TYPE_RX");
    expect(message.sender).toBe("+1234567890");
    expect(message.format).toBe("LE_SMS_FORMAT_TEXT");
    expect(message.text).toBe("Test message 123");
    expect(message.textLength).toBe(15);
    expect(message.timestamp).toBeInstanceOf(Date);
    expect(message.timestamp.toISOString()).toBe("2026-01-08T20:47:12.000Z");
  });

  test("should parse multiple SMS messages correctly", () => {
    const input = `--[ 0]---------------------------------------------------------------
 Type:                         LE_SMS_TYPE_RX
 Sender:                       +1111111111
 Timestamp:                    26/01/07,21:14:13+04
 Format:                       LE_SMS_FORMAT_TEXT
 Text (7):                     Hello
--[ 1]---------------------------------------------------------------
 Type:                         LE_SMS_TYPE_RX
 Sender:                       +2222222222
 Timestamp:                    26/01/08,21:29:29+04
 Format:                       LE_SMS_FORMAT_TEXT
 Text (4):                     test`;

    const result = parseSmsListOutput(input);

    expect(result).toHaveLength(2);
    
    const msg0 = result[0]!;
    expect(msg0.index).toBe(0);
    expect(msg0.sender).toBe("+1111111111");
    expect(msg0.text).toBe("Hello");
    expect(msg0.textLength).toBe(7);
    
    const msg1 = result[1]!;
    expect(msg1.index).toBe(1);
    expect(msg1.sender).toBe("+2222222222");
    expect(msg1.text).toBe("test");
    expect(msg1.textLength).toBe(4);
  });

  test("should handle empty input", () => {
    const result = parseSmsListOutput("");
    expect(result).toHaveLength(0);
  });
});
