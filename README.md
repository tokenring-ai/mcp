# @tokenring-ai/mcp

## Overview

MCP (Model Context Protocol) client integration for the TokenRing ecosystem. This package provides MCP client functionality to connect TokenRing agents with MCP servers, enabling access to external tools and resources through the Model Context Protocol. It serves as a TokenRing plugin that automatically registers MCP server tools with the chat service.

## Key Features

- **Multiple Transport Types**: Support for stdio, SSE (Server-Sent Events), and HTTP transports
- **Automatic Tool Registration**: MCP server tools are automatically registered with TokenRing chat service
- **Seamless Integration**: Works with existing TokenRing agent architecture and plugin system
- **Plugin-Based Architecture**: Integrates as a TokenRing plugin with automatic service registration
- **Zod Schema Validation**: Comprehensive configuration validation with detailed error messages
- **Type-Safe Configuration**: Strong typing for all configuration options using TypeScript and Zod
- **Error Handling**: Proper error handling for transport connections and tool registration
- **Tool Schema Preservation**: Maintains original MCP tool schemas during registration
- **Passthrough Configuration**: Supports additional configuration properties via Zod passthrough

## Installation

```bash
bun install @tokenring-ai/mcp
```

## Dependencies

This package depends on:

- **@tokenring-ai/app**: Core TokenRing application framework
- **@tokenring-ai/chat**: Chat service for tool registration
- **@tokenring-ai/agent**: Agent system for tool execution
- **@ai-sdk/mcp**: AI SDK integration for MCP protocol
- **@modelcontextprotocol/sdk**: Official MCP SDK implementation
- **ai**: AI SDK core functionality
- **zod**: Schema validation library

## Core Components

### MCPService

The main service class for MCP server registration and management.

#### Properties

- `name: "MCPService"`: Service identifier
- `description: "Service for MCP (Model Context Protocol) servers"`: Service description

#### Methods

##### register

```typescript
async register(name: string, config: MCPTransportConfig, app: TokenRingApp): Promise<void>
```

Registers an MCP server with the TokenRing application.

**Parameters:**

- `name`: Unique identifier for the MCP server
- `config`: Transport configuration object
- `app`: TokenRingApp instance to register tools with

**Returns:** `Promise<void>` - resolves when server is connected and tools are registered

**Throws:**

- `Error` - when transport type is unknown
- `Error` - when MCP client creation fails
- `Error` - when tool retrieval fails

**Example:**

```typescript
import MCPService from '@tokenring-ai/mcp/MCPService';
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
```

### MCPTransportConfig

Type definition for MCP transport configurations, defined as a discriminated union with passthrough support for additional properties.

```typescript
type MCPTransportConfig = z.infer<typeof MCPTransportConfigSchema>;
```

The schema uses discriminated union with passthrough, allowing three transport types:

- **stdio**: `{ type: "stdio"; command: string; args?: string[]; env?: Record<string, string>; cwd?: string; [key: string]: any }`
- **sse**: `{ type: "sse"; url: string; headers?: Record<string, string>; timeout?: number; [key: string]: any }`
- **http**: `{ type: "http"; url: string; method?: "GET" | "POST" | "PUT" | "DELETE"; headers?: Record<string, string>; timeout?: number; [key: string]: any }`

### MCPTransportConfigSchema

Zod schema for validating transport configurations.

```typescript
export const MCPTransportConfigSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("stdio")}).passthrough(),
  z.object({type: z.literal("sse"), url: z.url()}).passthrough(),
  z.object({type: z.literal("http"), url: z.url()}).passthrough(),
]);
```

**Key Features:**

- **Discriminated Union**: Uses `type` field to determine transport type
- **Passthrough**: Allows additional properties beyond the defined schema
- **URL Validation**: SSE and HTTP transports require valid URLs using `z.url()`
- **Type Safety**: TypeScript types are inferred from the schema

### MCPConfigSchema

Zod schema for validating MCP plugin configuration.

```typescript
export const MCPConfigSchema = z.object({
  transports: z.record(z.string(), z.looseObject({type: z.string()}))
}).optional();
```

**Note:** The schema uses `z.record()` to create a record of transport configurations, where each transport must have a `type` field. It uses `z.looseObject()` which allows additional properties beyond the `type` field.

## Configuration

### Plugin Configuration

Configure the MCP package in your TokenRing application:

