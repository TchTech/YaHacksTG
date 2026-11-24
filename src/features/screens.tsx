import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Hackathon, OwnProfile, Person, Preferences, Profile } from '../shared/api/types'
import { Dropdown } from '../shared/ui/Dropdown'
import { SwipeZone, type SwipeActions } from '../shared/ui/SwipeZone'
import { WaterDrop } from './WaterDrop'
import { ProfileEditor } from './ProfileEditor'

export function Header({ title, children, actions = {} }: {
  title: string; children?: ReactNode; actions?: SwipeActions
}) {
  return <SwipeZone className="screen-header" actions={actions}>
    <ScreenHeading title={title}>{children}</ScreenHeading>
  </SwipeZone>
}

function ScreenHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <>
    <div className="topbar">
      <span className="wordmark">YaHacks<span>.</span></span>
      {children}
    </div>
    <h1 tabIndex={-1}>{title}</h1>
  </>
}

export function Hint({ children, onClick, className = '' }: {
  children: ReactNode; onClick: () => void; className?: string
}) {
  return <button type="button" className={`hint ${className}`} onClick={onClick}>{children}</button>
}

export function Back({ direction, onClick, to = 'На главную' }: {
  direction: '←' | '↑' | '→'; onClick: () => void; to?: 'На главную' | 'К карточке' | 'К событию' | 'К календарю'
}) {
  return <Hint onClick={onClick} className="back">
    <span className="back-gesture" aria-hidden="true">{direction} Свайп </span>
    <span className="back-arrow" aria-hidden="true">← </span>
    <span className="back-label">{to}</span>
  </Hint>
}

function HomeIcon({ children }: { children: ReactNode }) {
  return <svg className="home-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
}

export function Home({ profile, people, own, calendar }: {
  profile: OwnProfile; people: () => void; own: () => void; calendar: () => void
}) {
  return <SwipeZone className="home" actions={{ right: people, left: own, down: calendar }} trackMotion>
    <span className="wordmark">YaHacks<span>.</span></span>
    <div className="home-copy">
      <div className="home-intro">
        <p className="accent">Привет, {profile.name}</p>
        <h1 tabIndex={-1}>Твои хакатоны.<br />Твоя команда.</h1>
        <p className="lead">Подбираем события и людей по твоей роли и интересам.</p>
        <nav className="home-links" aria-label="Разделы YaHacks">
          <Hint onClick={own}>
            <span aria-hidden="true">←</span>
            <HomeIcon>
              <rect x="3" y="4.5" width="18" height="15" rx="3" />
              <circle cx="9" cy="10" r="2" />
              <path d="M5.8 16a3.5 3.5 0 0 1 6.4 0M15 10h3m-3 4h3" />
            </HomeIcon>
            <span>Профиль <br />и настройки</span>
          </Hint>
          <Hint onClick={people}>
            <span aria-hidden="true">→</span>
            <HomeIcon>
              <circle cx="9" cy="8" r="3" />
              <path d="M3 19v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1M16 5.3a3 3 0 0 1 0 5.5m2.1 3.4A4 4 0 0 1 21 18v1" />
            </HomeIcon>
            <span className="mobile-label">Люди <br />для команды</span>
            <span className="wide-label">Подбор людей</span>
          </Hint>
          <Hint className="calendar-link" onClick={calendar}>
            <span aria-hidden="true">↓</span>
            <HomeIcon>
              <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
              <path d="M8 3.5v3M16 3.5v3M3.5 10h17m-5.5 4h2m-2 3h2" />
              <rect x="7.5" y="12.5" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
            </HomeIcon>
            <span>Календарь событий</span>
          </Hint>
        </nav>
      </div>
    </div>
    <WaterDrop />
  </SwipeZone>
}

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const fullDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' })

function EventCover({ event }: { event: Hackathon }) {
  const [failedUrl, setFailedUrl] = useState<string>()
  return <div className="event-cover" aria-hidden="true">
    {event.previewUrl && event.previewUrl !== failedUrl &&
      <img src={event.previewUrl} alt="" onError={() => setFailedUrl(event.previewUrl)} />}
  </div>
}

