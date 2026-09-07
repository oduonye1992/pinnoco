export type IdFactory = (prefix: string) => string

export const createId: IdFactory = (prefix) => {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return `${prefix}-${value}`
}
