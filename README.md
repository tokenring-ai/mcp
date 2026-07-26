# @tokenring-ai/mcp

## Overview

MCP (Model Context Protocol) client integration for the TokenRing ecosystem. This package provides MCP client
functionality to connect TokenRing agents with MCP servers, enabling access to external tools and resources through the
Model Context Protocol. It serves as a TokenRing plugin that automatically registers MCP server tools with the chat
service.

## Key Features

- **Multiple Transport Types**: Support for stdio, SSE (Server-Sent Events), and streamable HTTP transports
- **Automatic Tool Registration**: MCP server tools are automatically registered with TokenRing chat service
- **Seamless Integration**: Works with existing TokenRing agent architecture and plugin system
- **Plugin-Based Architecture**: Integrates as a TokenRing plugin with automatic service registration
- **Zod Schema Validation**: Comprehensive configuration validation with detailed error messages
- **Type-Safe Configuration**: Strong typing for all configuration options using TypeScript and Zod
- **Tool Display Names**: Tools are registered with display names for improved readability in UI

## Installation

```bash
bun install @tokenring-ai/mcp
```

## Dependencies

This package depends on:

- **@tokenring-ai/app**: Core TokenRing application framework
- **@tokenring-ai/chat**: Chat service for tool registration
- **@ai-sdk/mcp**: AI SDK integration for MCP protocol
- **@modelcontextprotocol/sdk**: Official MCP SDK implementation
- **zod**: Schema validation library

## Chat Commands

This package does not define chat commands.

## Tools

This package does not define static tools. Instead, it dynamically registers tools from connected MCP servers. When an
MCP server is registered, all of its tools are automatically registered with the chat service using the naming convention
`{server-name}/{tool-name}`.

## Configuration

### Plugin Configuration

Configure the MCP package in your TokenRing application:

```yaml
mcp:
  transports:
    myserver:
      type: stdio
      command: mcp-server
    remoteserver:
      type: sse
      url: http://localhost:3000/sse
    apiserver:
      type: http
      url: http://localhost:3001/api/mcp
```

### Configuration Schema

#### MCPConfigSchema

The top-level configuration schema for the MCP plugin. Exports from `index.ts`.

```typescript
export const MCPConfigSchema = z
  .object({
    transports: z
      .record(z.string(), MCPTransportConfigSchema)
      .meta({ description: "MCP servers to connect to, keyed by name. Changes require a restart.", restartRequired: true }),
  })
  .meta({ label: "MCP", description: "Model Context Protocol server connections" })
  .exactOptional();
```

**Fields:**

| Field        | Type                                         | Description                                         |
|--------------|-----------------------------------------------|-----------------------------------------------------|
| transports   | Record<string, MCPTransportConfigSchema>      | MCP servers to connect to, keyed by name            |

**Notes:**

- Uses `.exactOptional()` to allow the config to be omitted entirely
- The `transports` field requires a restart when changed
- Each transport is keyed by a user-defined server name

#### MCPTransportConfigSchema

Discriminated union schema for transport configurations. Exports from `MCPService.ts`.

```typescript
export const MCPTransportConfigSchema = z.discriminatedUnion("type", [
  z.looseObject({
    type: z.literal("stdio"),
    command: z.string().meta({ description: "Executable launched to run the MCP server over stdio" }),
  }),
  z.object({ type: z.literal("sse"), url: z.url().meta({ description: "SSE endpoint URL of the MCP server" }) }),
  z.object({ type: z.literal("http"), url: z.url().meta({ description: "Streamable-HTTP endpoint URL of the MCP server" }) }),
]);
```

**Transport Types:**

| Type   | Required Fields | Description                                  |
|--------|-----------------|----------------------------------------------|
| stdio  | command         | Execute an MCP server as a child process     |
| sse    | url             | Connect via Server-Sent Events               |
| http   | url             | Connect via streamable HTTP                  |

**Notes:**

