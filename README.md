# @tokenring-ai/mcp

MCP (Model Context Protocol) client integration for the TokenRing ecosystem.

## Overview

This package provides MCP client functionality to connect TokenRing agents with MCP servers, enabling access to external tools and resources through the Model Context Protocol. It serves as a TokenRing plugin that automatically registers MCP server tools with the chat service.

## Features

- **Multiple transport types**: Support for stdio, SSE, and HTTP transports
- **Automatic tool registration**: MCP server tools are automatically registered with TokenRing agents
- **Seamless integration**: Works with existing TokenRing agent architecture
- **Plugin-based architecture**: Integrates as a TokenRing plugin with automatic service registration
- **Zod schema validation**: Comprehensive configuration validation with detailed error messages
- **Type-safe configuration**: Strong typing for all configuration options
- **Error handling**: Proper error handling for transport connections and tool registration
- **Tool schema preservation**: Maintains original MCP tool schemas during registration

## Installation

```bash
bun install @tokenring-ai/mcp
```

## Dependencies

- `@tokenring-ai/app`: ^0.2.0
- `@tokenring-ai/chat`: ^0.2.0
- `@tokenring-ai/agent`: ^0.2.0
- `@ai-sdk/mcp`: ^0.0.12
- `@modelcontextprotocol/sdk`: ^1.25.0
- `ai`: ^5.0.113
- `zod`: ^4.1.13

## Usage

### As a TokenRing Plugin

The package is designed to work as a TokenRing plugin. Configure it in your application:

```typescript
// In your TokenRing app configuration
{
  plugins: [
    {
      name: "@tokenring-ai/mcp",
      config: {
        mcp: {
          transports: {
            myserver: {
              type: "stdio",
              command: "mcp-server",
              args: ["--config", "config.json"],
              env: {
                DEBUG: "true"
              }
            },
            remoteserver: {
              type: "sse",
              url: "http://localhost:3000/sse",
              headers: {
                "Authorization": "Bearer token123"
              }
            },
            apiserver: {
              type: "http",
              url: "http://localhost:3001/api/mcp",
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              }
            }
          }
        }
      }
    }
  ]
}
```

### Manual Usage

```typescript
import { MCPService } from '@tokenring-ai/mcp';
import TokenRingApp from '@tokenring-ai/app';

const mcpService = new MCPService();
const app = new TokenRingApp();

// Register an MCP server with stdio transport
await mcpService.register('myserver', {
  type: 'stdio',
  command: 'mcp-server',
  args: ['--config', 'config.json'],
  env: {
    DEBUG: 'true'
  }
}, app);

// Register with SSE transport
await mcpService.register('remoteserver', {
  type: 'sse',
  url: 'http://localhost:3000/sse',
  headers: {
    'Authorization': 'Bearer token123'
  }
}, app);

// Register with HTTP transport
await mcpService.register('apiserver', {
  type: 'http',
  url: 'http://localhost:3001/api/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, app);
```

### Transport Types

#### Stdio Transport

```typescript
{
  type: 'stdio',
  command: 'mcp-server',           // Required: Command to execute
  args?: string[],                // Optional: Command arguments
  env?: Record<string, string>,   // Optional: Environment variables
  cwd?: string                   // Optional: Working directory
}
```

#### SSE Transport

```typescript
{
  type: 'sse',
  url: 'http://localhost:3000/sse', // Required: SSE endpoint URL
  headers?: Record<string, string>, // Optional: Custom headers
  timeout?: number               // Optional: Connection timeout in ms
}
```

#### HTTP Transport

```typescript
{
  type: 'http',
  url: 'http://localhost:3001/api/mcp', // Required: HTTP endpoint URL
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE',     // Optional: HTTP method (default: GET)
  headers?: Record<string, string>,    // Optional: Custom headers
  timeout?: number                   // Optional: Connection timeout in ms
}
```

## API

### Exports

- `default`: TokenRing plugin object
- `MCPService`: Service class for manual MCP server registration
- `MCPConfigSchema`: Zod schema for plugin configuration
- `MCPTransportConfigSchema`: Zod schema for transport configuration
- `MCPTransportConfig`: Type alias for transport configuration

### MCPService

#### `register(name: string, config: MCPTransportConfig, app: TokenRingApp): Promise<void>`

Registers an MCP server with the TokenRing application.

- `name`: Unique identifier for the MCP server
- `config`: Transport configuration object
- `app`: TokenRingApp instance to register tools with

#### Properties

- `name`: "MCPService"
- `description`: "Service for MCP (Model Context Protocol) servers"

### Configuration Schemas

#### MCPConfigSchema

```typescript
z.object({
  transports: z.record(z.string(), MCPTransportConfigSchema)
}).optional();
```

#### MCPTransportConfigSchema

```typescript
z.discriminatedUnion("type", [
  z.object({type: z.literal("stdio")}).passthrough(),
  z.object({type: z.literal("sse"), url: z.url()}).passthrough(),
  z.object({type: z.literal("http"), url: z.url()}).passthrough(),
]);
```

### MCPTransportConfig Type

```typescript
type MCPTransportConfig = 
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string>; cwd?: string }
  | { type: "sse"; url: string; headers?: Record<string, string>; timeout?: number }
  | { type: "http"; url: string; method?: "GET" | "POST" | "PUT" | "DELETE"; headers?: Record<string, string>; timeout?: number };
```

## How It Works

1. The plugin installs itself into the TokenRing application
2. For each configured transport, it creates an appropriate MCP client transport
3. It connects to the MCP server and retrieves available tools
4. Each tool is registered with the TokenRing chat service using the format `{serverName}/{toolName}`
5. Registered tools become available to TokenRing agents for use
6. Tools are automatically integrated with the chat service's tool registry
7. The package preserves the original MCP tool schemas during registration
8. Error handling is provided for transport connections and tool retrieval

## Configuration Examples

### Minimal Configuration

```json
{
  "mcp": {
    "transports": {
      "my-server": {
        "type": "stdio",
        "command": "mcp-server"
      }
    }
  }
}
```

### Complete Configuration

```json
{
  "mcp": {
    "transports": {
      "local-server": {
        "type": "stdio",
        "command": "local-mcp-server",
        "args": ["--config", "config.json"],
        "env": {
          "DEBUG": "true"
        },
        "cwd": "/path/to/server"
      },
      "remote-server": {
        "type": "sse",
        "url": "http://localhost:3000/sse",
        "headers": {
          "Authorization": "Bearer token123"
        },
        "timeout": 10000
      },
      "api-server": {
        "type": "http",
        "url": "http://localhost:3001/api/mcp",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "timeout": 5000
      }
    }
  }
}
```

## Testing

The package includes comprehensive tests covering:

- Configuration validation
- Transport type handling
- Tool registration
- Error scenarios
- Integration with TokenRing services
- Concurrent operations
- Tool schema preservation

Run tests with:

```bash
bun run test
```

## Package Information

- **Name**: `@tokenring-ai/mcp`
- **Version**: `0.2.0`
- **License**: MIT
- **Type**: Module
- **Exports**: `./*` pattern for all TypeScript files

## License

MIT - Copyright (c) 2025 Mark Dierolf