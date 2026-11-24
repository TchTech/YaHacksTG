type WebApp = {
  initData: string
  platform: string
  ready(): void
  expand(): void
  isVersionAtLeast?(version: string): boolean
  isVerticalSwipesEnabled?: boolean
  disableVerticalSwipes?(): void
  enableVerticalSwipes?(): void
  BackButton?: {
    show(): void
    hide(): void
    onClick(handler: () => void): void
    offClick(handler: () => void): void
  }
}

export function getWebApp() {
  const app = (window as Window & { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp
  return app && (app.initData || app.platform !== 'unknown') ? app : undefined
}

export function setupWebApp(app?: WebApp) {
  if (!app) return
  app.ready()
  app.expand()
  if (!app.isVersionAtLeast?.('7.7') || app.isVerticalSwipesEnabled === false || !app.disableVerticalSwipes) return
  app.disableVerticalSwipes()
  return () => app.enableVerticalSwipes?.()
}

export function bindBackButton(app: WebApp | undefined, back?: () => void) {
  const button = app?.BackButton
  if (!button || !app?.isVersionAtLeast?.('6.1')) return
  if (!back) {
    button.hide()
    return
  }
  button.onClick(back)
  button.show()
  return () => {
    button.offClick(back)
    button.hide()
  }
}
