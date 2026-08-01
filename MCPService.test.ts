import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { experimental_createMCPClient } from "@ai-sdk/mcp";
import type TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import { ChatService } from "@tokenring-ai/chat";
import { ChatServiceConfigSchema } from "@tokenring-ai/chat/schema";
import MCPService from "./MCPService";

// Mock the external dependencies
void mock.module("@ai-sdk/mcp", () => ({
  experimental_createMCPClient: mock(),
}));

// Mock transport classes with proper constructor mocking
void mock.module("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: mock().mockImplementation(function (this: any) {
    this.connect = mock();
    return this;
  }),
}));

void mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: mock().mockImplementation(function (this: any) {
    this.connect = mock();
    return this;
  }),
}));

void mock.module("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: mock().mockImplementation(function (this: any) {
    this.connect = mock();
    return this;
  }),
}));

function makeMockClient(
  tools: Record<string, unknown> = {
    "test-tool": {
      inputSchema: { type: "object" },
      execute: mock(),
      description: "Test tool description",
    },
  },
) {
  return {
    tools: mock().mockResolvedValue(tools),
    close: mock().mockResolvedValue(undefined),
  };
}

describe("MCPService", () => {
  let mcpService: MCPService;
  let mockApp: TokenRingApp;
  let mockChatService: ChatService;

  beforeEach(() => {
    mock.clearAllMocks();
    mcpService = new MCPService();

    // Create mock app
    mockApp = createTestingApp();

    // Create proper ChatService instance with required config
    const chatConfig = ChatServiceConfigSchema.parse({
      defaultModels: [],
      agentDefaults: {},
    });
    mockChatService = new ChatService(mockApp, chatConfig);

    // Register the ChatService with the app
    mockApp.addService(mockChatService);

    // Spy on tool registry methods
    spyOn(mockChatService, "registerTool");
    spyOn(mockChatService, "unregisterTool");
  });

  afterEach(async () => {
    await mcpService.stop();
    mockApp.shutdown();
  });

  describe("constructor and properties", () => {
    it("should initialize with correct name and description", () => {
      expect(mcpService.name).toBe("MCPService");
      expect(mcpService.description).toBe("Service for MCP (Model Context Protocol) servers");
    });
  });

  describe("register method", () => {
    it("should throw error for unknown transport type", async () => {
      const unknownConfig = { type: "unknown" } as any;

      expect(mcpService.register("test", unknownConfig, mockApp)).rejects.toThrow("Unknown connection type unknown");
    });

    it("should handle stdio transport configuration", async () => {
      const mockClient = makeMockClient();
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const stdioConfig = {
        type: "stdio",
        command: "test-command",
        args: ["--test"],
      } as const;

      await mcpService.register("test-server", stdioConfig, mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledWith("test-server/test-tool", {
        name: "test-server/test-tool",
        displayName: "test-tool",
        tool: expect.any(Function),
      });
      expect(mcpService.getConnectedServerNames()).toContain("test-server");
    });

    it("should handle SSE transport configuration", async () => {
      const mockClient = makeMockClient({
        "sse-tool": {
          inputSchema: { type: "object" },
          execute: mock(),
          description: "SSE tool description",
        },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const sseConfig = {
        type: "sse",
        url: "http://localhost:3000/sse",
      } as const;

      await mcpService.register("sse-server", sseConfig, mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledWith("sse-server/sse-tool", {
        name: "sse-server/sse-tool",
        displayName: "sse-tool",
        tool: expect.any(Function),
      });
    });

    it("should handle HTTP transport configuration", async () => {
      const mockClient = makeMockClient({
        "http-tool": {
          inputSchema: { type: "object" },
          execute: mock(),
          description: "HTTP tool description",
        },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const httpConfig = {
        type: "http",
        url: "http://localhost:3000/mcp",
      } as const;

      await mcpService.register("http-server", httpConfig, mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledWith("http-server/http-tool", {
        name: "http-server/http-tool",
        displayName: "http-tool",
        tool: expect.any(Function),
      });
    });

    it("should register multiple tools with proper naming", async () => {
      const mockClient = makeMockClient({
        tool1: {
          inputSchema: { type: "object", properties: { test: { type: "string" } } },
          execute: mock(),
          description: "Tool 1 description",
        },
        tool2: {
          inputSchema: { type: "object", properties: { data: { type: "number" } } },
          execute: mock(),
          description: "Tool 2 description",
        },
        tool3: {
          inputSchema: { type: "object" },
          execute: mock(),
          description: "Tool 3 description",
        },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const config = {
        type: "sse",
        url: "http://localhost:3000/mcp",
      } as const;

      await mcpService.register("multi-tool-server", config, mockApp);

      // Should register all tools with the server prefix
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(3);
      expect(mockChatService.registerTool).toHaveBeenCalledWith("multi-tool-server/tool1", expect.any(Object));
      expect(mockChatService.registerTool).toHaveBeenCalledWith("multi-tool-server/tool2", expect.any(Object));
      expect(mockChatService.registerTool).toHaveBeenCalledWith("multi-tool-server/tool3", expect.any(Object));
    });

    it("should replace an existing connection with the same name", async () => {
      const firstClient = makeMockClient({
        old: { inputSchema: { type: "object" }, execute: mock(), description: "old" },
      });
      const secondClient = makeMockClient({
        neu: { inputSchema: { type: "object" }, execute: mock(), description: "new" },
      });
      (experimental_createMCPClient as any).mockResolvedValueOnce(firstClient).mockResolvedValueOnce(secondClient);

      await mcpService.register("server", { type: "sse", url: "http://localhost:1/a" }, mockApp);
      await mcpService.register("server", { type: "sse", url: "http://localhost:1/b" }, mockApp);

      expect(firstClient.close).toHaveBeenCalled();
      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("server/old");
      expect(mockChatService.registerTool).toHaveBeenCalledWith("server/neu", expect.any(Object));
      expect(mcpService.getConnectedServerNames()).toEqual(["server"]);
    });
  });

  describe("reconfigure", () => {
    it("should add MCP servers from config", async () => {
      const mockClient = makeMockClient({
        alpha: { inputSchema: { type: "object" }, execute: mock(), description: "A" },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      await mcpService.reconfigure(
        {
          transports: {
            "server-a": { type: "sse", url: "http://localhost:3000/a" },
          },
        },
        mockApp,
      );

      expect(experimental_createMCPClient).toHaveBeenCalledTimes(1);
      expect(mockChatService.registerTool).toHaveBeenCalledWith("server-a/alpha", expect.any(Object));
      expect(mcpService.getConnectedServerNames()).toEqual(["server-a"]);
    });

    it("should remove MCP servers that disappear from config", async () => {
      const mockClient = makeMockClient({
        tool: { inputSchema: { type: "object" }, execute: mock(), description: "T" },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      await mcpService.reconfigure(
        {
          transports: {
            keep: { type: "sse", url: "http://localhost:3000/keep" },
            drop: { type: "sse", url: "http://localhost:3000/drop" },
          },
        },
        mockApp,
      );

      (mockChatService.registerTool as ReturnType<typeof mock>).mockClear();
      (mockChatService.unregisterTool as ReturnType<typeof mock>).mockClear();

      await mcpService.reconfigure(
        {
          transports: {
            keep: { type: "sse", url: "http://localhost:3000/keep" },
          },
        },
        mockApp,
      );

      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("drop/tool");
      expect(mockChatService.registerTool).not.toHaveBeenCalled();
      expect(mcpService.getConnectedServerNames()).toEqual(["keep"]);
    });

    it("should reconnect when a transport config changes", async () => {
      const firstClient = makeMockClient({
        v1: { inputSchema: { type: "object" }, execute: mock(), description: "v1" },
      });
      const secondClient = makeMockClient({
        v2: { inputSchema: { type: "object" }, execute: mock(), description: "v2" },
      });
      (experimental_createMCPClient as any).mockResolvedValueOnce(firstClient).mockResolvedValueOnce(secondClient);

      await mcpService.reconfigure(
        {
          transports: {
            server: { type: "sse", url: "http://localhost:3000/v1" },
          },
        },
        mockApp,
      );

      await mcpService.reconfigure(
        {
          transports: {
            server: { type: "sse", url: "http://localhost:3000/v2" },
          },
        },
        mockApp,
      );

      expect(firstClient.close).toHaveBeenCalled();
      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("server/v1");
      expect(mockChatService.registerTool).toHaveBeenCalledWith("server/v2", expect.any(Object));
      expect(experimental_createMCPClient).toHaveBeenCalledTimes(2);
    });

    it("should not reconnect when transport config is unchanged", async () => {
      const mockClient = makeMockClient();
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const config = {
        transports: {
          server: { type: "sse" as const, url: "http://localhost:3000/mcp" },
        },
      };

      await mcpService.reconfigure(config, mockApp);
      (mockChatService.registerTool as ReturnType<typeof mock>).mockClear();

      await mcpService.reconfigure(config, mockApp);

      expect(experimental_createMCPClient).toHaveBeenCalledTimes(1);
      expect(mockClient.close).not.toHaveBeenCalled();
      expect(mockChatService.registerTool).not.toHaveBeenCalled();
      expect(mockChatService.unregisterTool).not.toHaveBeenCalled();
    });

    it("should disconnect everything when config is undefined or empty", async () => {
      const mockClient = makeMockClient({
        tool: { inputSchema: { type: "object" }, execute: mock(), description: "T" },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      await mcpService.reconfigure(
        {
          transports: {
            server: { type: "stdio", command: "mcp" },
          },
        },
        mockApp,
      );

      await mcpService.reconfigure(undefined, mockApp);

      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("server/tool");
      expect(mockClient.close).toHaveBeenCalled();
      expect(mcpService.getConnectedServerNames()).toEqual([]);
    });

    it("should add and remove servers in the same reconfigure", async () => {
      const clientA = makeMockClient({
        a: { inputSchema: { type: "object" }, execute: mock(), description: "a" },
      });
      const clientB = makeMockClient({
        b: { inputSchema: { type: "object" }, execute: mock(), description: "b" },
      });
      (experimental_createMCPClient as any).mockResolvedValueOnce(clientA).mockResolvedValueOnce(clientB);

      await mcpService.reconfigure(
        {
          transports: {
            a: { type: "sse", url: "http://localhost:3000/a" },
          },
        },
        mockApp,
      );

      await mcpService.reconfigure(
        {
          transports: {
            b: { type: "http", url: "http://localhost:3000/b" },
          },
        },
        mockApp,
      );

      expect(clientA.close).toHaveBeenCalled();
      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("a/a");
      expect(mockChatService.registerTool).toHaveBeenCalledWith("b/b", expect.any(Object));
      expect(mcpService.getConnectedServerNames()).toEqual(["b"]);
    });
  });

  describe("stop", () => {
    it("should close all clients and unregister tools", async () => {
      const mockClient = makeMockClient({
        tool: { inputSchema: { type: "object" }, execute: mock(), description: "T" },
      });
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      await mcpService.reconfigure(
        {
          transports: {
            s1: { type: "sse", url: "http://localhost:3000/1" },
            s2: { type: "sse", url: "http://localhost:3000/2" },
          },
        },
        mockApp,
      );

      await mcpService.stop();

      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("s1/tool");
      expect(mockChatService.unregisterTool).toHaveBeenCalledWith("s2/tool");
      expect(mockClient.close).toHaveBeenCalledTimes(2);
      expect(mcpService.getConnectedServerNames()).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should handle MCP client creation failures", async () => {
      (experimental_createMCPClient as any).mockRejectedValue(new Error("Connection failed"));

      const config = {
        type: "sse",
        url: "http://localhost:3000/mcp",
      } as const;

      expect(mcpService.register("test-server", config, mockApp)).rejects.toThrow("Connection failed");
      expect(mcpService.getConnectedServerNames()).toEqual([]);
    });

    it("should handle tool retrieval failures and close the client", async () => {
      const mockClient = {
        tools: mock().mockRejectedValue(new Error("Tool retrieval failed")),
        close: mock().mockResolvedValue(undefined),
      };
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const config = {
        type: "sse",
        url: "http://localhost:3000/mcp",
      } as const;

      expect(mcpService.register("test-server", config, mockApp)).rejects.toThrow("Tool retrieval failed");
      expect(mockClient.close).toHaveBeenCalled();
      expect(mcpService.getConnectedServerNames()).toEqual([]);
    });
  });
});
