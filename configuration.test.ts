import {describe, expect, it} from 'vitest';
import {MCPConfigSchema} from './index';
import {MCPTransportConfigSchema} from './MCPService';

describe('Configuration Schemas', () => {
  describe('MCPConfigSchema', () => {
    it('should validate valid config with transports', () => {
      const validConfig = {
        transports: {
          server1: {
            type: 'stdio',
            command: 'test-command',
          },
          server2: {
            type: 'sse',
            url: 'http://localhost:3000/sse',
          },
          server3: {
            type: 'http',
            url: 'http://localhost:3000/mcp',
          },
        },
      };

      const result = MCPConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validConfig);
    });

    it('should validate undefined config', () => {
      const result = MCPConfigSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should validate empty transports object', () => {
      const validConfig = {
        transports: {},
      };

      const result = MCPConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid config', () => {
      const invalidConfig = {
        transports: {
          server1: 'invalid-config',
        },
      };

      const result = MCPConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject config with missing transports', () => {
      const invalidConfig = {
        // missing transports
      };

      const result = MCPConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('MCPTransportConfigSchema - Stdio Transport', () => {
    it('should validate stdio transport config', () => {
      const stdioConfig = {
        type: 'stdio',
        command: 'test-command',
        args: ['--test', '--flag'],
        env: { TEST: 'value' },
      };

      const result = MCPTransportConfigSchema.safeParse(stdioConfig);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('stdio');
      expect(result.data.command).toBe('test-command');
      expect(result.data.args).toEqual(['--test', '--flag']);
    });

    it('should reject stdio config without type', () => {
      const invalidConfig = {
        command: 'test-command',
      };

      const result = MCPTransportConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject stdio config with wrong type', () => {
      const invalidConfig = {
        type: 'not-stdio',
        command: 'test-command',
      };

      const result = MCPTransportConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('MCPTransportConfigSchema - SSE Transport', () => {
    it('should validate SSE transport config', () => {
      const sseConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
      };

      const result = MCPTransportConfigSchema.safeParse(sseConfig);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('sse');
      expect(result.data.url).toBe('http://localhost:3000/sse');
    });

    it('should reject SSE config without url', () => {
      const invalidConfig = {
        type: 'sse',
      };

      const result = MCPTransportConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject SSE config with invalid url', () => {
      const invalidConfig = {
        type: 'sse',
        url: 'not-a-url',
      };

      const result = MCPTransportConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate SSE config with additional properties', () => {
      const sseConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
        headers: {
          'Authorization': 'Bearer token',
        },
        timeout: 5000,
      };

      const result = MCPTransportConfigSchema.safeParse(sseConfig);
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('http://localhost:3000/sse');
      expect(result.data.headers).toBeDefined();
      expect(result.data.timeout).toBe(5000);
    });
  });

  describe('MCPTransportConfigSchema - HTTP Transport', () => {
    it('should validate HTTP transport config', () => {
      const httpConfig = {
        type: 'http',
        url: 'http://localhost:3000/mcp',
      };

      const result = MCPTransportConfigSchema.safeParse(httpConfig);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('http');
      expect(result.data.url).toBe('http://localhost:3000/mcp');
    });

    it('should reject HTTP config without url', () => {
      const invalidConfig = {
        type: 'http',
      };

      const result = MCPTransportConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject HTTP config with invalid url', () => {
      const invalidConfig = {
        type: 'http',
        url: 'invalid-url',
      };

      const result = MCPTransportConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate HTTP config with additional properties', () => {
      const httpConfig = {
        type: 'http',
        url: 'http://localhost:3000/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const result = MCPTransportConfigSchema.safeParse(httpConfig);
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('http://localhost:3000/mcp');
      expect(result.data.method).toBe('POST');
    });
  });

  describe('MCPTransportConfigSchema - Discriminated Union', () => {
    it('should correctly discriminate stdio type', () => {
      const stdioConfig = {
        type: 'stdio',
        command: 'test',
      };

      const result = MCPTransportConfigSchema.safeParse(stdioConfig);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('stdio');
    });

    it('should correctly discriminate sse type', () => {
      const sseConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
      };

      const result = MCPTransportConfigSchema.safeParse(sseConfig);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('sse');
    });

    it('should correctly discriminate http type', () => {
      const httpConfig = {
        type: 'http',
        url: 'http://localhost:3000/mcp',
      };

      const result = MCPTransportConfigSchema.safeParse(httpConfig);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('http');
    });

    it('should handle passthrough for stdio additional properties', () => {
      const stdioConfig = {
        type: 'stdio',
        command: 'test',
        args: ['arg1', 'arg2'],
        env: { KEY: 'value' },
        cwd: '/path/to/dir',
      };

      const result = MCPTransportConfigSchema.safeParse(stdioConfig);
      expect(result.success).toBe(true);
      expect(result.data.args).toEqual(['arg1', 'arg2']);
      expect(result.data.env).toEqual({ KEY: 'value' });
      expect(result.data.cwd).toBe('/path/to/dir');
    });

    it('should handle passthrough for sse additional properties', () => {
      const sseConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
        headers: { 'Authorization': 'Bearer token' },
        timeout: 10000,
      };

      const result = MCPTransportConfigSchema.safeParse(sseConfig);
      expect(result.success).toBe(true);
      expect(result.data.headers).toEqual({ 'Authorization': 'Bearer token' });
      expect(result.data.timeout).toBe(10000);
    });

    it('should handle passthrough for http additional properties', () => {
      const httpConfig = {
        type: 'http',
        url: 'http://localhost:3000/mcp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      };

      const result = MCPTransportConfigSchema.safeParse(httpConfig);
      expect(result.success).toBe(true);
      expect(result.data.method).toBe('POST');
      expect(result.data.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(result.data.timeout).toBe(5000);
    });

    it('should reject unknown transport types', () => {
      const unknownConfig = {
        type: 'unknown',
        url: 'http://localhost:3000/test',
      };

      const result = MCPTransportConfigSchema.safeParse(unknownConfig);
      expect(result.success).toBe(false);
    });

    it('should reject configs without type', () => {
      const noTypeConfig = {
        url: 'http://localhost:3000/test',
      };

      const result = MCPTransportConfigSchema.safeParse(noTypeConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Integration', () => {
    it('should validate complete MCP config with all transport types', () => {
      const completeConfig = {
        transports: {
          'stdio-server': {
            type: 'stdio',
            command: 'mcp-server',
            args: ['--config', 'config.json'],
            env: { DEBUG: 'true' },
          },
          'sse-server': {
            type: 'sse',
            url: 'http://localhost:3001/sse',
            headers: {
              'Authorization': 'Bearer secret-token',
            },
          },
          'http-server': {
            type: 'http',
            url: 'http://localhost:3002/mcp',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
      };

      const result = MCPConfigSchema.safeParse(completeConfig);
      expect(result.success).toBe(true);
      expect(Object.keys(result.data!.transports)).toHaveLength(3);
    });

    it('should validate edge case - minimal stdio config', () => {
      const minimalConfig = {
        type: 'stdio',
        command: 'test',
      };

      const result = MCPTransportConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });

    it('should validate edge case - minimal sse config', () => {
      const minimalConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
      };

      const result = MCPTransportConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });

    it('should validate edge case - minimal http config', () => {
      const minimalConfig = {
        type: 'http',
        url: 'http://localhost:3000/mcp',
      };

      const result = MCPTransportConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });
  });
});