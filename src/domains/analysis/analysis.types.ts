import type { PositionNode } from '../game/game.types'

export interface AnalysisWorkspace {
  id: string
  sourceGameNodeId: string
  sourceMoveNumber: number
  title: string
  tree: ScenarioTree
}

export interface ScenarioTree {
  currentNodeId: string
  nodes: Record<string, PositionNode>
  rootNodeId: string
}
