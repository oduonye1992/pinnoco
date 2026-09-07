import type { LegacyWebMCP, NativeModelContext } from './webmcp.types'

declare global {
  interface Document {
    modelContext?: NativeModelContext
  }

  interface Navigator {
    /** Deprecated location used by older Chromium experiments. */
    modelContext?: NativeModelContext
  }

  interface Window {
    WebMCP?: new (options?: Record<string, unknown>) => LegacyWebMCP
    webMCP?: LegacyWebMCP
  }
}

export {}
