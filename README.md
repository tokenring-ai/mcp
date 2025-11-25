# @tokenring-ai/mcp

MCP (Model Context Protocol) client integration for the TokenRing ecosystem.

## Overview

This package provides MCP client functionality to connect TokenRing agents with MCP servers, enabling access to external tools and resources through the Model Context Protocol. It serves as a TokenRing plugin that automatically registers MCP server tools with the chat service.

## Features

- **Multiple transport types**: Support for stdio, SSE, and HTTP transports
- **Automatic tool registration**: MCP server tools are automatically registered with TokenRing agents
- **Seamless integration**: Works with existing TokenRing agent architecture
- **Plugin-based architecture**: Integrates as a TokenRing plugin with automatic service registration

## Installation

```bash
npm install @tokenring-ai/mcp
```

## Dependencies

- `@tokenring-ai/agent`: ^0.1.0
- `@modelcontextprotocol/sdk`: ^1.22.0
- `ai`: ^5.0.101
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
              // stdio-specific config
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
  // stdio configuration will be passed directly to StdioClientTransport
}, app);
```

### Transport Types

#### Stdio Transport

```typescript
{
  type: 'stdio',
  // Configuration passed directly to @modelcontextprotocol/sdk/client/stdio.js
}
```

#### SSE Transport

```typescript
{
  type: 'sse',
  url: 'http://localhost:3000/sse'
}
```

#### HTTP Transport

```typescript
{
  type: 'http',
  url: 'http://localhost:3000/mcp'
}
```

## API

### Exports

- `default`: TokenRing plugin object
- `MCPService`: Service class for manual MCP server registration
- `MCPConfigSchema`: Zod schema for plugin configuration
- `MCPTransportConfigSchema`: Zod schema for transport configuration

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
  transports: z.record(z.string(), z.looseObject({type: z.string()}))
}).optional()
```

#### MCPTransportConfigSchema

```typescript
z.discriminatedUnion("type", [
  z.object({type: z.literal("stdio")}).passthrough(),
  z.object({type: z.literal("sse"), url: z.string()}).passthrough(),
  z.object({type: z.literal("http"), url: z.string()}).passthrough(),
]);
```

## How It Works

1. The plugin installs itself into the TokenRing application
2. For each configured transport, it creates an appropriate MCP client transport
3. It connects to the MCP server and retrieves available tools
4. Each tool is registered with the TokenRing chat service using the format `{serverName}/{toolName}`
5. Registered tools become available to TokenRing agents for use

## Package Information

- **Name**: `@tokenring-ai/mcp`
- **Version**: `0.1.0`
- **License**: MIT
- **Type**: Module

## License

MIT - Copyright (c) 2025 Mark Dierolf