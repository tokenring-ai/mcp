import TokenRingApp from "@tokenring-ai/app";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {MCPConfigSchema} from "./index.ts";
import MCPService from "./MCPService.ts";

import packageJSON from './package.json' with {type: 'json'};


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,

  async install(app: TokenRingApp) {
    const config = app.getConfigSlice('mcp', MCPConfigSchema);
    if (config) {
      const mcpService = new MCPService();
      app.addServices(mcpService);

      for (const name in config.transports) {
        await mcpService.register(name, config.transports[name] as any, app);
      }
    }
  }
} as TokenRingPlugin;
