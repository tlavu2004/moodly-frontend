import type { ReactNode, SVGProps } from 'react'

export type IconName = 'arrow-right' | 'calendar' | 'chart' | 'check' | 'home' | 'leaf' | 'plus' | 'search' | 'sparkles' | 'user'

const paths: Record<IconName, ReactNode> = {
  'arrow-right': <path d="m9 18 6-6-6-6m6 6H3" />,
  calendar: <path d="M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  chart: <path d="M4 19V9m6 10V5m6 14v-7m5 7H2" />,
  check: <path d="m5 12 4 4L19 6" />,
  home: <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />,
  leaf: <path d="M20 4c-7 0-13 3-13 10 0 2 1 4 3 5 0-6 4-10 8-12-4 3-7 7-7 13 7 0 11-5 9-16Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
  sparkles: <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3ZM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Zm14-1 .9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13Z" />,
  user: <path d="M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
}

type IconProps = SVGProps<SVGSVGElement> & { name: IconName }

export function Icon({ name, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
