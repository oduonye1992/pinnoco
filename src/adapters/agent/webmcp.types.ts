import type { AgentPromptResult, AgentResourceResult, AgentToolResult } from './capability.types'

export interface LegacyWebMCP {
  availablePrompts?: Map<string, unknown>
  availableResources?: Map<string, unknown>
  availableTools?: Map<string, unknown>
  isConnected: boolean
  registerPrompt(
    name: string,
    description: string,
    args: Array<{ description?: string; name: string; required?: boolean }>,
    execute: (input: Record<string, unknown>) => Promise<AgentPromptResult> | AgentPromptResult,
  ): void
  registerResource(
    name: string,
    description: string,
    config: { mimeType?: string; uri?: string; uriTemplate?: string },
    provide: (uri: string) => Promise<AgentResourceResult> | AgentResourceResult,
  ): void
  registerTool(
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    execute: (input: Record<string, unknown>) => Promise<AgentToolResult> | AgentToolResult,
  ): void
}

export interface NativeModelContext {
  registerTool(tool: {
    annotations?: { readOnlyHint?: boolean }
    description: string
    execute: (input: Record<string, unknown>) => Promise<AgentToolResult> | AgentToolResult
    inputSchema: Record<string, unknown>
    name: string
    title?: string
  }, options?: { signal?: AbortSignal }): Promise<void>
}
