export function getAgentConnectionPrompt(origin = 'http://127.0.0.1:5573'): string {
  return `Open Pinnoco at ${origin}. Use the WebMCP prompt pinnoco_start_game.`
}
