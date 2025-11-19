# @tokenring-ai/mcp

MCP (Model Context Protocol) client integration for the TokenRing ecosystem.

## Overview

This package provides MCP client functionality to connect TokenRing agents with MCP servers, enabling access to external
tools and resources through the Model Context Protocol.

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

## Future Ideas (Brainstorm)

- **Enhanced Transport Options**: Add TLS support, custom headers, and authentication for HTTP/SSE transports.
- **Dynamic Tool Discovery**: Implement hot‑reloading of tools when the MCP server updates its capabilities.
- **Tool Versioning & Namespacing**: Allow multiple versions of the same tool to coexist, with versioned registration
  keys.
- **Metrics & Observability**: Export Prometheus metrics (e.g., tool call latency, error rates) and integrate with
  existing monitoring.
- **Health Checks & Auto‑Reconnect**: Periodic health probes for MCP servers with automatic reconnection logic.
- **Caching Layer**: Cache tool definitions and results to reduce latency for frequently used tools.
- **Declarative Configuration**: Support a JSON/YAML config file to declare multiple MCP servers and their transports.
- **Integration with TokenRing Agent Extensions**: Provide hooks for agents to customize tool execution (e.g.,
  pre‑processing, post‑processing).
- **CLI Utility**: A command‑line tool to list, test, and manage registered MCP tools.
- **Comprehensive Documentation**: Expanded guides, API reference, and example projects for each transport type.

## License

MIT
