import { describe, it, expect } from "vitest";

// Replace with your actual import
import { buildSavePayload } from "../utils/rulesBuilder";

describe("rules payload builder", () => {
  it("builds payload correctly", () => {
    const input = [
      { field: "country", operator: "EQ", value: "SG" },
    ];

    const result = buildSavePayload(input);

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].field).toBe("country");
  });

  it("handles empty input", () => {
    const result = buildSavePayload([]);

    expect(result).toEqual([]);
  });
});