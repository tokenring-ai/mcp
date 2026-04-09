import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {ChatService} from "@tokenring-ai/chat";
import {ChatServiceConfigSchema} from "@tokenring-ai/chat/schema";
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import MCPService from './MCPService';
import plugin from './plugin';

const mockedMcp = vi.hoisted(() => ({
  experimental_createMCPClient: vi.fn(),
}));

const mockedSSE = vi.hoisted(() => ({
  SSEClientTransport: vi.fn().mockImplementation(function(this: any) {
    this.connect = vi.fn();
    return this;
  })
}));

const mockedStdio = vi.hoisted(() => ({
  StdioClientTransport: vi.fn().mockImplementation(function(this: any) {
    this.connect = vi.fn();
    return this;
  })
}));

const mockedHttp = vi.hoisted(() => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(function(this: any) {
    this.connect = vi.fn();
    return this;
  })
}));

vi.mock('@ai-sdk/mcp', () => mockedMcp);
vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => mockedSSE);
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => mockedStdio);
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => mockedHttp);

describe('MCP Integration Tests', () => {
  let mockApp: any;
  let mockChatService: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock app
    mockApp = createTestingApp();
    
    // Create proper ChatService instance with required config
    const chatConfig = ChatServiceConfigSchema.parse({
      defaultModels: [],
      agentDefaults: {}
    });
    mockChatService = new ChatService(mockApp, chatConfig);
    
    // Register the ChatService with the app
    mockApp.addServices(mockChatService);
    
    // Spy on registerTool method
    vi.spyOn(mockChatService, 'registerTool');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockApp.shutdown();
  });

  describe('Complete Plugin Installation', () => {
    it('should install plugin without configuration', async () => {
      // When no config.mcp, plugin should not add services
      plugin.install(mockApp, {} as any);

      expect(mockApp.getServices()).not.toContainEqual(expect.any(MCPService));
    });

    it('should install plugin with empty configuration', async () => {
      // When config.mcp exists but has no transports, plugin should still add the service
      plugin.install(mockApp, {mcp: {transports: {}}});

      expect(mockApp.getServices()).toContainEqual(expect.any(MCPService));
    });

    it('should install plugin with stdio transport', async () => {
      const config = {
        mcp: {
          transports: {
            'my-mcp-server': {
              type: 'stdio',
              command: 'mcp-server',
              args: ['--config', 'config.json'],
            },
          },
        }
      };

      // Mock MCP client and tools
      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'get-data': {
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
            execute: vi.fn(),
            description: 'Get data from MCP server',
          },
          'list-items': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'List available items',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      // Now register the transport
      await mcpService.register('my-mcp-server', config.mcp.transports['my-mcp-server'], mockApp);

      // Verify tools were registered - check that tools were registered with proper structure
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(2);
      
      // Get the actual calls to verify structure
      const calls = mockChatService.registerTool.mock.calls;
      const getDataCall = calls.find((call: any) => call[0] === 'my-mcp-server/get-data');
      const listItemsCall = calls.find((call: any) => call[0] === 'my-mcp-server/list-items');
      
      expect(getDataCall).toBeDefined();
      expect(getDataCall[1]).toMatchObject({
        name: 'my-mcp-server/get-data',
        tool: {
          description: 'Get data from MCP server',
        },
      });
      
      expect(listItemsCall).toBeDefined();
      expect(listItemsCall[1]).toMatchObject({
        name: 'my-mcp-server/list-items',
        tool: {
          description: 'List available items',
        },
      });
    });

    it('should install plugin with SSE transport', async () => {
      const config = {
        mcp: {
          transports: {
            'remote-server': {
              type: 'sse',
              url: 'http://localhost:3000/mcp-sse',
              headers: {
                'Authorization': 'Bearer token123',
              },
            },
          },
        }
      };

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'fetch-data': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Fetch remote data',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      // Now register the transport
      await mcpService.register('remote-server', config.mcp.transports['remote-server'], mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledTimes(1);
      const call = mockChatService.registerTool.mock.calls[0];
      expect(call[0]).toBe('remote-server/fetch-data');
      expect(call[1]).toMatchObject({
        name: 'remote-server/fetch-data',
        tool: {
          description: 'Fetch remote data',
        },
      });
    });

    it('should install plugin with HTTP transport', async () => {
      const config = {
        mcp: {
          transports: {
            'api-server': {
              type: 'http',
              url: 'http://localhost:3001/api/mcp',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            },
          },
        }
      };

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'process-request': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Process API request',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      // Now register the transport
      await mcpService.register('api-server', config.mcp.transports['api-server'], mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledTimes(1);
      const call = mockChatService.registerTool.mock.calls[0];
      expect(call[0]).toBe('api-server/process-request');
      expect(call[1]).toMatchObject({
        name: 'api-server/process-request',
        tool: {
          description: 'Process API request',
        },
      });
    });

    it('should install plugin with multiple transports of different types', async () => {
      const config = {
        mcp: {
          transports: {
            'local-server': {
              type: 'stdio',
              command: 'local-mcp-server',
            },
            'remote-sse': {
              type: 'sse',
              url: 'http://localhost:3000/remote-sse',
            },
            'api-http': {
              type: 'http',
              url: 'http://localhost:3001/api',
            },
          },
        }
      };

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'tool1': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Tool 1',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create and start the plugin manually to trigger registration
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      // Register all transports
      for (const name in config.mcp.transports) {
        await mcpService.register(name, config.mcp.transports[name], mockApp);
      }

      // Should register tools for each server
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(3);
      expect(mockChatService.registerTool).toHaveBeenCalledWith(
        'local-server/tool1',
        expect.objectContaining({
          name: 'local-server/tool1',
        })
      );
      expect(mockChatService.registerTool).toHaveBeenCalledWith(
        'remote-sse/tool1',
        expect.objectContaining({
          name: 'remote-sse/tool1',
        })
      );
      expect(mockChatService.registerTool).toHaveBeenCalledWith(
        'api-http/tool1',
        expect.objectContaining({
          name: 'api-http/tool1',
        })
      );
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete MCP server registration workflow', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const config = {
        type: 'sse',
        url: 'http://localhost:3000/test-server',
      };

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'calculate': {
            inputSchema: {
              type: 'object',
              properties: {
                operation: { type: 'string' },
                numbers: { type: 'array', items: { type: 'number' } },
              },
              required: ['operation', 'numbers'],
            },
            execute: vi.fn(),
            description: 'Perform calculations',
          },
          'format': {
            inputSchema: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                style: { type: 'string' },
              },
              required: ['text'],
            },
            execute: vi.fn(),
            description: 'Format text',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      await mcpService.register('calc-server', config, mockApp);

      // Verify both tools were registered
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(2);
      
      const calls = mockChatService.registerTool.mock.calls;
      const calculateCall = calls.find((call: any) => call[0] === 'calc-server/calculate');
      const formatCall = calls.find((call: any) => call[0] === 'calc-server/format');
      
      expect(calculateCall).toBeDefined();
      expect(calculateCall[1]).toMatchObject({
        name: 'calc-server/calculate',
        tool: {
          description: 'Perform calculations',
        },
      });
      expect(formatCall).toBeDefined();
      expect(formatCall[1]).toMatchObject({
        name: 'calc-server/format',
        tool: {
          description: 'Format text',
        },
      });

      // Verify the tool schemas are preserved
      expect(calculateCall[1].tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          operation: { type: 'string' },
          numbers: { type: 'array', items: { type: 'number' } },
        },
        required: ['operation', 'numbers'],
      });

      expect(formatCall[1].tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          text: { type: 'string' },
          style: { type: 'string' },
        },
        required: ['text'],
      });
    });

    it('should handle transport creation for each type', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'test-tool': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Test tool',
          },
        }),
      };
      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Test stdio transport
      await mcpService.register('stdio-server', { type: 'stdio', command: 'test' }, mockApp);
      expect(mockedStdio.StdioClientTransport).toHaveBeenCalledWith({ type: 'stdio', command: 'test' });

      // Test SSE transport
      await mcpService.register('sse-server', { type: 'sse', url: 'http://localhost:3000/sse' }, mockApp);
      expect(mockedSSE.SSEClientTransport).toHaveBeenCalledWith(new URL('http://localhost:3000/sse'));

      // Test HTTP transport
      await mcpService.register('http-server', { type: 'http', url: 'http://localhost:3000/http' }, mockApp);
      expect(mockedHttp.StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL('http://localhost:3000/http'));
    });
  });

  describe('Error Scenarios', () => {
    it('should handle MCP client creation failure', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const config = { type: 'sse', url: 'http://localhost:3000/test' };

      mockedMcp.experimental_createMCPClient.mockRejectedValue(new Error('Connection failed'));

      await expect(mcpService.register('test-server', config, mockApp))
        .rejects.toThrow('Connection failed');
    });

    it('should handle tool retrieval failure', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const config = { type: 'sse', url: 'http://localhost:3000/test' };

      const mockClient = {
        tools: vi.fn().mockRejectedValue(new Error('Tool retrieval failed')),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      await expect(mcpService.register('test-server', config, mockApp))
        .rejects.toThrow('Tool retrieval failed');
    });

    it('should handle chat service registration failure', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const config = { type: 'sse', url: 'http://localhost:3000/test' };

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'test-tool': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Test tool',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);
      
      // Mock registerTool to throw synchronously
      const originalRegisterTool = mockChatService.registerTool;
      mockChatService.registerTool = vi.fn().mockImplementation(() => {
        throw new Error('Registration failed');
      });

      try {
        await mcpService.register('test-server', config, mockApp);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBe('Registration failed');
      } finally {
        mockChatService.registerTool = originalRegisterTool;
      }
    });

    it('should handle unknown transport type', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const config = { type: 'unknown' } as any;

      await expect(mcpService.register('test-server', config, mockApp))
        .rejects.toThrow('Unknown connection type unknown');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid successive registrations', async () => {
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'tool': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Test tool',
          },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      const configs = [
        { type: 'sse', url: 'http://localhost:3001/sse' },
        { type: 'http', url: 'http://localhost:3002/http' },
        { type: 'stdio', command: 'server1' },
      ];

      // Use Promise.allSettled to handle individual promise rejections
      const promises = configs.map(config => 
        mcpService.register(`server-${Math.random()}`, config, mockApp)
      );

      const results = await Promise.allSettled(promises);
      
      // All promises should resolve successfully
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent plugin installations', async () => {
      const config1 = {
        mcp: {
          transports: {
            'server1': { type: 'stdio', command: 'server1' },
          },
        }
      };

      const config2 = {
        mcp: {
          transports: {
            'server2': { type: 'sse', url: 'http://localhost:3000/server2' },
          },
        }
      };

      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'tool': { inputSchema: { type: 'object' }, execute: vi.fn(), description: 'Tool' },
        }),
      };

      mockedMcp.experimental_createMCPClient.mockResolvedValue(mockClient);

      // Create service and register transports
      const mcpService = new MCPService();
      mockApp.addServices(mcpService);
      
      const promise1 = mcpService.register('server1', config1.mcp.transports['server1'], mockApp);
      const promise2 = mcpService.register('server2', config2.mcp.transports['server2'], mockApp);

      // Use Promise.allSettled for concurrent operations
      const results = await Promise.allSettled([promise1, promise2]);
      
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });
  });
});
