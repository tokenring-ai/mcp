import {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import {MCPConfigSchema} from "./index.ts";
import MCPService from "./MCPService.ts";

import packageJSON from './package.json' with {type: 'json'};

const packageConfigSchema = z.object({
  mcp: MCPConfigSchema.optional(),
});


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,

  async install(app, config) {
    if (config.mcp) {
      const mcpService = new MCPService();
      app.addServices(mcpService);

      for (const name in config.mcp.transports) {
        await mcpService.register(name, config.mcp.transports[name] as any, app);
      }
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
