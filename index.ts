import { z } from "zod";
import { MCPTransportConfigSchema } from "./MCPService.ts";

export const MCPConfigSchema = z
  .object({
    transports: z
      .record(z.string(), MCPTransportConfigSchema)
      .meta({ description: "MCP servers to connect to, keyed by name. Changes require a restart.", restartRequired: true }),
  })
  .meta({ label: "MCP", description: "Model Context Protocol server connections" })
  .exactOptional();

export { default as MCPService } from "./MCPService.ts";