function EventFacts({ event }: { event: Hackathon }) {
  const start = new Date(event.startsOn)
  const end = new Date(event.endsOn)
  return <>
    <p className="event-time muted"><time dateTime={event.startsOn}>
      {event.startsOn === event.endsOn ? fullDate.format(start) : fullDate.formatRange(start, end)}
    </time> · {event.location}</p>
    <p className="event-prize"><span>Призовой фонд</span><strong>{event.prizePool || 'Пока не объявлен'}</strong></p>
  </>
}

export function Calendar({ events, role, back, open, findTeam }: {
  events: Hackathon[]; role: string; back: () => void; open: (event: Hackathon) => void; findTeam: (event: Hackathon) => void
}) {
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
    <div className="calendar-groups">{[...groups].map(([month, entries]) => <section className="event-group" key={month}>
      <h2>{monthNames[Number(month.slice(5)) - 1]}</h2>
      <div className="event-list">{entries.map(event => <article className="event" key={event.id}>
        <EventCover event={event} />
        <div className="event-body">
          <h3>{event.title}</h3>
          <EventFacts event={event} />
          {event.tags.length > 0 && <p className="event-tags muted">{event.tags.join(' · ')}</p>}
          <div className="event-actions">
            <button className="event-secondary" type="button" aria-label={`Подробнее о событии ${event.title}`} onClick={() => open(event)}>Подробнее</button>
            <button className="primary" type="button" aria-label={`Найти команду для ${event.title}`} onClick={() => findTeam(event)}>Найти команду</button>
          </div>
        </div>
      </article>)}</div>
    </section>)}</div>
  </>
}

