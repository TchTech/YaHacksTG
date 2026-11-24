import { useState, type FormEvent, type ReactNode } from 'react'
import type { Hackathon, OwnProfile, Person, Preferences, Profile } from '../shared/api/types'
import { SwipeZone, type SwipeActions } from '../shared/ui/SwipeZone'

export function Header({ title, children, actions = {} }: {
  title: string; children?: ReactNode; actions?: SwipeActions
}) {
  return <SwipeZone actions={actions}>
    <div className="topbar">
      <span className="wordmark">YaHacks<span>.</span></span>
      {children}
    </div>
    <h1 tabIndex={-1}>{title}</h1>
  </SwipeZone>
}

export function Hint({ children, onClick, className = '' }: {
  children: ReactNode; onClick: () => void; className?: string
}) {
  return <button type="button" className={`hint ${className}`} onClick={onClick}>{children}</button>
}

function Back({ direction, onClick, to = 'на главную' }: {
  direction: '←' | '↑' | '→'; onClick: () => void; to?: string
}) {
  return <Hint onClick={onClick} className="back">{direction} Свайп {to}</Hint>
}

export function Home({ profile, people, own, calendar }: {
  profile: OwnProfile; people: () => void; own: () => void; calendar: () => void
}) {
  return <SwipeZone className="home" actions={{ right: people, left: own, down: calendar }} trackMotion>
    <div className="home-backdrop" aria-hidden="true">
      <div className="home-drop" />
    </div>
    <span className="wordmark">YaHacks<span>.</span></span>
    <div className="home-intro">
      <p className="accent">Привет, {profile.name}</p>
      <h1 tabIndex={-1}>Твои хакатоны.<br />Твоя команда.</h1>
      <p className="lead">Подбираем события и людей по твоей роли и интересам.</p>
      <div className="home-links">
        <Hint onClick={own}><span aria-hidden="true">←</span>Профиль<br />и настройки</Hint>
        <Hint onClick={people}><span aria-hidden="true">→</span>Люди<br />для команды</Hint>
      </div>
    </div>
    <Hint className="calendar-link" onClick={calendar}><span aria-hidden="true">↓</span>Календарь событий</Hint>
  </SwipeZone>
}

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const monthShort = new Intl.DateTimeFormat('ru', { month: 'short', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export function Calendar({ events, role, back }: { events: Hackathon[]; role: string; back: () => void }) {
  const groups = new Map<string, Hackathon[]>()
  for (const event of [...events].sort((a, b) => a.startsOn.localeCompare(b.startsOn))) {
    const month = event.startsOn.slice(0, 7)
    if (!groups.has(month)) groups.set(month, [])
    groups.get(month)?.push(event)
  }
  return <>
    <Header title="Календарь событий" actions={{ up: back }}><Back direction="↑" onClick={back} /></Header>
    <p className="lead">Рекомендации для {role}</p>
    {!groups.size && <p className="empty">Нет событий по вашим настройкам.</p>}
    {[...groups].map(([month, entries]) => <section className="event-group" key={month}>
      <h2>{monthNames[Number(month.slice(5)) - 1]}</h2>
      {entries.map(event => {
        const start = new Date(event.startsOn)
        const end = new Date(event.endsOn)
        return <article className="event" key={event.id}>
          <time dateTime={event.startsOn}><strong>{event.startsOn.slice(-2)}</strong>{monthShort.format(start)}</time>
          <div><h3>{event.title}</h3><p>{event.startsOn === event.endsOn ? fullDate.format(start) : fullDate.formatRange(start, end)} · {event.location}</p>
            <p className="accent">{event.tags.join(' · ')}</p></div>
        </article>
      })}
    </section>)}
  </>
}

function Avatar({ profile, large = false }: { profile: Profile; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <div className={`avatar ${large ? 'avatar-large' : ''}`}>
    {profile.avatarUrl && !failed
      ? <img src={profile.avatarUrl} alt="" draggable={false} onError={() => setFailed(true)} />
      : <span aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span>}
  </div>
}

function Skills({ profile }: { profile: Profile }) {
  return <ul className="skills">{profile.skills.map(skill => <li key={skill}>{skill}</li>)}</ul>
}

export function PeopleHeader({ back }: { back: () => void }) {
  return <Header title="Подбор людей" actions={{ left: back }}><Back direction="←" onClick={back} /></Header>
}

export function PersonCard({ person, detail, skip, invite, busy, error }: {
  person: Person; detail: () => void; skip: () => void; invite: () => void; busy: boolean; error: string
}) {
  return <>
    <Hint className="details-hint" onClick={detail}>↓ Подробнее об участнике</Hint>
    <SwipeZone className="person-card" actions={{ down: detail, left: skip, right: invite }}>
      <Avatar key={person.id} profile={person} large />
      <div className="person-content">
        <h2>{person.name}{person.age === undefined ? '' : `, ${person.age}`}</h2>
        <p className="accent">{person.role}</p>
        <p className="muted">{[person.city, person.status].filter(Boolean).join(' · ')}</p>
        <Skills profile={person} />
        <p>{person.summary}</p>
      </div>
    </SwipeZone>
    <div className="card-actions">
      <button type="button" disabled={busy} onClick={skip}>← Пропустить</button>
      <button type="button" disabled={busy} onClick={invite}>{busy ? 'Отправляем…' : 'Запрос в команду →'}</button>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
  </>
}

function ProfileLists({ profile }: { profile: Profile }) {
  const groups = [
    { label: 'Команды', items: profile.teams },
    { label: 'Достижения', items: profile.achievements },
    { label: 'Кейсы и проекты', items: profile.projects },
  ]
  return <>{groups.map(({ label, items }) => <section key={label} className="profile-section">
    <h2>{label}</h2>
    {items.length ? <ul className="rows">{items.map(item => <li key={item}>{item}</li>)}</ul> : <p className="muted">Пока пусто</p>}
  </section>)}</>
}

export function Detail({ person, back }: { person: Person; back: () => void }) {
  return <>
    <Header title="Профиль участника" actions={{ up: back }}><Back direction="↑" onClick={back} to="к карточке" /></Header>
    <div className="profile-head"><Avatar profile={person} /><div><h2>{person.name}</h2><p className="accent">{person.role}</p></div></div>
    <section className="profile-section"><h2>О себе</h2><p className="lead">{person.about}</p></section>
    <ProfileLists profile={person} />
  </>
}

export function Own({ profile, back, save }: {
  profile: OwnProfile; back: () => void; save: (value: Preferences) => Promise<Preferences>
}) {
  const [draft, setDraft] = useState(profile.preferences)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !draft.role.trim()) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const value = { ...draft, role: draft.role.trim() }
      setDraft(await save(value))
      setStatus('Настройки сохранены')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить настройки.')
    } finally {
      setBusy(false)
    }
  }

  return <SwipeZone actions={{ right: back }}>
    <span className="wordmark">YaHacks<span>.</span></span>
    <Back direction="→" onClick={back} />
    <h1 tabIndex={-1}>Профиль и настройки</h1>
    <div className="profile-head"><Avatar profile={profile} /><div><h2>{profile.name}</h2><p className="accent">{profile.role}</p><p className="muted">{profile.status}</p></div></div>
    <Skills profile={profile} />
    <ProfileLists profile={profile} />
    <form className="profile-section preferences" onSubmit={submit}>
      <h2>Настройки рекомендаций</h2>
      <fieldset disabled={busy}>
        <label>Роль<input required maxLength={80} value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })} /></label>
        <label>Формат событий<select value={draft.format} onChange={event => setDraft({ ...draft, format: event.target.value as Preferences['format'] })}>
          <option value="online">Онлайн</option><option value="in-person">Очно</option><option value="any">Любой</option>
        </select></label>
        <label>Напоминать о дедлайнах<select value={draft.reminderDays} onChange={event => setDraft({ ...draft, reminderDays: Number(event.target.value) as Preferences['reminderDays'] })}>
          <option value={0}>Выключено</option><option value={1}>За 1 день</option><option value={2}>За 2 дня</option><option value={7}>За неделю</option>
        </select></label>
        <button className="primary" type="submit" disabled={!draft.role.trim()}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
      </fieldset>
      <p role="status" className="accent">{status}</p>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  </SwipeZone>
}
