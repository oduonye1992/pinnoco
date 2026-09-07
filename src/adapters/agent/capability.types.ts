export interface AgentContent {
  text: string
  type: 'text'
}

export interface AgentPrompt {
  args: Array<{ description?: string; name: string; required?: boolean }>
  description: string
  execute: (input: Record<string, unknown>) => Promise<AgentPromptResult> | AgentPromptResult
  name: string
}

export interface AgentPromptResult {
  messages: Array<{ content: AgentContent; role: 'assistant' | 'user' }>
}

export interface AgentResource {
  description: string
  mimeType: string
  name: string
  provide: (uri: string) => Promise<AgentResourceResult> | AgentResourceResult
  uri: string
}

export interface AgentResourceResult {
  contents: Array<{ mimeType?: string; text: string; uri: string }>
}

export interface AgentTool {
  annotations?: { readOnlyHint?: boolean }
  description: string
  execute: (input: Record<string, unknown>) => Promise<AgentToolResult> | AgentToolResult
  inputSchema: Record<string, unknown>
  name: string
  title: string
}

export interface AgentToolResult {
  content: AgentContent[]
  isError?: boolean
}
