import {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {Agent, AgentTeam} from "@tokenring-ai/agent";
import {TokenRingService} from "@tokenring-ai/agent/types";
import {experimental_createMCPClient} from "ai";
import type {Tool} from "ai";


import {StdioClientTransport, StdioServerParameters} from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport, SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';


export type MCPTransportConfig =
  | StdioServerParameters & { type: "stdio" }
  | SSEClientTransportOptions & { type: "sse", url: string }
  | StreamableHTTPClientTransportOptions & { type: "http", url: string };


export default class MCPService implements TokenRingService {
  name = "MCPService";
  description = "Service for MCP (Model Context Protocol) servers";
  protected agent!: Agent;

  async register(name: string, config: MCPTransportConfig, team: AgentTeam): Promise<void> {
    let transport: Transport;
    switch (config.type) {
      case "stdio":
        transport = new StdioClientTransport(config);
        break;
      case "sse":
        transport = new SSEClientTransport(new URL(config.url), config);
        break;
      case "http":
        transport = new StreamableHTTPClientTransport(new URL(config.url), config);
        break;
      default:
        throw new Error(`Unknown connection type ${(config as any).type}`);
    }


    const client = await experimental_createMCPClient({ transport });
    const tools = await client.tools();

    for (const toolName in tools) {
      const tool = tools[toolName];
      team.tools.register(`${name}/toolName`, {
        name: `mcp/${toolName}`,
        tool: {
          inputSchema: tool.inputSchema as any,
          execute: tool.execute,
          description: tool.description
        }
      });
    }
  }
}