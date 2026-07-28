import type { TokenRingPlugin } from "@tokenring-ai/app";
import { z } from "zod";
import { MCPConfigSchema } from "./index.ts";
import MCPService from "./MCPService.ts";

import packageJSON from "./package.json" with { type: "json" };

const packageConfigSchema = z.object({
  mcp: MCPConfigSchema.exactOptional(),
});

export default {
  name: packageJSON.name,
  displayName: "Model Context Protocol",
  version: packageJSON.version,
  description: packageJSON.description,

  install(app) {
    app.addServices(new MCPService());
  },
  async reconfigure(app, config) {
    await app.requireService(MCPService).reconfigure(config.mcp, app);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
