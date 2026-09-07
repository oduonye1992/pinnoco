import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const packageRoot = resolve(projectRoot, 'node_modules/stockfish.js')
const publicRoot = resolve(projectRoot, 'public/stockfish')

mkdirSync(publicRoot, { recursive: true })

for (const file of ['Copying.txt', 'stockfish.wasm', 'stockfish.wasm.js']) {
  copyFileSync(resolve(packageRoot, file), resolve(publicRoot, file))
}

console.log('Stockfish assets synchronized.')
