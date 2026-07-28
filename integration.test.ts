import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import { ChatService } from "@tokenring-ai/chat";
import { ChatServiceConfigSchema } from "@tokenring-ai/chat/schema";
import type { MCPTransportConfig } from "./MCPService";
import MCPService from "./MCPService";
import plugin from "./plugin";

const mockedMcp = {
  experimental_createMCPClient: mock(),
};

const mockedSSE = {
  SSEClientTransport: mock().mockImplementation(function (this: any) {
    this.connect = mock();
    return this;
  }),
};

const mockedStdio = {
  StdioClientTransport: mock().mockImplementation(function (this: any) {
    this.connect = mock();
    return this;
  }),
};

const mockedHttp = {
  StreamableHTTPClientTransport: mock().mockImplementation(function (this: any) {
    this.connect = mock();
    return this;
  }),
};

void mock.module("@ai-sdk/mcp", () => mockedMcp);
void mock.module("@modelcontextprotocol/sdk/client/sse.js", () => mockedSSE);
void mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => mockedStdio);
void mock.module("@modelcontextprotocol/sdk/client/streamableHttp.js", () => mockedHttp);

describe("MCP Integration Tests", () => {
  let mockApp: any;
  let mockChatService: ChatService;

  beforeEach(() => {
    mock.clearAllMocks();

    // Create mock app
    mockApp = createTestingApp();

    // Create proper ChatService instance with required config
    const chatConfig = ChatServiceConfigSchema.parse({
      defaultModels: [],
      agentDefaults: {},
    });
    mockChatService = new ChatService(mockApp, chatConfig);

    // Register the ChatService with the app
    mockApp.addServices(mockChatService);

    // Spy on registerTool method
    spyOn(mockChatService, "registerTool");
  });

  afterEach(() => {
    mockApp.shutdown();
  });

  describe("Complete Plugin Installation", () => {
    it("should install plugin and register MCPService without config", async () => {
      // install no longer takes config; service is always registered and configured later
      plugin.install?.(mockApp);

      expect(mockApp.getServices()).toContainEqual(expect.any(MCPService));
    });

    it("should reconfigure with empty transports without connecting", async () => {
      plugin.install?.(mockApp);
      plugin.reconfigure?.(mockApp, { mcp: { transports: {} } });

      expect(mockApp.getServices()).toContainEqual(expect.any(MCPService));
    });

    it("should install plugin with stdio transport", async () => {
      const config = {
        mcp: {
          transports: {
            "my-mcp-server": {
              type: "stdio",
              command: "mcp-server",
              args: ["--config", "config.json"],
            },
          },
        },
      } as const;

      // Mock MCP client and tools
      const mockClient = {
        tools: mock().mockResolvedValue({
          "get-data": {
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
            execute: mock(),
            description: "Get data from MCP server",
          },
          "list-items": {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "List available items",
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      // Now register the transport
      await mcpService.register("my-mcp-server", config.mcp.transports["my-mcp-server"], mockApp);

      // Verify tools were registered - check that tools were registered with proper structure
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(2);

      // Get the actual calls to verify structure
      const calls = (mockChatService.registerTool as ReturnType<typeof mock>).mock.calls;
      const getDataCall = calls.find((call: any) => call[0] === "my-mcp-server/get-data");
      const listItemsCall = calls.find((call: any) => call[0] === "my-mcp-server/list-items");

      expect(getDataCall).toBeDefined();
      expect(getDataCall![1].name).toBe("my-mcp-server/get-data");
      expect(getDataCall![1].displayName).toBe("get-data");
      expect(typeof getDataCall![1].tool).toBe("function");
      expect(getDataCall![1].tool(undefined as never).description).toBe("Get data from MCP server");

      expect(listItemsCall).toBeDefined();
      expect(listItemsCall![1].name).toBe("my-mcp-server/list-items");
      expect(listItemsCall![1].displayName).toBe("list-items");
      expect(typeof listItemsCall![1].tool).toBe("function");
      expect(listItemsCall![1].tool(undefined as never).description).toBe("List available items");
    });

    it("should install plugin with SSE transport", async () => {
      const config = {
        mcp: {
          transports: {
            "remote-server": {
              type: "sse",
              url: "http://localhost:3000/mcp-sse",
              headers: {
                Authorization: "Bearer token123",
              },
            },
          },
        },
      } as const;

      const mockClient = {
        tools: mock().mockResolvedValue({
          "fetch-data": {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "Fetch remote data",
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      // Now register the transport
      await mcpService.register("remote-server", config.mcp.transports["remote-server"], mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledTimes(1);
      const call = (mockChatService.registerTool as ReturnType<typeof mock>).mock.calls[0];
      expect(call![0]).toBe("remote-server/fetch-data");
      expect(call![1].name).toBe("remote-server/fetch-data");
      expect(call![1].displayName).toBe("fetch-data");
      expect(typeof call![1].tool).toBe("function");
      expect(call![1].tool(undefined as never).description).toBe("Fetch remote data");
    });

    it("should install plugin with HTTP transport", async () => {
      const config = {
        mcp: {
          transports: {
            "api-server": {
              type: "http",
              url: "http://localhost:3001/api/mcp",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            },
          },
        },
      } as const;

      const mockClient = {
        tools: mock().mockResolvedValue({
          "process-request": {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "Process API request",
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      // Now register the transport
      await mcpService.register("api-server", config.mcp.transports["api-server"], mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledTimes(1);
      const call = (mockChatService.registerTool as ReturnType<typeof mock>).mock.calls[0];
      expect(call![0]).toBe("api-server/process-request");
      expect(call![1].name).toBe("api-server/process-request");
      expect(call![1].displayName).toBe("process-request");
      expect(typeof call![1].tool).toBe("function");
      expect(call![1].tool(undefined as never).description).toBe("Process API request");
    });

    it("should install plugin with multiple transports of different types", async () => {
      const config = {
        mcp: {
          transports: {
            "local-server": {
              type: "stdio",
              command: "local-mcp-server",
            },
            "remote-sse": {
              type: "sse",
              url: "http://localhost:3000/remote-sse",
            },
            "api-http": {
              type: "http",
              url: "http://localhost:3001/api",
            },
          },
        },
      } as const;

      const mockClient = {
        tools: mock().mockResolvedValue({
          tool1: {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "Tool 1",
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      // Register all transports
      for (const [name, transport] of Object.entries(config.mcp.transports)) {
        await mcpService.register(name, transport, mockApp);
      }

      // Should register tools for each server
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(3);
      expect(mockChatService.registerTool).toHaveBeenCalledWith(
        "local-server/tool1",
        expect.objectContaining({
          name: "local-server/tool1",
        }),
      );
      expect(mockChatService.registerTool).toHaveBeenCalledWith(
        "remote-sse/tool1",
        expect.objectContaining({
          name: "remote-sse/tool1",
        }),
      );
      expect(mockChatService.registerTool).toHaveBeenCalledWith(
        "api-http/tool1",
        expect.objectContaining({
          name: "api-http/tool1",
        }),
      );
    });
  });

  describe("End-to-End Workflow", () => {
    it("should handle complete MCP server registration workflow", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const config = {
        type: "sse",
        url: "http://localhost:3000/test-server",
      } as const;

      const mockClient = {
        tools: mock().mockResolvedValue({
          calculate: {
            inputSchema: {
              type: "object",
              properties: {
                operation: { type: "string" },
                numbers: { type: "array", items: { type: "number" } },
              },
              required: ["operation", "numbers"],
            },
            execute: mock(),
            description: "Perform calculations",
          },
          format: {
            inputSchema: {
              type: "object",
              properties: {
                text: { type: "string" },
                style: { type: "string" },
              },
              required: ["text"],
            },
            execute: mock(),
            description: "Format text",
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      await mcpService.register("calc-server", config, mockApp);

      // Verify both tools were registered
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(2);

      const calls = (mockChatService.registerTool as ReturnType<typeof mock>).mock.calls;
      const calculateCall = calls.find((call: any) => call[0] === "calc-server/calculate");
      const formatCall = calls.find((call: any) => call[0] === "calc-server/format");

      expect(calculateCall).toBeDefined();
      expect(calculateCall![1].name).toBe("calc-server/calculate");
      expect(calculateCall![1].displayName).toBe("calculate");
      expect(typeof calculateCall![1].tool).toBe("function");
      expect(calculateCall![1].tool(undefined as never).description).toBe("Perform calculations");
      expect(formatCall).toBeDefined();
      expect(formatCall![1].name).toBe("calc-server/format");
      expect(formatCall![1].displayName).toBe("format");
      expect(typeof formatCall![1].tool).toBe("function");
      expect(formatCall![1].tool(undefined as never).description).toBe("Format text");

      // Verify the tool schemas are preserved
      expect(calculateCall![1].tool(undefined as never).inputSchema).toEqual({
        type: "object",
        properties: {
          operation: { type: "string" },
          numbers: { type: "array", items: { type: "number" } },
        },
        required: ["operation", "numbers"],
      });

      expect(formatCall![1].tool(undefined as never).inputSchema).toEqual({
        type: "object",
        properties: {
          text: { type: "string" },
          style: { type: "string" },
        },
        required: ["text"],
      });
    });

    it("should handle transport creation for each type", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const mockClient = {
        tools: mock().mockResolvedValue({
          "test-tool": {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "Test tool",
          },
        }),
      };
      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Test stdio transport
      await mcpService.register("stdio-server", { type: "stdio", command: "test" }, mockApp);
      expect(mockedStdio.StdioClientTransport).toHaveBeenCalledWith({ type: "stdio", command: "test" });

      // Test SSE transport
      await mcpService.register("sse-server", { type: "sse", url: "http://localhost:3000/sse" }, mockApp);
      expect(mockedSSE.SSEClientTransport).toHaveBeenCalledWith(new URL("http://localhost:3000/sse"));

      // Test HTTP transport
      await mcpService.register("http-server", { type: "http", url: "http://localhost:3000/http" }, mockApp);
      expect(mockedHttp.StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL("http://localhost:3000/http"));
    });
  });

  describe("Error Scenarios", () => {
    it("should handle MCP client creation failure", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const config = { type: "sse", url: "http://localhost:3000/test" } as const;

      mockedMcp.experimental_createMCPClient.mockRejectedValue(new Error("Connection failed"));

      expect(mcpService.register("test-server", config, mockApp)).rejects.toThrow("Connection failed");
    });

    it("should handle tool retrieval failure", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const config = { type: "sse", url: "http://localhost:3000/test" } as const;

      const mockClient = {
        tools: mock().mockRejectedValue(new Error("Tool retrieval failed")),
        close: mock().mockResolvedValue(undefined),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      expect(mcpService.register("test-server", config, mockApp)).rejects.toThrow("Tool retrieval failed");
      expect(mockClient.close).toHaveBeenCalled();
    });

    it("should handle chat service registration failure", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const config = { type: "sse", url: "http://localhost:3000/test" } as const;

      const mockClient = {
        tools: mock().mockResolvedValue({
          "test-tool": {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "Test tool",
          },
        }),
        close: mock().mockResolvedValue(undefined),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Mock registerTool to throw synchronously
      const originalRegisterTool = mockChatService.registerTool;
      mockChatService.registerTool = mock().mockImplementation(() => {
        throw new Error("Registration failed");
      });

      try {
        await mcpService.register("test-server", config, mockApp);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error instanceof Error && error.message).toBe("Registration failed");
      } finally {
        mockChatService.registerTool = originalRegisterTool;
      }
    });

    it("should handle unknown transport type", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const config = { type: "unknown" } as any;

      expect(mcpService.register("test-server", config, mockApp)).rejects.toThrow("Unknown connection type unknown");
    });
  });

  describe("Performance and Reliability", () => {
    it("should handle rapid successive registrations", async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const mockClient = {
        tools: mock().mockResolvedValue({
          tool: {
            inputSchema: { type: "object" },
            execute: mock(),
            description: "Test tool",
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      const configs: MCPTransportConfig[] = [
        { type: "sse", url: "http://localhost:3001/sse" },
        { type: "http", url: "http://localhost:3002/http" },
        { type: "stdio", command: "server1" },
      ];

      // Use Promise.allSettled to handle individual promise rejections
      const promises = configs.map(config => mcpService.register(`server-${Math.random()}`, config, mockApp));

      const results = await Promise.allSettled(promises);

      // All promises should resolve successfully
      expect(results.every(result => result.status === "fulfilled")).toBe(true);
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(3);
    });

    it("should handle concurrent plugin installations", async () => {
      const config1 = {
        mcp: {
          transports: {
            server1: { type: "stdio", command: "server1" },
          },
        },
      } as const;

      const config2 = {
        mcp: {
          transports: {
            server2: { type: "sse", url: "http://localhost:3000/server2" },
          },
        },
      } as const;

      const mockClient = {
        tools: mock().mockResolvedValue({
          tool: { inputSchema: { type: "object" }, execute: mock(), description: "Tool" },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create service and register transports
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const promise1 = mcpService.register("server1", config1.mcp.transports.server1, mockApp);
      const promise2 = mcpService.register("server2", config2.mcp.transports.server2, mockApp);

      // Use Promise.allSettled for concurrent operations
      const results = await Promise.allSettled([promise1, promise2]);

      expect(results.every(result => result.status === "fulfilled")).toBe(true);
    });
  });
});
