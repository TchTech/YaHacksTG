import { useEffect, useRef, type PointerEvent, type ReactNode, type WheelEvent } from 'react'

export type Direction = 'left' | 'right' | 'up' | 'down'
export type SwipeActions = Partial<Record<Direction, () => void>>

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

export function SwipeZone({ actions, children, className = '', trackMotion = false }: {
  actions: SwipeActions
  children: ReactNode
  className?: string
  trackMotion?: boolean
}) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const wheel = useRef<{ x: number; y: number; timer: number } | null>(null)

  useEffect(() => () => window.clearTimeout(wheel.current?.timer), [])

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    const target = event.target as Element
    if (target.closest('input, select, textarea, label, a')) return
    if (wheel.current) {
      window.clearTimeout(wheel.current.timer)
      wheel.current = null
      resetMotion(event.currentTarget)
    }
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    const captureTarget = target.closest('button') ?? event.currentTarget
    captureTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const point = start.current
    if (point?.id !== event.pointerId) return
    const dx = event.clientX - point.x
    const dy = event.clientY - point.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) {
      resetMotion(event.currentTarget)
      return
    }
    const horizontal = Math.abs(dx) > Math.abs(dy)
    setMotion(event.currentTarget, 'pointer', horizontal ? dx : 0, horizontal ? 0 : dy)
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
    const timer = window.setTimeout(() => {
      wheel.current = null
      resetMotion(zone)
    }, 160)
    wheel.current = { ...offset, timer }
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const point = start.current
    if (point?.id !== event.pointerId) return
    cancel(event)
    const dx = event.clientX - point.x
    const dy = event.clientY - point.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 56) return
    suppressClick.current = true
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
    actions[direction]?.()
  }

  function cancel(event: PointerEvent<HTMLDivElement>) {
    if (start.current?.id !== event.pointerId) return
    start.current = null
    if (trackMotion) resetMotion(event.currentTarget)
  }

  return <div className={`swipe-zone ${actions.up || actions.down ? 'swipe-vertical' : ''} ${className}`}
    onPointerDown={begin} onPointerMove={trackMotion ? move : undefined} onWheel={trackMotion ? scroll : undefined}
    onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel}
    onClickCapture={event => {
      if (!suppressClick.current || event.detail === 0) return
      event.preventDefault()
      event.stopPropagation()
    }}>
    {children}
  </div>
}
