type WebMCPResult = { content: Array<{ type: 'text'; text: string }> }
type WebMCPPromptResult = { messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> }
type WebMCPResourceResult = { contents: Array<{ uri: string; mimeType?: string; text: string }> }

interface WebMCPTool {
  name: string
  title?: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean }
  execute: (input: Record<string, unknown>) => Promise<WebMCPResult> | WebMCPResult
}

interface ModelContext {
  registerTool: (tool: WebMCPTool, options?: { signal?: AbortSignal }) => Promise<void>
}

interface Document {
  modelContext?: ModelContext
}

interface Navigator {
  /** Deprecated WebMCP location used by older Chromium builds. */
  modelContext?: ModelContext
}

interface LegacyWebMCP {
  isConnected: boolean
  registerTool: (
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    execute: (input: Record<string, unknown>) => Promise<WebMCPResult> | WebMCPResult,
  ) => void
  registerPrompt: (
    name: string,
    description: string,
    args: Array<{ name: string; description?: string; required?: boolean }>,
    execute: (input: Record<string, unknown>) => Promise<WebMCPPromptResult> | WebMCPPromptResult,
  ) => void
  registerResource: (
    name: string,
    description: string,
    config: { uri?: string; uriTemplate?: string; mimeType?: string },
    provide: (uri: string) => Promise<WebMCPResourceResult> | WebMCPResourceResult,
  ) => void
}

interface Window {
  WebMCP?: new (options?: Record<string, unknown>) => LegacyWebMCP
  webMCP?: LegacyWebMCP
}
