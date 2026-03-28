import { describe, it, expect } from "vitest";

// Replace with your actual import
import { validateDuplicates } from "../utils/validation";

describe("validation helpers", () => {
  it("detects duplicates", () => {
    const list = ["SG", "SG"];

    const result = validateDuplicates(list);

    expect(result).toBe(true);
  });

  it("passes when no duplicates", () => {
    const list = ["SG", "ID"];

    const result = validateDuplicates(list);

    expect(result).toBe(false);
  });
});