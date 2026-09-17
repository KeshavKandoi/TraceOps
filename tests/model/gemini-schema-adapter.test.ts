import { describe, it, expect } from "vitest";
import { toFunctionDeclarations } from "../../src/model/gemini-schema-adapter.js";
import { listToolSchemas } from "../../src/tools/registry.js";

describe("gemini schema adapter", () => {
  it("derives one function declaration per registered tool with matching names", () => {
    const declarations = toFunctionDeclarations(listToolSchemas());
    const names = declarations.map((declaration) => declaration.name);

    expect(names).toEqual(["search_logs", "get_metrics", "get_service_status"]);
  });

  it("marks service as required and level as optional for search_logs", () => {
    const declarations = toFunctionDeclarations(listToolSchemas());
    const searchLogs = declarations.find((declaration) => declaration.name === "search_logs");

    expect(searchLogs?.parameters?.required).toEqual(["service"]);
    expect(Object.keys(searchLogs?.parameters?.properties ?? {})).toEqual(["service", "level"]);
  });

  it("carries the enum values for the level field through from the canonical schema", () => {
    const declarations = toFunctionDeclarations(listToolSchemas());
    const searchLogs = declarations.find((declaration) => declaration.name === "search_logs");
    const levelProperty = searchLogs?.parameters?.properties?.level;

    expect(levelProperty?.enum).toEqual(["info", "warn", "error"]);
  });

  it("marks both from and to as optional for get_metrics", () => {
    const declarations = toFunctionDeclarations(listToolSchemas());
    const getMetrics = declarations.find((declaration) => declaration.name === "get_metrics");

    expect(getMetrics?.parameters?.required).toEqual(["service"]);
  });
});
