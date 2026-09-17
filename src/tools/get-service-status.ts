import type { ServiceStatus, ToolResult } from "./types.js";
import { loadServices } from "./data-loader.js";

export interface GetServiceStatusInput {
  service: string;
}

export function getServiceStatus(input: GetServiceStatusInput): ToolResult<ServiceStatus> {
  const services = loadServices();
  const match = services.find((service) => service.name === input.service);

  if (!match) {
    const known = services.map((service) => service.name).join(", ");
    return {
      ok: false,
      error: `Unknown service: "${input.service}". Known services: ${known}`,
    };
  }

  return { ok: true, data: match };
}
