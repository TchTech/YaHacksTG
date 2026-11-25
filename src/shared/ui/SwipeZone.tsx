import { useEffect, useRef, type PointerEvent, type ReactNode, type TouchEvent, type WheelEvent } from 'react'

export type Direction = 'left' | 'right' | 'up' | 'down'
export type SwipeActions = Partial<Record<Direction, () => void>>

function swipeDirection(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

function setMotion(zone: HTMLDivElement, source: 'pointer' | 'wheel', dx: number, dy: number) {
  const x = Math.max(-180, Math.min(180, dx))
  const y = Math.max(-150, Math.min(150, dy))
  zone.dataset.motion = source
  zone.style.setProperty('--motion-x', `${x}px`)
  zone.style.setProperty('--motion-y', `${y}px`)
  return { x, y }
}

function resetMotion(zone: HTMLDivElement) {
  delete zone.dataset.motion
  zone.style.removeProperty('--motion-x')
  zone.style.removeProperty('--motion-y')
}

export function SwipeZone({ actions, children, className = '', trackMotion = false, downThreshold = 56, wheelDown = false, touchSwipe = false }: {
  actions: SwipeActions
  children: ReactNode
  className?: string
  trackMotion?: boolean
  downThreshold?: number
  wheelDown?: boolean
  touchSwipe?: boolean
}) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const start = useRef<{ source: 'pointer' | 'touch'; id: number; x: number; y: number; only: string | null } | null>(null)
  const suppressClick = useRef(false)
  const wheel = useRef<{ x: number; y: number; totalX: number; totalY: number; timer: number } | null>(null)

  useEffect(() => () => window.clearTimeout(wheel.current?.timer), [])
  useEffect(() => {
    const zone = zoneRef.current
    if (!touchSwipe || !zone) return
    function keepTouch(event: globalThis.TouchEvent) {
      if (start.current?.source === 'touch' && event.touches.length === 1 && event.cancelable) event.preventDefault()
    }
    zone.addEventListener('touchmove', keepTouch, { passive: false })
    return () => zone.removeEventListener('touchmove', keepTouch)
  }, [touchSwipe])

  function begin(zone: HTMLDivElement, target: Element, point: Omit<NonNullable<typeof start.current>, 'only'>) {
    suppressClick.current = false
    if (target.closest('input, select, textarea, label, a, [data-swipe-ignore]')) return false
    if (wheel.current) {
      window.clearTimeout(wheel.current.timer)
      wheel.current = null
      resetMotion(zone)
    }
    const nestedControl = target.closest('[data-swipe-only]')
    start.current = { ...point, only: nestedControl?.getAttribute('data-swipe-only') ?? null }
    return nestedControl ?? target.closest('button') ?? zone
  }

  function move(zone: HTMLDivElement, source: 'pointer' | 'touch', id: number, x: number, y: number) {
    const point = start.current
    if (!trackMotion || point?.source !== source || point.id !== id) return
    const dx = x - point.x
    const dy = y - point.y
    const direction = swipeDirection(dx, dy)
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 8 || (point.only && point.only !== direction)) {
      resetMotion(zone)
      return
    }
    const horizontal = Math.abs(dx) > Math.abs(dy)
    setMotion(zone, 'pointer', horizontal ? dx : 0, horizontal ? 0 : dy)
  }

  function scroll(event: WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey || start.current) return
    const zone = event.currentTarget
    const mode = event.deltaMode
    const dx = event.deltaX * (mode === 2 ? zone.clientWidth : mode === 1 ? 16 : 1)
    const dy = event.deltaY * (mode === 2 ? zone.clientHeight : mode === 1 ? 16 : 1)
    if (!dx && !dy) return
    const previous = wheel.current
    window.clearTimeout(previous?.timer)
    const offset = setMotion(zone, 'wheel', (previous?.x ?? 0) * .75 - dx, (previous?.y ?? 0) * .75 - dy)
    const totalX = (previous?.totalX ?? 0) + dx
    const totalY = (previous?.totalY ?? 0) + dy
    const timer = window.setTimeout(() => {
      wheel.current = null
      resetMotion(zone)
      const page = document.scrollingElement
      if (wheelDown && page && page.scrollHeight <= page.clientHeight + 1 && totalY >= 48 && totalY > Math.abs(totalX)) actions.down?.()
    }, 160)
    wheel.current = { ...offset, totalX, totalY, timer }
  }

  function finish(zone: HTMLDivElement, source: 'pointer' | 'touch', id: number, x: number, y: number) {
    const point = start.current
    if (point?.source !== source || point.id !== id) return
    cancel(zone)
    const dx = x - point.x
    const dy = y - point.y
    const direction = swipeDirection(dx, dy)
    if (point.only && point.only !== direction) return
    const threshold = direction === 'down' ? downThreshold : 56
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return
    suppressClick.current = true
    actions[direction]?.()
  }

  function cancel(zone: HTMLDivElement) {
    start.current = null
    if (trackMotion) resetMotion(zone)
  }

  function beginPointer(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || start.current?.source === 'touch') return
    const captureTarget = begin(event.currentTarget, event.target as Element, { source: 'pointer', id: event.pointerId, x: event.clientX, y: event.clientY })
    if (captureTarget && !captureTarget.hasPointerCapture(event.pointerId)) captureTarget.setPointerCapture(event.pointerId)
  }

  function cancelPointer(event: PointerEvent<HTMLDivElement>) {
    if (start.current?.source === 'pointer' && start.current.id === event.pointerId) cancel(event.currentTarget)
  }

  function beginTouch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) {
      if (start.current?.source === 'touch') cancel(event.currentTarget)
      return
    }
    const touch = event.changedTouches[0]
    if (touch) begin(event.currentTarget, event.target as Element, { source: 'touch', id: touch.identifier, x: touch.clientX, y: touch.clientY })
  }

  return <div ref={zoneRef} className={`swipe-zone ${actions.up || actions.down ? 'swipe-vertical' : ''} ${className}`}
    onPointerDown={beginPointer} onWheel={trackMotion ? scroll : undefined}
    onPointerMove={trackMotion ? event => move(event.currentTarget, 'pointer', event.pointerId, event.clientX, event.clientY) : undefined}
    onPointerUp={event => finish(event.currentTarget, 'pointer', event.pointerId, event.clientX, event.clientY)}
    onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer}
    onTouchStart={touchSwipe ? beginTouch : undefined}
    onTouchMove={touchSwipe ? event => {
      const touch = event.changedTouches[0]
      if (touch) move(event.currentTarget, 'touch', touch.identifier, touch.clientX, touch.clientY)
    } : undefined}
    onTouchEnd={touchSwipe ? event => {
      const touch = event.changedTouches[0]
      if (touch) finish(event.currentTarget, 'touch', touch.identifier, touch.clientX, touch.clientY)
    } : undefined}
    onTouchCancel={touchSwipe ? event => { if (start.current?.source === 'touch') cancel(event.currentTarget) } : undefined}
    onClickCapture={event => {
      if (!suppressClick.current || event.detail === 0) return
      event.preventDefault()
      event.stopPropagation()
    }}>
    {children}
  </div>
}
