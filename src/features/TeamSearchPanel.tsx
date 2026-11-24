import { useEffect, useState, type FormEvent } from 'react'
import type { Hackathon, TeamSearch } from '../shared/api/types'
import { HackathonPicker } from './HackathonPicker'

type Draft = { enabled: boolean; selection: string; title: string }
const eventOption = (id: string) => `event:${id}`

function draftFor(mode: TeamSearch | null): Draft {
  return {
    enabled: mode !== null,
    selection: mode?.kind === 'event' ? eventOption(mode.eventId) : mode?.kind ?? '',
    title: mode?.kind === 'other' ? mode.title ?? '' : '',
  }
}

export function TeamSearchPanel({ mode, options, loadError, load, saving, save }: {
  mode: TeamSearch | null; options?: Hackathon[]; loadError?: string; load: () => void; saving: boolean
  save: (mode: TeamSearch | null) => Promise<TeamSearch | null>
}) {
  const [draft, setDraft] = useState(() => draftFor(mode))
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const saved = draftFor(mode)
  const title = draft.title.trim()
  const changed = draft.enabled !== saved.enabled || (draft.enabled &&
    (draft.selection !== saved.selection || (draft.selection === 'other' && title !== saved.title)))
  const chosen = options?.find(event => eventOption(event.id) === draft.selection)
  const previous = mode?.kind === 'event' && !options?.some(event => event.id === mode.eventId) ? mode : null
  const choices = options?.map(event => ({ value: eventOption(event.id), label: event.title })) ?? []
  const previousChoice = previous ? [{ value: eventOption(previous.eventId), label: `${previous.eventTitle} (ранее выбран)`, disabled: true }] : []

  useEffect(() => {
    if (draft.enabled) load()
  }, [draft.enabled, load])

  function edit(value: Partial<Draft>) {
    setDraft(current => ({ ...current, ...value }))
    setError('')
    setStatus('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !changed) return
    let next: TeamSearch | null = null
    if (draft.enabled) {
      if (draft.selection === 'other') next = { kind: 'other', ...(title ? { title } : {}) }
      else if (chosen) next = { kind: 'event', eventId: chosen.id, eventTitle: chosen.title }
      else return
    }
    setError('')
    try {
      const result = await save(next)
      setDraft(draftFor(result))
      setStatus(result ? 'Режим поиска команды включён.' : 'Режим поиска команды выключен.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить режим поиска команды.')
    }
  }

  return <form className="team-search" aria-label="Поиск команды" onSubmit={submit}>
    <fieldset disabled={saving}>
      <label className="team-search-toggle">
        <span>Ищу команду</span>
        <input type="checkbox" role="switch" checked={draft.enabled} onChange={event => edit({ enabled: event.target.checked })} />
        <span className="team-search-track" aria-hidden="true" />
      </label>
      {draft.enabled && <>
        <HackathonPicker value={draft.selection} disabled={saving} onChange={selection => edit({ selection })}
          options={[...choices, ...previousChoice, { value: 'other', label: 'Другое' }]} />
        {!options && !loadError && <p className="muted hackathon-picker-loading" role="status">
          <span aria-hidden="true" /> Загружаем текущие хакатоны…
        </p>}
        {loadError && <div className="team-search-load-error">
          <p className="error" role="alert">{loadError}</p>
          <button className="hint" type="button" onClick={load}>Повторить загрузку</button>
        </div>}
        {options?.length === 0 && <p className="muted">Сейчас в календаре нет идущих хакатонов.</p>}
        {draft.selection === 'other' && <label>Название хакатона (необязательно)
          <input maxLength={120} value={draft.title} onChange={event => edit({ title: event.target.value })} />
        </label>}
      </>}
      {changed && <button className="primary" type="submit" disabled={draft.enabled && draft.selection !== 'other' && !chosen}>Сохранить режим</button>}
    </fieldset>
    {status && <p className="accent" role="status">{status}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </form>
}
