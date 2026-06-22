declare const __VERSION__: string | undefined

export const VERSION: string = typeof __VERSION__ !== 'undefined'
  ? __VERSION__
  : process.env.npm_package_version ?? '0.0.0-dev'
