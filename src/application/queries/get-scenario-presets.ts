export type ScenarioTopic = 'endgame' | 'middlegame' | 'opening'

export interface ScenarioPreset {
  fen: string
  title: string
  topic: ScenarioTopic
}

const presets: Record<ScenarioTopic, ScenarioPreset> = {
  endgame: {
    fen: '8/8/8/3k4/8/2K5/8/4R3 w - - 0 1',
    title: 'Endgame',
    topic: 'endgame',
  },
  middlegame: {
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/3P4/2P1PN2/PP1NBPPP/R1BQ1RK1 w - - 4 6',
    title: 'Middlegame',
    topic: 'middlegame',
  },
  opening: {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    title: 'Opening practice',
    topic: 'opening',
  },
}

export function getScenarioPreset(topic: ScenarioTopic): ScenarioPreset {
  return presets[topic]
}
