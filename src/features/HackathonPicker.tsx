import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

type Option = { value: string; label: string; disabled?: boolean }

export function HackathonPicker({ options, value, disabled, onChange }: {
  options: Option[]; value: string; disabled: boolean; onChange: (value: string) => void
}) {
  const labelId = useId()
  const listId = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const selected = options.find(option => option.value === value)
  const enabled = options.filter(option => !option.disabled)
  const activeIndex = options.findIndex(option => !option.disabled && option.value === active)
  const activeId = open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  useEffect(() => { if (disabled) setOpen(false) }, [disabled])

  useEffect(() => {
    const popup = list.current
    if (!popup || !activeId) return
    const item = document.getElementById(activeId)
    if (!item) return
    const bottom = item.offsetTop + item.offsetHeight
    if (item.offsetTop < popup.scrollTop) popup.scrollTop = item.offsetTop
    else if (bottom > popup.scrollTop + popup.clientHeight) popup.scrollTop = bottom - popup.clientHeight
  }, [activeId])

  function show(last = false) {
    const initial = selected && !selected.disabled ? selected : enabled[last ? enabled.length - 1 : 0]
    setActive(initial?.value ?? '')
    setOpen(true)
  }

  function choose(option: Option) {
    if (disabled || option.disabled) return
    onChange(option.value)
    setOpen(false)
    button.current?.focus({ preventScroll: true })
  }

  function key(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const direction = event.key === 'ArrowDown' ? 1 : -1
        if (!open) show(direction === -1)
        else {
          const index = enabled.findIndex(option => option.value === active)
          const next = index === -1 ? (direction === 1 ? 0 : enabled.length - 1)
            : Math.max(0, Math.min(enabled.length - 1, index + direction))
          setActive(enabled[next]?.value ?? '')
        }
        break
      }
      case 'Home':
      case 'End':
        setOpen(true)
        setActive(enabled[event.key === 'Home' ? 0 : enabled.length - 1]?.value ?? '')
        break
      case 'Enter':
      case ' ':
        if (!open) show()
        else if (activeIndex >= 0) choose(options[activeIndex])
        break
      case 'Escape':
        if (!open) return
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        return
      default: return
    }
    event.preventDefault()
  }

  return <div className="hackathon-picker" data-open={open} data-swipe-ignore ref={root}>
    <span className="hackathon-picker-label" id={labelId}>Хакатон</span>
    <button className="hackathon-picker-trigger" type="button" role="combobox" ref={button} disabled={disabled}
      aria-labelledby={labelId} aria-controls={listId} aria-expanded={open} aria-activedescendant={activeId} aria-required="true"
      onClick={() => { if (open) setOpen(false); else show() }} onKeyDown={key}
      onBlur={event => {
        if (event.relatedTarget instanceof Node && !root.current?.contains(event.relatedTarget)) setOpen(false)
      }}>
      <span className={selected ? undefined : 'hackathon-picker-placeholder'}>{selected?.label ?? 'Выберите хакатон'}</span>
      <span className="hackathon-picker-chevron" aria-hidden="true" />
    </button>
    <div className="hackathon-picker-reveal" aria-hidden={!open} inert={!open}>
      <div className="hackathon-picker-clip">
        <ul className="hackathon-picker-options" id={listId} role="listbox" aria-labelledby={labelId} ref={list}
          onMouseDown={event => event.preventDefault()}>
          {options.map((option, index) => <li key={option.value} id={`${listId}-${index}`} role="option"
            aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
            data-active={index === activeIndex} onClick={() => choose(option)}
            onMouseMove={() => { if (!option.disabled) setActive(option.value) }}>
            <span>{option.label}</span>
            {option.value === value && <span className="hackathon-picker-check" aria-hidden="true">✓</span>}
          </li>)}
        </ul>
      </div>
    </div>
  </div>
}