```typescript
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

### Configuration Schemas

#### Minimal Configuration

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

#### Complete Configuration

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

## Transport Types

### Stdio Transport

Execute an MCP server as a child process.

**Configuration:**

```typescript
{
  type: 'stdio',
  command: string,           // Required: Command to execute
  args?: string[],          // Optional: Command arguments
  env?: Record<string, string>, // Optional: Environment variables
  cwd?: string,             // Optional: Working directory
  [key: string]: any        // Additional properties passed through
}
```

**Example:**

```typescript
await mcpService.register('local-server', {
  type: 'stdio',
  command: 'mcp-server',
  args: ['--config', 'config.json'],
  env: {
    DEBUG: 'true'
  },
  cwd: '/path/to/server'
}, app);
```

**Transport Creation:**

The stdio transport is created by passing the entire config object to `StdioClientTransport`:

```typescript
transport = new StdioClientTransport(config as any);
```

### SSE Transport

Connect to an MCP server using Server-Sent Events.

**Configuration:**

```typescript
{
  type: 'sse',
  url: string,              // Required: SSE endpoint URL
  headers?: Record<string, string>, // Optional: Custom headers
  timeout?: number,         // Optional: Connection timeout in ms
  [key: string]: any        // Additional properties passed through
}
```

**Example:**

```typescript
await mcpService.register('remote-server', {
  type: 'sse',
  url: 'http://localhost:3000/sse',
  headers: {
    'Authorization': 'Bearer token123'
  },
  timeout: 10000
}, app);
```

**Transport Creation:**

The SSE transport is created with a URL object:

```typescript
transport = new SSEClientTransport(new URL(config.url));
```

### HTTP Transport

Connect to an MCP server using HTTP (streamable HTTP).

**Configuration:**

```typescript
{
  type: 'http',
  url: string,              // Required: HTTP endpoint URL
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE', // Optional: HTTP method
  headers?: Record<string, string>, // Optional: Custom headers
  timeout?: number,         // Optional: Connection timeout in ms
  [key: string]: any        // Additional properties passed through
}
```

**Example:**

```typescript
await mcpService.register('api-server', {
  type: 'http',
  url: 'http://localhost:3001/api/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 5000
}, app);
```

**Transport Creation:**

The HTTP transport is created with a URL object:

```typescript
transport = new StreamableHTTPClientTransport(new URL(config.url));
```

## Tool Registration

When an MCP server is registered, the package:

1. Creates a client connection using the specified transport type
2. Retrieves available tools from the MCP server using `client.tools()`
3. Registers each tool with the TokenRing chat service
4. Tool names are prefixed with the server name (e.g., `myserver/tool-name`)
5. Tool schemas are preserved and passed to the chat service
6. Tool execution functions are bound to the MCP client

### Tool Naming Convention

Each tool from an MCP server is registered with a composite name:

- **Format**: `{server-name}/{tool-name}`
- **Example**: If server is "weather" and tool is "get_forecast", the registered tool will be "weather/get_forecast"
- **Access**: Agents can call tools using the full composite name

### Tool Schema Preservation

The package maintains the original MCP tool schemas:

- Input schemas are passed through to the chat service
- Tool descriptions are preserved
- Execution handlers are bound to the MCP client
- Type safety is maintained through TypeScript types

**Registration Structure:**

```typescript
chatService.registerTool(`${name}/${toolName}`, {
  name: `${name}/${toolName}`,
  tool: {
    inputSchema: tool.inputSchema,
    execute: tool.execute,
    description: tool.description
  }
});
```

## Plugin Lifecycle

The MCP package integrates into the TokenRing plugin system with two lifecycle hooks:

### install()

Called when the plugin is installed. This method creates the MCPService instance and adds it to the application services.

```typescript
install(app, config) {
  if (config.mcp) {
    const mcpService = new MCPService();
    app.addServices(mcpService);
  }
}
```

**Behavior:**

- If `config.mcp` is undefined, no service is added
- If `config.mcp` exists (even with empty transports), the service is added
- The service is added regardless of whether transports are configured

### start()

Called when the plugin starts. This method iterates through the configured transports and registers each MCP server.

```typescript
async start(app, config) {
  if (config.mcp) {
    for (const name in config.mcp.transports) {
      await app.requireService(MCPService).register(name, config.mcp.transports[name] as any, app);
    }
  }
}
```

**Behavior:**

- Iterates through all configured transports
- Registers each transport with the MCPService
- Awaits each registration before proceeding to the next

## Usage Examples

### Plugin Installation

The MCP plugin automatically registers when configured:

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
              args: ["--config", "config.json"]
            }
          }
        }
      }
    }
  ]
}
```

### Manual Service Usage

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

### Accessing Registered Tools

```typescript
// Access MCP service
const mcpService = agent.requireServiceByType(MCPService);

// Call registered MCP tools
// Tools are available as: {server-name}/{tool-name}
await agent.callTool('weather/get_forecast', {
  location: 'San Francisco',
  days: 7
});
```

## Integration

### TokenRing Plugin Integration

The package automatically integrates with the TokenRing application framework:

- **Service Registration**: MCPService is automatically added to the application services
- **Lifecycle Hooks**: Plugin install and start hooks handle initialization
- **Chat Service Integration**: Tools are registered with the chat service
- **Tool Execution**: Tools are executed through the agent's tool execution system

