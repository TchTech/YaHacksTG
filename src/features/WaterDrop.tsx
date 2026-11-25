import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

type Surface = 'preview' | '3d' | 'fallback'
type CreateRenderer = typeof import('./waterDropRenderer').createWaterDrop

export function WaterDrop() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [surface, setSurface] = useState<Surface>(typeof WebGL2RenderingContext === 'undefined' ? 'fallback' : 'preview')
  const target = useRef({ yaw: 0, pitch: 0 })
  const drag = useRef<{ id: number; x: number; y: number; yaw: number; pitch: number; intent?: 'rotate' | 'navigate' } | null>(null)
  const wake = useRef<() => void>(() => {})

  useEffect(() => {
    const element = canvas.current
    if (!element || typeof WebGL2RenderingContext === 'undefined') return
    let active = true
    let create: CreateRenderer | undefined
    let renderer: ReturnType<CreateRenderer>
    let frame = 0
    let loading = false
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function schedule() {
      if (renderer && !frame) frame = requestAnimationFrame(paint)
    }

    function paint() {
      frame = 0
      const { yaw, pitch } = target.current
      renderer?.draw(yaw, pitch, motion.matches ? 0 : Math.sin(yaw + pitch * .4) * .76)
    }

    function start() {
      if (!active || !element || !create) return
      try {
        renderer = create(element)
        if (renderer) {
          paint()
          setSurface('3d')
          return
        }
      } catch {
        renderer?.dispose()
        renderer = undefined
      }
      setSurface('fallback')
    }

    function lose(event: Event) {
      event.preventDefault()
      cancelAnimationFrame(frame)
      frame = 0
      renderer?.dispose()
      renderer = undefined
      setSurface('fallback')
    }

    wake.current = () => {
      if (renderer) {
        schedule()
      } else if (!loading) {
        loading = true
        void import('./waterDropRenderer').then(module => {
          create = module.createWaterDrop
          start()
        }, () => { if (active) setSurface('fallback') })
      }
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    motion.addEventListener('change', schedule)
    element.addEventListener('webglcontextlost', lose)
    element.addEventListener('webglcontextrestored', start)
    return () => {
      active = false
      cancelAnimationFrame(frame)
      resize.disconnect()
      motion.removeEventListener('change', schedule)
      element.removeEventListener('webglcontextlost', lose)
      element.removeEventListener('webglcontextrestored', start)
      renderer?.dispose(true)
    }
  }, [])

  function turn(yaw: number, pitch: number) {
    target.current = { yaw, pitch: Math.max(-1.15, Math.min(1.15, pitch)) }
    wake.current()
  }

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ...target.current }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current
    if (gesture?.id !== event.pointerId) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.intent) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return
      gesture.intent = dy > 0 && dy >= Math.abs(dx) * .9 ? 'navigate' : 'rotate'
    }
    if (gesture.intent !== 'rotate') return
    if (dy > 0 && dy >= Math.abs(dx)) return
    turn(gesture.yaw + dx * .012, gesture.pitch + dy * .01)
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) drag.current = null
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const { yaw, pitch } = target.current
    switch (event.key) {
      case 'ArrowLeft': turn(yaw - .28, pitch); break
      case 'ArrowRight': turn(yaw + .28, pitch); break
      case 'ArrowUp': turn(yaw, pitch - .24); break
      case 'ArrowDown': turn(yaw, pitch + .24); break
      default: return
    }
    event.preventDefault()
  }

  return <>
    <div className="home-backdrop" aria-hidden="true">
      <div className="home-drop" data-renderer={surface}><canvas ref={canvas} /></div>
    </div>
    {surface !== 'fallback' && <div className="drop-control" role="group" tabIndex={0} data-swipe-only="down"
      aria-label="Трёхмерная капля" aria-description="Используйте стрелки, чтобы менять ракурс."
      onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onKeyDown={key} />}
  </>
}
