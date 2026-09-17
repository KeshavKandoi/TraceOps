import { describe, it, expect, vi } from "vitest";
import * as searchLogsModule from "../../src/tools/search-logs.js";
import { getTool, listToolNames, executeTool } from "../../src/tools/registry.js";
import type { LogEntry } from "../../src/tools/types.js";

describe("tool registry", () => {
  it("registers all phase 3 tools and allows lookup by name", () => {
    expect(listToolNames()).toEqual(["search_logs", "get_metrics", "get_service_status"]);

    const lookup = getTool("search_logs");
    expect(lookup.ok).toBe(true);
    if (lookup.ok) {
      expect(lookup.data.name).toBe("search_logs");
      expect(lookup.data.description.length).toBeGreaterThan(0);
    }
  });

  it("returns a controlled error for an unknown tool name", () => {
    const lookup = getTool("does_not_exist");
    expect(lookup.ok).toBe(false);
    if (!lookup.ok) {
      expect(lookup.error).toContain("Unknown tool");
    }
  });

  it("executes a tool when arguments are valid", () => {
    const result = executeTool("search_logs", { service: "payment", level: "error" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const logs = result.data as LogEntry[];
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every((log) => log.service === "payment" && log.level === "error")).toBe(true);
    }
  });

  it("rejects invalid arguments with a structured error and does not execute the tool", () => {
    const spy = vi.spyOn(searchLogsModule, "searchLogs");

    const result = executeTool("search_logs", { service: "payment", level: "critical" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid input");
    }
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("returns a structured error for an unknown tool without executing anything", () => {
    const result = executeTool("delete_everything", { service: "payment" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown tool");
    }
  });

  it("rejects missing required fields", () => {
    const result = executeTool("get_service_status", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid input");
    }
  });

  it("rejects unexpected extra fields due to strict schemas", () => {
    const result = executeTool("get_metrics", { service: "payment", unexpected: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid input");
    }
  });
});
