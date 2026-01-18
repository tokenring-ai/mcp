import {experimental_createMCPClient} from '@ai-sdk/mcp';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import MCPService from './MCPService';

// Mock the external dependencies
vi.mock('@ai-sdk/mcp', () => ({
  experimental_createMCPClient: vi.fn(),
}));

// Mock transport classes with proper constructor mocking
vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: class MockSSEClientTransport {
    connect = vi.fn();
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class MockStdioClientTransport {
    connect = vi.fn();
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: class MockStreamableHTTPClientTransport {
    connect = vi.fn();
  },
}));

// Mock app and chat service properly
vi.mock('@tokenring-ai/app', () => ({
  default: {
    requireService: vi.fn(),
  },
}));

vi.mock('@tokenring-ai/chat', () => ({
  ChatService: 'ChatService',
}));

describe('MCPService', () => {
  let mcpService: MCPService;
  let mockApp: any;
  let mockChatService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mcpService = new MCPService();
    
    // Mock ChatService
    mockChatService = {
      registerTool: vi.fn(),
    };

    // Mock TokenRingApp
    mockApp = {
      requireService: vi.fn().mockResolvedValue(mockChatService),
      getConfigSlice: vi.fn(),
      addServices: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should initialize with correct name and description', () => {
      expect(mcpService.name).toBe('MCPService');
      expect(mcpService.description).toBe('Service for MCP (Model Context Protocol) servers');
    });
  });

  describe('register method', () => {
    it('should throw error for unknown transport type', async () => {
      const unknownConfig = { type: 'unknown' } as any;
      
      await expect(mcpService.register('test', unknownConfig, mockApp))
        .rejects
        .toThrow('Unknown connection type unknown');
    });

    it('should handle stdio transport configuration', async () => {
      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'test-tool': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Test tool description'
          }
        }),
      };
      
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);
      
      const stdioConfig = {
        type: 'stdio',
        command: 'test-command',
        args: ['--test'],
      };

      await mcpService.register('test-server', stdioConfig, mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledWith('test-server/test-tool', {
        name: 'test-server/test-tool',
        tool: {
          inputSchema: { type: 'object' },
          execute: expect.any(Function),
          description: 'Test tool description'
        }
      });
    });

    it('should handle SSE transport configuration', async () => {
      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'sse-tool': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'SSE tool description'
          }
        }),
      };
      
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);
      
      const sseConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
      };

      await mcpService.register('sse-server', sseConfig, mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledWith('sse-server/sse-tool', {
        name: 'sse-server/sse-tool',
        tool: {
          inputSchema: { type: 'object' },
          execute: expect.any(Function),
          description: 'SSE tool description'
        }
      });
    });

    it('should handle HTTP transport configuration', async () => {
      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'http-tool': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'HTTP tool description'
          }
        }),
      };
      
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);
      
      const httpConfig = {
        type: 'http',
        url: 'http://localhost:3000/mcp',
      };

      await mcpService.register('http-server', httpConfig, mockApp);

      expect(mockChatService.registerTool).toHaveBeenCalledWith('http-server/http-tool', {
        name: 'http-server/http-tool',
        tool: {
          inputSchema: { type: 'object' },
          execute: expect.any(Function),
          description: 'HTTP tool description'
        }
      });
    });

    it('should register multiple tools with proper naming', async () => {
      const mockClient = {
        tools: vi.fn().mockResolvedValue({
          'tool1': {
            inputSchema: { type: 'object', properties: { test: { type: 'string' } } },
            execute: vi.fn(),
            description: 'Tool 1 description'
          },
          'tool2': {
            inputSchema: { type: 'object', properties: { data: { type: 'number' } } },
            execute: vi.fn(),
            description: 'Tool 2 description'
          },
          'tool3': {
            inputSchema: { type: 'object' },
            execute: vi.fn(),
            description: 'Tool 3 description'
          }
        }),
      };
      
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const config = {
        type: 'sse',
        url: 'http://localhost:3000/mcp',
      };

      await mcpService.register('multi-tool-server', config, mockApp);

      // Should register all tools with the server prefix
      expect(mockChatService.registerTool).toHaveBeenCalledTimes(3);
      expect(mockChatService.registerTool).toHaveBeenCalledWith('multi-tool-server/tool1', expect.any(Object));
      expect(mockChatService.registerTool).toHaveBeenCalledWith('multi-tool-server/tool2', expect.any(Object));
      expect(mockChatService.registerTool).toHaveBeenCalledWith('multi-tool-server/tool3', expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('should handle MCP client creation failures', async () => {
      (experimental_createMCPClient as any).mockRejectedValue(new Error('Connection failed'));

      const config = {
        type: 'sse',
        url: 'http://localhost:3000/mcp',
      };

      await expect(mcpService.register('test-server', config, mockApp))
        .rejects
        .toThrow('Connection failed');
    });

    it('should handle tool retrieval failures', async () => {
      const mockClient = {
        tools: vi.fn().mockRejectedValue(new Error('Tool retrieval failed')),
      };
      
      (experimental_createMCPClient as any).mockResolvedValue(mockClient);

      const config = {
        type: 'sse',
        url: 'http://localhost:3000/mcp',
      };

      await expect(mcpService.register('test-server', config, mockApp))
        .rejects
        .toThrow('Tool retrieval failed');
    });

    it('should handle app service resolution failures', async () => {
      const mockAppWithError = {
        requireService: vi.fn().mockRejectedValue(new Error('Service not found')),
      };

      const config = {
        type: 'sse',
        url: 'http://localhost:3000/mcp',
      };

      await expect(mcpService.register('test-server', config, mockAppWithError))
        .rejects
        .toThrow('Service not found');
    });
  });
});