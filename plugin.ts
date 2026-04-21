import type {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import {MCPConfigSchema} from "./index.ts";
import MCPService from "./MCPService.ts";

import packageJSON from "./package.json" with {type: "json"};

const packageConfigSchema = z.object({
  mcp: MCPConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  displayName: "Model Context Protocol",
  version: packageJSON.version,
  description: packageJSON.description,

  install(app, config) {
    if (config.mcp) {
      const mcpService = new MCPService();
      app.addServices(mcpService);
    }
  },
  async start(app, config) {
    if (config.mcp) {
      for (const [name, transportConfig] of Object.entries(config.mcp.transports)) {
        await app
          .requireService(MCPService)
          .register(name, transportConfig, app);
      }
    }
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
