export function loadEnvironment(mode: string, root?: string, inherited?: Record<string, string | undefined>): Record<string, string>
export function resolveEnvironment(mode: string): 'local' | 'test' | 'production'
