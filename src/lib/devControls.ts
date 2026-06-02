/*
  DEV-only wrapper around leva's useControls. In development it IS leva (live tuning of the orb). In
  production it returns the schema's default values, and because leva is loaded via a DEV-only dynamic
  import, the prod build dead-code-eliminates it entirely (leva never enters the prod bundle - docs/03
  + docs/09: dev tooling must not ship). Mirrors useControls(folderName, schema, options) for the flat
  schemas the orb scene uses (no folders).
*/
type Schema = Record<string, unknown>
type Values<S> = { [K in keyof S]: S[K] extends { value: infer V } ? V : S[K] }
type LevaHook = (name: string, schema: unknown, options?: unknown) => Record<string, unknown>

// Loaded once, in dev only. The await is inside an `import.meta.env.DEV` branch, so the whole
// dynamic import (and leva) is stripped from the production build.
let levaUseControls: LevaHook | null = null
if (import.meta.env.DEV) {
  levaUseControls = (await import('leva')).useControls as unknown as LevaHook
}

function defaultsFromSchema<S extends Schema>(schema: S): Values<S> {
  const out: Record<string, unknown> = {}
  for (const key in schema) {
    const entry = schema[key] as unknown
    out[key] =
      entry !== null && typeof entry === 'object' && 'value' in (entry as object)
        ? (entry as { value: unknown }).value
        : entry
  }
  return out as Values<S>
}

export function useControls<S extends Schema>(
  name: string,
  schema: S,
  options?: Record<string, unknown>,
): Values<S> {
  if (import.meta.env.DEV && levaUseControls) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return levaUseControls(name, schema, options) as Values<S>
  }
  return defaultsFromSchema(schema)
}
