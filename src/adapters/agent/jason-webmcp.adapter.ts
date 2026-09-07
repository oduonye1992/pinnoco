import type { AgentPort } from '../../ports/agent.port'
import type { AgentPrompt, AgentResource, AgentTool } from './capability.types'
import type { LegacyWebMCP } from './webmcp.types'

export class JasonWebMcpAdapter implements AgentPort {
  private context: LegacyWebMCP | null = null
  private registeredNames = { prompts: [] as string[], resources: [] as string[], tools: [] as string[] }
  private started = false

  constructor(
    private readonly prompts: AgentPrompt[],
    private readonly resources: AgentResource[],
    private readonly tools: AgentTool[],
  ) {}

  start(): void {
    if (this.started) return
    this.started = true

    const LegacyWebMCP = window.WebMCP
    if (!LegacyWebMCP) {
      document.documentElement.dataset.webmcpBridge = 'unavailable'
      return
    }

    this.context = window.webMCP ?? new LegacyWebMCP({ color: '#e4ad4f', padding: '16px', size: '30px' })
    window.webMCP = this.context

    this.prompts.forEach((prompt) => {
      this.context?.registerPrompt(prompt.name, prompt.description, prompt.args, prompt.execute)
      this.registeredNames.prompts.push(prompt.name)
    })
    this.resources.forEach((resource) => {
      this.context?.registerResource(
        resource.name,
        resource.description,
        { mimeType: resource.mimeType, uri: resource.uri },
        resource.provide,
      )
      this.registeredNames.resources.push(resource.name)
    })
    this.tools.forEach((tool) => {
      this.context?.registerTool(tool.name, tool.description, tool.inputSchema, tool.execute)
      this.registeredNames.tools.push(tool.name)
    })

    document.documentElement.dataset.webmcpBridge = this.context.isConnected ? 'connected' : 'ready'
  }

  stop(): void {
    if (!this.started) return
    // The bridge has no unregister API; deleting only our names makes HMR idempotent.
    this.registeredNames.prompts.forEach((name) => this.context?.availablePrompts?.delete(name))
    this.registeredNames.resources.forEach((name) => this.context?.availableResources?.delete(name))
    this.registeredNames.tools.forEach((name) => this.context?.availableTools?.delete(name))
    this.registeredNames = { prompts: [], resources: [], tools: [] }
    this.context = null
    this.started = false
    delete document.documentElement.dataset.webmcpBridge
  }
}
