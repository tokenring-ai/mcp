# @tokenring-ai/mcp

## Overview
MCP (Model Context Protocol) client integration for the TokenRing ecosystem. This package provides MCP client functionality to connect TokenRing agents with MCP servers, enabling access to external tools and resources through the Model Context Protocol. It serves as a TokenRing plugin that automatically registers MCP server tools with the chat service.

## Features
- **Multiple Transport Types**: Support for stdio, SSE, and HTTP transports
- **Automatic Tool Registration**: MCP server tools are automatically registered with TokenRing agents
- **Seamless Integration**: Works with existing TokenRing agent architecture
- **Plugin-Based Architecture**: Integrates as a TokenRing plugin with automatic service registration
- **Zod Schema Validation**: Comprehensive configuration validation with detailed error messages
- **Type-Safe Configuration**: Strong typing for all configuration options
- **Error Handling**: Proper error handling for transport connections and tool registration
- **Tool Schema Preservation**: Maintains original MCP tool schemas during registration

## Installation

```bash
bun install @tokenring-ai/mcp
```

## Core Components/API

### MCPService

The main service class for manual MCP server registration.

#### Constructor
```typescript
new MCPService()
```

#### Properties
- `name: "MCPService"`: Service identifier
- `description: "Service for MCP (Model Context Protocol) servers"`: Service description

#### Methods
- `register(name: string, config: MCPTransportConfig, app: TokenRingApp): Promise<void>`
  - Registers an MCP server with the TokenRing application
  - `name`: Unique identifier for the MCP server
  - `config`: Transport configuration object
  - `app`: TokenRingApp instance to register tools with

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

#### MCPTransportConfig Type
```typescript
type MCPTransportConfig = 
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string>; cwd?: string }
  | { type: "sse"; url: string; headers?: Record<string, string>; timeout?: number }
  | { type: "http"; url: string; method?: "GET" | "POST" | "PUT" | "DELETE"; headers?: Record<string, string>; timeout?: number };
```

## Usage Examples

### As a TokenRing Plugin

Configure the MCP package in your TokenRing application:

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
  cwd?: string                    // Optional: Working directory
}
```

#### SSE Transport

```typescript
{
  type: 'sse',
  url: 'http://localhost:3000/sse', // Required: SSE endpoint URL
  headers?: Record<string, string>, // Optional: Custom headers
  timeout?: number                // Optional: Connection timeout in ms
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

## Configuration

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

## Error Handling

The package provides comprehensive error handling:

- **Invalid Configuration**: Throws clear validation errors for invalid transport configurations
- **Transport Failures**: Handles connection errors with descriptive messages
- **Tool Registration Failures**: Returns errors when tools cannot be registered with chat service
- **Service Dependencies**: Checks for required services before registration

## Integration

### TokenRing Plugin Integration

The package automatically integrates with the TokenRing application framework:

- Registers MCPService with the application
- Automatically handles plugin installation and configuration
- Integrates with the chat service for tool registration

### Agent Integration

```typescript
// Agents can access MCP services directly
const mcpService = agent.requireServiceByType(MCPService);
```

## Development

### Testing

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

### Contribution Guidelines

- Follow existing code style and patterns
- Add unit tests for new functionality
- Update documentation for new features
- Ensure all changes work with TokenRing agent framework

## License

MIT License - see [LICENSE](./LICENSE) file for details.