export function EventDetail({ event, back, findTeam }: { event: Hackathon; back: () => void; findTeam: () => void }) {
  const officialUrl = event.eventUrl?.startsWith('https://') ? event.eventUrl : undefined
  return <>
    <Header title={event.title} actions={{ up: back }}><Back direction="↑" onClick={back} to="К календарю" /></Header>
    <div className="event-detail">
      <EventCover event={event} />
      <div className="event-detail-body">
        <EventFacts event={event} />
        {event.tags.length > 0 && <ul className="skills">{event.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
        <section className="event-description">
          <h2>О событии</h2>
          <p className="lead">{event.description || 'Организаторы пока не добавили описание.'}</p>
        </section>
        <div className="event-detail-actions">
          <button className="primary" type="button" onClick={findTeam}>Найти команду</button>
          {officialUrl && <a className="event-secondary" href={officialUrl} target="_blank" rel="noreferrer">Сайт события</a>}
        </div>
      </div>
    </div>
  </>
}

function Avatar({ profile, large = false }: { profile: Profile; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string>()
  return <div className={`avatar ${large ? 'avatar-large' : ''}`}>
    {profile.avatarUrl && profile.avatarUrl !== failedUrl
      ? <img src={profile.avatarUrl} alt="" draggable={false} onError={() => setFailedUrl(profile.avatarUrl)} />
      : <span aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span>}
  </div>
}

function Skills({ profile }: { profile: Profile }) {
  return <ul className="skills">{profile.skills.map(skill => <li key={skill}>{skill}</li>)}</ul>
}

export function PeopleHeader({ back, event, fromCalendar }: { back: () => void; event?: Hackathon; fromCalendar?: boolean }) {
  const destination = fromCalendar ? 'К календарю' : event ? 'К событию' : 'На главную'
  return <>
    <Header title="Подбор людей" actions={{ left: back }}><Back direction="←" onClick={back} to={destination} /></Header>
    {event && <p className="people-event lead">Команда на <strong>{event.title}</strong></p>}
  </>
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
    <Header title="Профиль участника" actions={{ up: back }}><Back direction="↑" onClick={back} to="К карточке" /></Header>
    <div className="profile-layout">
      <div className="profile-overview">
        <div className="profile-head"><Avatar profile={person} /><div><h2>{person.name}</h2><p className="accent">{person.role}</p></div></div>
        <section className="profile-section"><h2>О себе</h2><p className="lead">{person.about}</p></section>
      </div>
      <div><ProfileLists profile={person} /></div>
    </div>
  </>
}

const eventFormats = [
  { value: 'online', label: 'Онлайн' },
  { value: 'in-person', label: 'Очно' },
  { value: 'any', label: 'Любой' },
] as const

const reminderOptions = [
  { value: 0, label: 'Выключено' },
  { value: 1, label: 'За 1 день' },
  { value: 2, label: 'За 2 дня' },
  { value: 7, label: 'За неделю' },
] as const

export function Own({ profile, back, saving, teamSearch, save, saveProfile }: {
  profile: OwnProfile; back: () => void; saving: boolean; teamSearch: ReactNode
  save: (value: Preferences) => Promise<Preferences>; saveProfile: (value: Profile) => Promise<Profile>
}) {
  const [draft, setDraft] = useState(profile.preferences)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [profileStatus, setProfileStatus] = useState('')
  const editButton = useRef<HTMLButtonElement>(null)

  function finishEditing(saved: boolean) {
    setEditing(false)
    if (saved) setProfileStatus('Профиль сохранён')
    requestAnimationFrame(() => editButton.current?.focus())
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || !draft.role.trim()) return
    setError('')
    setStatus('')
    try {
      const value = { ...draft, role: draft.role.trim() }
      setDraft(await save(value))
      setStatus('Настройки сохранены')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить настройки.')
    }
  }

  return <SwipeZone className="own-screen" actions={{ right: back }}>
    <ScreenHeading title={editing ? 'Редактирование профиля' : 'Профиль и настройки'}><Back direction="→" onClick={back} /></ScreenHeading>
    {editing ? <ProfileEditor profile={profile} saving={saving} save={saveProfile} finish={finishEditing} /> : <div className="profile-layout">
      <div className="profile-overview">
        <div className="profile-head"><Avatar profile={profile} /><div>
          <h2>{profile.name}{profile.age === undefined ? '' : `, ${profile.age}`}</h2>
          {profile.role && <p className="accent">{profile.role}</p>}
          {(profile.city || profile.status) && <p className="muted">{[profile.city, profile.status].filter(Boolean).join(' · ')}</p>}
        </div></div>
        <button className="primary profile-edit-trigger" type="button" ref={editButton} disabled={saving} onClick={() => {
          setProfileStatus('')
          setEditing(true)
        }}>Редактировать профиль</button>
        {profileStatus && <p className="accent profile-save-status" role="status">{profileStatus}</p>}
        {teamSearch}
        <Skills profile={profile} />
        {profile.summary && <section className="profile-section own-profile-description"><h2>Краткое описание</h2><p className="lead">{profile.summary}</p></section>}
        {profile.about && <section className="profile-section own-profile-description"><h2>О себе</h2><p className="lead">{profile.about}</p></section>}
        <ProfileLists profile={profile} />
      </div>
      <form className="profile-section preferences" onSubmit={submit}>
        <h2>Настройки рекомендаций</h2>
        <fieldset disabled={saving}>
          <label>Роль<input required maxLength={80} value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })} /></label>
          <Dropdown<Preferences['format']> label="Формат событий" options={eventFormats} value={draft.format} disabled={saving}
            onChange={format => setDraft({ ...draft, format })} />
          <Dropdown<Preferences['reminderDays']> label="Напоминать о дедлайнах" options={reminderOptions} value={draft.reminderDays} disabled={saving}
            onChange={reminderDays => setDraft({ ...draft, reminderDays })} />
          <button className="primary" type="submit" disabled={!draft.role.trim()}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
        </fieldset>
        <p role="status" className="accent">{status}</p>
        {error && <p role="alert" className="error">{error}</p>}
      </form>
    </div>}
  </SwipeZone>
}
