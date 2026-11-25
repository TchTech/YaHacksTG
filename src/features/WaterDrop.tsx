import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

type Surface = 'loading' | '3d' | 'fallback'
type CreateRenderer = typeof import('./waterDropRenderer').createWaterDrop

export function WaterDrop() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [surface, setSurface] = useState<Surface>('loading')
  const target = useRef({ yaw: 0, pitch: 0 })
  const drag = useRef<{ id: number; x: number; y: number; yaw: number; pitch: number } | null>(null)
  const wake = useRef<() => void>(() => {})

  useEffect(() => {
    const element = canvas.current
    if (!element || typeof WebGL2RenderingContext === 'undefined') {
      setSurface('fallback')
      return
    }
    let active = true
    let create: CreateRenderer | undefined
    let renderer: ReturnType<CreateRenderer>
    let frame = 0
    let lastPaint = -Infinity
    let yaw = 0
    let pitch = 0
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function schedule() {
      if (renderer && !frame) frame = requestAnimationFrame(paint)
    }

    function paint(now: number) {
      frame = 0
      if (!renderer) return
      const reduced = motion.matches
      const elapsed = now - lastPaint
      if (reduced || elapsed >= 30) {
        const gain = reduced ? 1 : 1 - Math.exp(-elapsed / 64)
        yaw += (target.current.yaw - yaw) * gain
        pitch += (target.current.pitch - pitch) * gain
        const lighting = reduced ? 0 : Math.sin(now / 3100) * .76 + Math.sin(now / 5500) * .24
        renderer.draw(yaw, pitch, lighting)
        lastPaint = now
      }
      if (!reduced) schedule()
    }

    function start() {
      if (!active || !element || !create) return
      try {
        renderer = create(element)
        if (renderer) {
          renderer.draw(target.current.yaw, target.current.pitch, 0)
          setSurface('3d')
          schedule()
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

    wake.current = schedule
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    motion.addEventListener('change', schedule)
    element.addEventListener('webglcontextlost', lose)
    element.addEventListener('webglcontextrestored', start)
    void import('./waterDropRenderer').then(module => {
      create = module.createWaterDrop
      start()
    }, () => { if (active) setSurface('fallback') })

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
    {surface === '3d' && <div className="drop-control" role="group" tabIndex={0} data-swipe-only="down"
      aria-label="Трёхмерная капля" aria-description="Используйте стрелки, чтобы менять ракурс."
      onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onKeyDown={key} />}
  </>
}
