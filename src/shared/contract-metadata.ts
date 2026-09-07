export const CONTRACT_SCHEMA_VERSION = 1

export interface ContractMetadata {
  gameId: string
  revision: number
  schemaVersion: number
}