- The stdio variant uses `z.looseObject`, which allows additional properties (e.g., `args`, `env`, `cwd`)
- The sse and http variants use `z.object`, which defines only the required fields
- All transport types are discriminated on the `type` field

### Example Configurations

#### Minimal Configuration

```yaml
mcp:
  transports:
    my-server:
      type: stdio
      command: mcp-server
```

#### Complete Configuration

```yaml
mcp:
  transports:
    local-server:
      type: stdio
      command: local-mcp-server
      args:
        - --config
        - config.json
      env:
        DEBUG: "true"
      cwd: /path/to/server
    remote-server:
      type: sse
      url: http://localhost:3000/sse
    api-server:
      type: http
      url: http://localhost:3001/api/mcp
```

## Core Components

### MCPService

The main service class for MCP server registration and management. Implements `TokenRingService`.

**Location:** `MCPService.ts`

#### Properties

| Property      | Type   | Value                                                        |
|---------------|--------|--------------------------------------------------------------|
| name          | string | `"MCPService"`                                               |
| description   | string | `"Service for MCP (Model Context Protocol) servers"`         |

#### Methods

##### register

```typescript
async register(name: string, config: MCPTransportConfig, app: TokenRingApp): Promise<void>
```

Registers an MCP server with the TokenRing application. Creates a transport connection, retrieves available tools from
the MCP server, and registers each tool with the chat service.

**Parameters:**

| Parameter | Type            | Description                              |
|-----------|-----------------|------------------------------------------|
| name      | string          | Unique identifier for the MCP server     |
| config    | MCPTransportConfig | Transport configuration object        |
| app       | TokenRingApp    | TokenRing application instance           |

**Returns:** `Promise<void>` -- resolves when server is connected and tools are registered

**Throws:**

- `Error` -- when transport type is unknown
- Errors propagated from MCP client creation or tool retrieval failures

**Tool Registration Behavior:**

Each tool from the MCP server is registered with the chat service using:

- **name**: `{server-name}/{tool-name}` (e.g., `weather/get_forecast`)
- **displayName**: `{tool-name}` (e.g., `get_forecast`)
- **inputSchema**: Preserved from the MCP tool definition
- **execute**: Bound to the MCP client
- **description**: Preserved from the MCP tool definition (when present)

### Plugin Definition

**Location:** `plugin.ts`

The plugin integrates with the TokenRing plugin system:

#### install

Creates the `MCPService` instance and adds it to the application services when `config.mcp` is present.

```typescript
install(app, config) {
  if (config.mcp) {
    const mcpService = new MCPService();
    app.addServices(mcpService);
  }
}
```

#### start

Iterates through configured transports and registers each MCP server.

```typescript
async start(app, config) {
  if (config.mcp) {
    for (const [name, transportConfig] of Object.entries(config.mcp.transports)) {
      await app.requireService(MCPService).register(name, transportConfig, app);
    }
  }
}
```

#### configSchema

```typescript
const packageConfigSchema = z.object({
  mcp: MCPConfigSchema.exactOptional(),
});
```

## Exports

| Export              | Location        | Description                              |
|---------------------|-----------------|------------------------------------------|
| MCPConfigSchema     | index.ts        | Top-level MCP plugin configuration schema |
| MCPService          | index.ts        | Core service for MCP server management   |
| MCPTransportConfigSchema | MCPService.ts | Transport configuration schema          |
| MCPTransportConfig  | MCPService.ts   | TypeScript type for transport config     |

## Testing

The package includes comprehensive tests covering configuration validation, transport handling, tool registration, error
scenarios, and integration with TokenRing services.

### Test Files

| File                      | Description                                    |
|---------------------------|------------------------------------------------|
| MCPService.test.ts        | Unit tests for MCPService                      |
| configuration.test.ts     | Configuration schema validation tests          |
| integration.test.ts       | Integration tests with TokenRing services      |

### Running Tests

```bash
bun run test
```

Watch mode:

```bash
bun run test:watch
```

Coverage:

```bash
bun run test:coverage
```

## License

MIT License - see LICENSE file for details.
