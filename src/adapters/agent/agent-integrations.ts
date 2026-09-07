import type { AgentPort } from '../../ports/agent.port'

export class AgentIntegrations implements AgentPort {
  constructor(private readonly adapters: AgentPort[]) {}

  start(): void {
    this.adapters.forEach((adapter) => adapter.start())
  }

  stop(): void {
    [...this.adapters].reverse().forEach((adapter) => adapter.stop())
  }
}
