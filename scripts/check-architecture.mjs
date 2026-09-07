import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, relative, resolve, sep } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(projectRoot, 'src')
const sourceExtensions = new Set(['.ts', '.tsx'])
const importPattern = /(?:from\s+|import\s*\()['"]([^'"]+)['"]/g

const allowedDependencies = {
  adapters: new Set(['adapters', 'application', 'domains', 'ports', 'shared']),
  app: new Set(['adapters', 'app', 'application', 'domains', 'ports', 'shared']),
  application: new Set(['application', 'domains', 'ports', 'shared']),
  domains: new Set(['domains', 'shared']),
  ports: new Set(['domains', 'ports', 'shared']),
  presentation: new Set(['application', 'domains', 'presentation', 'shared']),
  shared: new Set(['shared']),
}

const externalImportsAllowed = new Set(['adapters', 'app', 'presentation'])

function collectFiles(directory) {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = resolve(directory, name)
      return statSync(path).isDirectory() ? collectFiles(path) : [path]
    })
    .filter((path) => sourceExtensions.has(extname(path)))
    .sort()
}

function layerFor(path) {
  const [first] = relative(sourceRoot, path).split(sep)
  if (first === 'App.tsx') return 'presentation'
  return allowedDependencies[first] ? first : null
}

function importedLayer(path, specifier) {
  if (!specifier.startsWith('.')) return 'external'
  const resolved = resolve(path, '..', specifier)
  const [first] = relative(sourceRoot, resolved).split(sep)
  if (first === 'App') return 'presentation'
  return allowedDependencies[first] ? first : null
}

const violations = []

for (const path of collectFiles(sourceRoot)) {
  const sourceLayer = layerFor(path)
  if (!sourceLayer) continue

  const contents = readFileSync(path, 'utf8')
  for (const match of contents.matchAll(importPattern)) {
    const specifier = match[1]
    const targetLayer = importedLayer(path, specifier)
    if (targetLayer === 'external' && !externalImportsAllowed.has(sourceLayer)) {
      violations.push(`${relative(projectRoot, path)}: ${sourceLayer} cannot import external package "${specifier}"`)
      continue
    }
    if (targetLayer && targetLayer !== 'external' && !allowedDependencies[sourceLayer].has(targetLayer)) {
      violations.push(`${relative(projectRoot, path)}: ${sourceLayer} cannot depend on ${targetLayer} via "${specifier}"`)
    }
  }
}

if (violations.length) {
  console.error(['Architecture boundary violations:', ...violations.map((violation) => `- ${violation}`)].join('\n'))
  process.exit(1)
}

console.log('Architecture boundaries passed.')
