import type { AgentPort } from '../../ports/agent.port'
import type { AgentTool } from './capability.types'

export class NativeWebMcpAdapter implements AgentPort {
  private controller: AbortController | null = null

  constructor(private readonly tools: AgentTool[]) {}

  start(): void {
    if (this.controller) return
    const context = document.modelContext ?? navigator.modelContext
    if (!context) {
      document.documentElement.dataset.webmcpStatus = window.WebMCP ? 'bridge-ready' : 'unavailable'
      return
    }

    this.controller = new AbortController()
    document.documentElement.dataset.webmcpStatus = 'registering'
    Promise.all(this.tools.map((tool) => context.registerTool(tool, { signal: this.controller?.signal })))
      .then(() => { document.documentElement.dataset.webmcpStatus = 'registered' })
      .catch((error: unknown) => {
        if (this.controller?.signal.aborted) return
        document.documentElement.dataset.webmcpStatus = 'failed'
        document.documentElement.dataset.webmcpError = error instanceof Error ? error.name : 'RegistrationError'
      })
  }

  stop(): void {
    this.controller?.abort()
    this.controller = null
    delete document.documentElement.dataset.webmcpError
    delete document.documentElement.dataset.webmcpStatus
  }
}