### Agent Integration

Agents can access MCP services and tools:

```typescript
// Access MCP service
const mcpService = agent.requireServiceByType(MCPService);

// Call registered MCP tools
// Tools are available as: {server-name}/{tool-name}
await agent.callTool('weather/get_forecast', {
  location: 'San Francisco',
  days: 7
});
```

### Service Dependencies

The package requires the following services:

- **ChatService**: For tool registration
- **TokenRingApp**: For application context and service management

These services are automatically provided by the TokenRing application framework.

## RPC Endpoints

This package does not define RPC endpoints.

## State Management

This package does not implement state management.

## Error Handling

The package provides comprehensive error handling:

- **Invalid Configuration**: Throws clear validation errors for invalid transport configurations using Zod
- **Transport Failures**: Handles connection errors with descriptive messages
  - Stdio: Process execution errors, command not found
  - SSE: Connection timeouts, invalid URLs
  - HTTP: Network errors, connection refused
- **Tool Registration Failures**: Returns errors when tools cannot be registered with chat service
- **Service Dependencies**: Checks for required services (ChatService, TokenRingApp) before registration
- **Unknown Transport Types**: Throws errors for unsupported transport types

### Error Scenarios

#### Configuration Errors

```typescript
// Invalid transport type
{
  type: 'unknown'  // Will throw: "Unknown connection type unknown"
}

// Missing required field
{
  type: 'sse'
  // Missing 'url' field - will throw validation error
}
```

#### Connection Errors

```typescript
// Stdio command not found
{
  type: 'stdio',
  command: 'nonexistent-command'
  // Will throw process execution error
}

// Invalid URL
{
  type: 'sse',
  url: 'not-a-valid-url'
  // Will throw connection error
}
```

#### MCP Client Creation Failure

```typescript
// When the MCP server is unreachable
{
  type: 'sse',
  url: 'http://unreachable-server:3000/sse'
  // Will throw connection error from MCP client creation
}
```

#### Tool Retrieval Failure

```typescript
// When the server cannot provide tools
{
  type: 'stdio',
  command: 'mcp-server'
  // Will throw error if server fails to respond to tools() request
}
```

## Best Practices

### Transport Selection

- **Use stdio** for local MCP servers that can be executed as child processes
- **Use SSE** for remote MCP servers that support Server-Sent Events
- **Use HTTP** for MCP servers that expose streamable HTTP endpoints

### Tool Naming

- Choose descriptive server names that identify the server's purpose
- Server names become prefixes for all tools, so keep them concise
- Avoid special characters in server names that might conflict with tool naming

### Error Handling

- Always wrap MCP server registration in try/catch blocks
- Log connection errors for debugging
- Implement retry logic for transient connection failures

### Configuration Validation

- Use TypeScript to catch configuration errors at compile time
- Validate configurations before passing to the plugin
- Use Zod schemas for runtime validation when needed

### Passthrough Configuration

- The schema uses `.passthrough()` to allow additional properties
- Additional properties are passed through to transport constructors
- Be aware that invalid properties may cause runtime errors in transport creation

## Testing and Development

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

Run tests in watch mode:

```bash
bun run test:watch
```

Run tests with coverage:

```bash
bun run test:coverage
```

### Building

Build the package to check for TypeScript errors:

```bash
bun run build
```

### Code Structure

- **index.ts**: Main exports and configuration schemas
- **plugin.ts**: TokenRing plugin definition with lifecycle hooks
- **MCPService.ts**: Core service implementation for MCP server registration
- **MCPService.test.ts**: Unit tests for MCPService
- **configuration.test.ts**: Configuration validation tests
- **integration.test.ts**: Integration tests with TokenRing services
- **vitest.config.ts**: Vitest configuration

### Contribution Guidelines

- Follow existing code style and patterns
- Add unit tests for new functionality
- Update documentation for new features
- Ensure all changes work with TokenRing agent framework
- Test with all three transport types (stdio, SSE, HTTP)
- Verify tool registration and execution

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tokenring-ai/app | 0.2.0 | Core TokenRing application framework |
| @tokenring-ai/chat | 0.2.0 | Chat service for tool registration |
| @tokenring-ai/agent | 0.2.0 | Agent system for tool execution |
| @ai-sdk/mcp | ^1.0.28 | AI SDK MCP integration |
| @modelcontextprotocol/sdk | ^1.27.1 | Official MCP SDK |
| ai | ^6.0.127 | AI SDK core |
| zod | ^4.3.6 | Schema validation |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vitest | ^4.1.0 | Testing framework |
| typescript | ^5.9.3 | TypeScript compiler |

## Related Components

- **@tokenring-ai/agent**: Core agent orchestration system
- **@tokenring-ai/chat**: Chat service for tool registration
- **@tokenring-ai/app**: Base application framework

## License

MIT License - see [LICENSE](./LICENSE) file for details.
