import type { IdFactory } from '../../shared/identifiers'
import { getPathToNode, type GameTransition } from '../game/game.model'
import type { PositionNode } from '../game/game.types'
import type { AnalysisWorkspace } from './analysis.types'

export function createAnalysisWorkspace(
  sourceFen: string,
  sourceGameNodeId: string,
  sourceMoveNumber: number,
  title: string,
  transitions: GameTransition[],
  createIdentifier: IdFactory,
): AnalysisWorkspace {
  const rootNodeId = createIdentifier('scenario-position')
  const nodes: Record<string, PositionNode> = {
    [rootNodeId]: {
      children: [],
      fen: sourceFen,
      id: rootNodeId,
      move: null,
      parentId: null,
      ply: sourceMoveNumber,
    },
  }
  let currentNodeId = rootNodeId

  for (const transition of transitions) {
    const parent = nodes[currentNodeId]
    const nodeId = createIdentifier('scenario-position')
    nodes[currentNodeId] = { ...parent, children: [...parent.children, nodeId] }
    nodes[nodeId] = {
      children: [],
      fen: transition.fen,
      id: nodeId,
      move: transition.move,
      parentId: currentNodeId,
      ply: parent.ply + 1,
    }
    currentNodeId = nodeId
  }

  return {
    id: createIdentifier('analysis'),
    sourceGameNodeId,
    sourceMoveNumber,
    title,
    tree: { currentNodeId, nodes, rootNodeId },
  }
}

export function getAnalysisPath(analysis: AnalysisWorkspace): PositionNode[] {
  return getPathToNode(analysis.tree.nodes, analysis.tree.currentNodeId)
}
