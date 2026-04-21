import { z } from "zod";
import { MCPTransportConfigSchema } from "./MCPService.ts";

export const MCPConfigSchema = z
  .object({
    transports: z.record(z.string(), MCPTransportConfigSchema),
  })
  .exactOptional();

export { default as MCPService } from "./MCPService.ts";
