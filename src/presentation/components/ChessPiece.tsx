import type { PieceColor, PieceKind } from '../../domains/game/game.types'

interface ChessPieceProps {
  color: PieceColor
  kind: PieceKind
}

const paths: Record<PieceKind, string> = {
  pawn: 'M32 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 16c0-3 3-6 8-6s8 3 8 6c0 4-2 7-5 10 0 5 3 9 7 12v3H22v-3c4-3 7-7 7-12-3-3-5-6-5-10Z',
  rook: 'M18 10h8v6h4v-6h4v6h4v-6h8v12h-5l3 29H21l3-29h-6Zm1 44h26v4H19Z',
  knight: 'M19 55h29v4H19Zm4-4c2-8 6-12 13-17l-4-5c-2-3-2-8 1-13l4-6 4 7 8 2-3 5 5 6c2 3 1 9-3 13-4 4-7 6-9 8H23Z',
  bishop: 'M32 7c-5 4-8 10-8 16 0 6 3 10 7 14l-5 12h12l-5-12c4-4 7-8 7-14 0-6-3-12-8-16Zm-2 7 6 8-7 8m-9 17h24v4H19Zm-3 9h32v5H16Z',
  queen: 'M17 13l8 9 7-14 7 14 8-9-4 30H21Zm3 35h24v4H20Zm-4 8h32v4H16Z',
  king: 'M29 7h6v8h7v5h-7v7c5 3 8 8 8 14 0 4-2 7-5 10h8v5H18v-5h8c-3-3-5-6-5-10 0-6 3-11 8-14v-7h-7v-5h7Zm3 31c-4 2-6 5-6 9s2 7 6 10c4-3 6-6 6-10s-2-7-6-9Z',
}

export function ChessPiece({ color, kind }: ChessPieceProps) {
  return (
    <svg aria-hidden="true" className={`piece-art piece-glyph piece-${color}`} focusable="false" viewBox="0 0 64 64">
      <path d={paths[kind]} fill="currentColor" stroke="var(--piece-stroke, currentColor)" strokeLinejoin="round" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}
