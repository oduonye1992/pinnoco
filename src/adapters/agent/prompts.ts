import { getAgentGuide } from '../../application/queries/get-agent-guide'
import { getAgentStartPrompt } from '../../application/queries/get-agent-start-prompt'
import type { AgentPrompt } from './capability.types'

export function createPrompts(): AgentPrompt[] {
  const guide = getAgentGuide()
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined

  return [{
    args: [],
    description: 'Start Pinnoco with the player, choose a chess topic, and set the live board.',
    execute: async () => ({
      messages: [{
        content: {
          text: `${getAgentStartPrompt(origin)} When it is my turn, use pinnoco_wait_for_human_move with the latest revision and retry after a timeout. When it is your turn, ask before using pinnoco_play_move. Follow this guide: ${JSON.stringify(guide)}`,
          type: 'text',
        },
        role: 'user',
      }],
    }),
    name: 'pinnoco_start_game',
  }]
}
