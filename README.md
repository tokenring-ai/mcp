# @tokenring-ai/mcp

MCP (Model Context Protocol) client integration for the TokenRing ecosystem.

## Overview

This package provides MCP client functionality to connect TokenRing agents with MCP servers, enabling access to external tools and resources through the Model Context Protocol.

## Features

- **Multiple transport types**: Support for stdio, SSE, and HTTP transports
- **Automatic tool registration**: MCP server tools are automatically registered with TokenRing agents
- **Seamless integration**: Works with existing TokenRing agent architecture

## Usage

### Basic Setup

```typescript
import { MCPService } from '@tokenring-ai/mcp';
import { AgentTeam } from '@tokenring-ai/agent';

const mcpService = new MCPService();
const team = new AgentTeam();

// Register an MCP server with stdio transport
await mcpService.register('myserver', {
  type: 'stdio',
  command: 'node',
  args: ['path/to/mcp-server.js']
}, team);
```

### Transport Types

#### Stdio Transport
```typescript
{
  type: 'stdio',
  command: 'node',
  args: ['server.js']
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

### MCPService

#### `register(name: string, config: MCPTransportConfig, team: AgentTeam): Promise<void>`

Registers an MCP server with the TokenRing agent team.

- `name`: Unique identifier for the MCP server
- `config`: Transport configuration object
- `team`: AgentTeam instance to register tools with

## License

MIT
