import {experimental_createMCPClient} from '@ai-sdk/mcp';
import {SSEClientTransport} from '@modelcontextprotocol/sdk/client/sse.js';


import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {AgentTeam} from "@tokenring-ai/agent";
import {TokenRingService} from "@tokenring-ai/agent/types";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";


export const MCPTransportConfigSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("stdio")}).passthrough(),
  z.object({type: z.literal("sse"), url: z.string()}).passthrough(),
  z.object({type: z.literal("http"), url: z.string()}).passthrough(),
]);

export type MCPTransportConfig = z.infer<typeof MCPTransportConfigSchema>;


export default class MCPService implements TokenRingService {
  name = "MCPService";
  description = "Service for MCP (Model Context Protocol) servers";

  async register(name: string, config: MCPTransportConfig, team: AgentTeam): Promise<void> {
    const chatService = await team.requireService(ChatService);
    let transport: Transport;
    switch (config.type) {
      case "stdio":
        transport = new StdioClientTransport(config as any);
        break;
      case "sse":
        transport = new SSEClientTransport(new URL(config.url));
        break;
      case "http":

        transport = new StreamableHTTPClientTransport(new URL(config.url));
        break;
      default:
        throw new Error(`Unknown connection type ${(config as any).type}`);
    }


    const client = await experimental_createMCPClient({transport});
    const tools = await client.tools();

    for (const toolName in tools) {
      const tool = tools[toolName];
      chatService.registerTool(`${name}/${toolName}`, {
        name: `${name}/${toolName}`,
        tool: {
          inputSchema: tool.inputSchema as any,
          execute: tool.execute,
          description: tool.description
        }
      });
    }
  }
}