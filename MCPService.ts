import { experimental_createMCPClient, type experimental_MCPClient } from "@ai-sdk/mcp";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { ChatService } from "@tokenring-ai/chat";
import { deepEqual } from "@tokenring-ai/one-frontend/src/lib/utils";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import { z } from "zod";

export const MCPTransportConfigSchema = z.discriminatedUnion("type", [
  z.looseObject({
    type: z.literal("stdio"),
    command: z.string().meta({ description: "Executable launched to run the MCP server over stdio" }),
  }),
  z.object({ type: z.literal("sse"), url: z.url().meta({ description: "SSE endpoint URL of the MCP server" }) }),
  z.object({ type: z.literal("http"), url: z.url().meta({ description: "Streamable-HTTP endpoint URL of the MCP server" }) }),
]);

export type MCPTransportConfig = z.infer<typeof MCPTransportConfigSchema>;

export type MCPServiceConfig = {
  transports: Record<string, MCPTransportConfig>;
};

/** Live MCP connection: transport config, client, and tools registered with ChatService. */
type MCPConnection = {
  config: MCPTransportConfig;
  client: experimental_MCPClient;
  /** Fully-qualified tool names (`server/tool`) registered for this connection. */
  toolNames: string[];
};

export default class MCPService implements TokenRingService {
  readonly name = "MCPService";
  description = "Service for MCP (Model Context Protocol) servers";

  private config: MCPServiceConfig = { transports: {} };
  private connections = new KeyedRegistry<MCPConnection>();
  private app: TokenRingApp | null = null;

  getConnectedServerNames = this.connections.keysArray;

  async reconfigure(config: MCPServiceConfig | undefined, app: TokenRingApp): Promise<void> {
    this.app = app;
    const transports = config?.transports ?? {};

    await this.connections.reconcileAgainstAsync(transports, {
      creating: async (name, transportConfig) => this.connect(name, transportConfig, app),
      deleting: async (name, connection) => {
        await this.disconnect(name, connection, app);
      },
      updating: async (name, connection, transportConfig) => {
        if (deepEqual(connection.config, transportConfig)) return connection;

        // Config changed — tear down the old client and reconnect with the new transport.
        await this.disconnect(name, connection, app);
        return await this.connect(name, transportConfig, app);
      },
    });

    this.config = { transports };
  }

  /**
   * Connects a single named MCP server and registers its tools.
   * Prefer {@link reconfigure} for normal lifecycle management; this remains
   * useful for direct/test registration of one server.
   */
  async register(name: string, config: MCPTransportConfig, app: TokenRingApp): Promise<void> {
    this.app = app;
    const existing = this.connections.get(name);
    if (existing) {
      await this.disconnect(name, existing, app);
      this.connections.unregister(name);
    }

    const connection = await this.connect(name, config, app);
    this.connections.set(name, connection);
    this.config = {
      transports: { ...this.config.transports, [name]: config },
    };
  }

  /** Disconnects every MCP server and unregisters their tools. */
  async stop(): Promise<void> {
    if (!this.app) return;
    const app = this.app;

    for (const [name, connection] of this.connections.entriesArray()) {
      await this.disconnect(name, connection, app);
      this.connections.unregister(name);
    }

    this.config = { transports: {} };
  }

  private async connect(name: string, config: MCPTransportConfig, app: TokenRingApp): Promise<MCPConnection> {
    const chatService = app.requireService(ChatService);
    const transport = this.createTransport(config);

    const client = await experimental_createMCPClient({ transport });
    const toolNames: string[] = [];

    try {
      const tools = await client.tools();

      for (const [toolName, tool] of Object.entries(tools)) {
        const fullName = `${name}/${toolName}`;
        chatService.registerTool(fullName, {
          name: fullName,
          displayName: toolName,
          tool: _agent => ({
            inputSchema: tool.inputSchema,
            execute: tool.execute,
            ...(tool.description && { description: tool.description }),
          }),
        });
        toolNames.push(fullName);
      }

      return { config, client, toolNames };
    } catch (error) {
      for (const toolName of toolNames) {
        chatService.unregisterTool(toolName);
      }
      await client.close().catch(() => {});
      throw error;
    }
  }

  private async disconnect(name: string, connection: MCPConnection, app: TokenRingApp): Promise<void> {
    const chatService = app.requireService(ChatService);

    for (const toolName of connection.toolNames) {
      chatService.unregisterTool(toolName);
    }
    connection.toolNames = [];

    try {
      await connection.client.close();
    } catch (error) {
      app.serviceError(this, `Error closing MCP client "${name}":`, error);
    }
  }

  private createTransport(config: MCPTransportConfig): Transport {
    const configType = config.type;
    switch (configType) {
      case "stdio":
        return new StdioClientTransport(config);
      case "sse":
        return new SSEClientTransport(new URL(config.url));
      case "http":
        return new StreamableHTTPClientTransport(new URL(config.url)) as Transport;
      default: {
        const exhaustive: string = configType satisfies never;
        throw new Error(`Unknown connection type ${exhaustive}`);
      }
    }
  }
}
