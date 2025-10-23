import {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {z} from "zod";
import MCPService from "./MCPService.ts";

import packageJSON from './package.json' with {type: 'json'};

export const MCPConfigSchema = z.object({
  transports: z.record(z.string(), z.looseObject({type: z.string()}))
}).optional();

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,

  async install(agentTeam: AgentTeam) {
    const config = agentTeam.getConfigSlice('mcp', MCPConfigSchema);
    if (config) {
      const mcpService = new MCPService();
      agentTeam.addServices(mcpService);

      for (const name in config.transports) {
        await mcpService.register(name, config.transports[name] as any, agentTeam);
      }
    }
  }
} as TokenRingPackage;

export {default as MCPService} from "./MCPService.ts";