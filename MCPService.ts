import {experimental_createMCPClient} from "@ai-sdk/mcp";
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js";

import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import type TokenRingApp from "@tokenring-ai/app";
import type {TokenRingService} from "@tokenring-ai/app/types";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";

export const MCPTransportConfigSchema = z.discriminatedUnion("type", [
  z.looseObject({
    type: z.literal("stdio"),
    command: z.string(),
  }),
  z.object({type: z.literal("sse"), url: z.url()}),
  z.object({type: z.literal("http"), url: z.url()}),
]);

export type MCPTransportConfig = z.infer<typeof MCPTransportConfigSchema>;

export default class MCPService implements TokenRingService {
  readonly name = "MCPService";
  description = "Service for MCP (Model Context Protocol) servers";

  async register(
    name: string,
    config: MCPTransportConfig,
    app: TokenRingApp,
  ): Promise<void> {
    const chatService = app.requireService(ChatService);
    let transport: Transport;

    const configType = config.type;
    switch (configType) {
      case "stdio":
        transport = new StdioClientTransport(config);
        break;
      case "sse":
        transport = new SSEClientTransport(new URL(config.url));
        break;
      case "http":
        transport = new StreamableHTTPClientTransport(new URL(config.url));
        break;
      default:
        // noinspection UnnecessaryLocalVariableJS
        const unknownConfigType: never = configType;
        throw new Error(`Unknown connection type ${unknownConfigType as string}`);
    }

    const client = await experimental_createMCPClient({transport});
    const tools = await client.tools();

    for (const toolName in tools) {
      const tool = tools[toolName];
      chatService.registerTool(`${name}/${toolName}`, {
        name: `${name}/${toolName}`,
        tool: {
          inputSchema: tool.inputSchema,
          execute: tool.execute,
          description: tool.description,
        },
      });
    }
  }
}
