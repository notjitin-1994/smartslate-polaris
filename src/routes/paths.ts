export const paths = {
  home: '/',
  portal: '/portal',
} as const

export type AppPath = typeof paths[keyof typeof paths]


