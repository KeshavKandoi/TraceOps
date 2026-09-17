import { describe, it, expect } from "vitest";
import { getMetrics } from "../../src/tools/get-metrics.js";

describe("getMetrics", () => {
  it("returns baseline and all windows for a known service", () => {
    const result = getMetrics({ service: "payment" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.baseline.error_rate).toBeCloseTo(0.008);
      expect(result.data.windows.length).toBe(6);
    }
  });

  it("filters windows by a time range", () => {
    const result = getMetrics({
      service: "payment",
      from: "2024-01-15T10:00:00Z",
      to: "2024-01-15T10:10:00Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.windows.length).toBe(2);
      expect(result.data.windows[0]?.window_start).toBe("2024-01-15T10:00:00Z");
    }
  });

  it("returns an error for an unknown service", () => {
    const result = getMetrics({ service: "shipping" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown service");
    }
  });

  it("returns an empty windows array when the range matches nothing", () => {
    const result = getMetrics({
      service: "payment",
      from: "2024-01-15T12:00:00Z",
      to: "2024-01-15T13:00:00Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.windows).toEqual([]);
    }
  });
});
