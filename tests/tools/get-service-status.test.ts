import { describe, it, expect } from "vitest";
import { getServiceStatus } from "../../src/tools/get-service-status.js";

describe("getServiceStatus", () => {
  it("returns full status for a known degraded service", () => {
    const result = getServiceStatus({ service: "payment" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("degraded");
      expect(result.data.database.status).toBe("connection_pool_exhausted");
      expect(result.data.dependencies).toContain("payment-db");
    }
  });

  it("returns full status for a healthy service", () => {
    const result = getServiceStatus({ service: "user" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("healthy");
    }
  });

  it("returns an error for an unknown service", () => {
    const result = getServiceStatus({ service: "shipping" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown service");
    }
  });
});
