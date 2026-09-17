import { describe, it, expect } from "vitest";
import { searchLogs } from "../../src/tools/search-logs.js";

describe("searchLogs", () => {
  it("returns all logs for a known service", () => {
    const result = searchLogs({ service: "payment" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((log) => log.service === "payment")).toBe(true);
    }
  });

  it("filters logs by level", () => {
    const result = searchLogs({ service: "payment", level: "error" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((log) => log.level === "error")).toBe(true);
    }
  });

  it("returns an error for an unknown service", () => {
    const result = searchLogs({ service: "shipping" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown service");
    }
  });

  it("returns an empty array when no logs match the filter", () => {
    const result = searchLogs({ service: "notification", level: "error" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
