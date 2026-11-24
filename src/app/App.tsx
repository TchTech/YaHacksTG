import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Calendar, Detail, Header, Home, Own, PeopleHeader, PersonCard } from '../features/screens'
import { createApi } from '../shared/api/client'
import type { Api, OwnProfile, Person, Preferences } from '../shared/api/types'
import { bindBackButton, getWebApp, setupWebApp } from '../shared/telegram/webApp'

type Screen = 'home' | 'calendar' | 'people' | 'detail' | 'own'
type Resource<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; value: T }

const homeEntrances = { people: 'translateX(-42px)', own: 'translateX(42px)', calendar: 'translateY(-28px)' }
const returnEntrances = { people: 'translateX(42px)', own: 'translateX(-42px)', calendar: 'translateY(28px)' }

function message(error: unknown) {
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message : 'Не удалось соединиться с сервером. Попробуйте ещё раз.'
}

function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    load().then(
      value => { if (active) setState({ status: 'ready', value }) },
      error => { if (active) setState({ status: 'error', message: message(error) }) },
    )
    return () => { active = false }
  }, [load, attempt])
  return {
    state,
    setValue: (value: T) => setState({ status: 'ready', value }),
    retry() {
      setState({ status: 'loading' })
      setAttempt(value => value + 1)
    },
  }
}

function Loading({ state, retry }: { state: Resource<unknown>; retry: () => void }) {
  if (state.status === 'error') return <div className="empty">
    <p role="alert" className="error">{state.message}</p>
    <button className="primary" type="button" onClick={retry}>Повторить</button>
  </div>
  return <p className="empty" role="status">Загрузка…</p>
}

function CalendarPage({ api, role, back }: { api: Api; role: string; back: () => void }) {
  const { state, retry } = useResource(api.events)
  if (state.status === 'ready') return <Calendar events={state.value} role={role} back={back} />
  return <><Header title="Календарь событий" actions={{ up: back }}><button className="hint back" type="button" onClick={back}>↑ на главную</button></Header>
    <Loading state={state} retry={retry} /></>
}

function PeopleFlow({ api, screen, navigate, notify, demo }: {
  api: Api; screen: Screen; navigate: (screen: Screen) => void; notify: (text: string) => void; demo: boolean
}) {
  const { state, retry } = useResource(api.people)
  const [skipped, setSkipped] = useState<string[]>([])
  const [invited, setInvited] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sending = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  async function invite(person: Person) {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      await api.invite(person.id)
      if (active.current) {
        setInvited(ids => [...ids, person.id])
        notify(demo ? 'Демо: запрос в команду отправлен' : 'Запрос в команду отправлен')
      }
    } catch (error) {
      if (active.current) setError(message(error))
    } finally {
      sending.current = false
      if (active.current) setBusy(false)
    }
  }

  const header = <PeopleHeader back={() => navigate('home')} />
  if (state.status !== 'ready') return <>{header}<Loading state={state} retry={retry} /></>
  const person = state.value.find(candidate => !skipped.includes(candidate.id) && !invited.includes(candidate.id))
  if (!person) return <>{header}<div className="empty"><p>Новых рекомендаций пока нет.</p>
    <button type="button" className="primary" onClick={() => { setSkipped([]); retry() }}>Обновить подбор</button>
  </div></>
  if (screen === 'detail') return <Detail person={person} back={() => navigate('people')} />
  return <>{header}<PersonCard person={person} detail={() => { if (!sending.current) navigate('detail') }}
    skip={() => {
      if (sending.current) return
      setSkipped(ids => [...ids, person.id])
      setError('')
    }}
    invite={() => { void invite(person) }} busy={busy} error={error} /></>
}

export function App() {
  const [webApp] = useState(getWebApp)
  const [{ api, demo }] = useState(() => createApi(webApp?.initData ?? ''))
  const { state, setValue, retry } = useResource(api.profile)
  const [{ screen, from }, setLocation] = useState<{ screen: Screen; from?: Screen }>({ screen: 'home' })
  const [notice, setNotice] = useState('')
  const main = useRef<HTMLElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const savingPreferences = useRef(false)

  const navigate = useCallback((next: Screen) => {
    setLocation(current => current.screen === next ? current : { screen: next, from: current.screen })
  }, [])

  useEffect(() => setupWebApp(webApp), [webApp])
  useEffect(() => bindBackButton(webApp, screen === 'home' ? undefined
    : () => navigate(screen === 'detail' ? 'people' : 'home')), [webApp, screen, navigate])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
  useEffect(() => {
    window.scrollTo(0, 0)
    if (state.status === 'ready') main.current?.querySelector('h1')?.focus({ preventScroll: true })
  }, [screen, state.status])

  useLayoutEffect(() => {
    if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let transform = screen === 'detail' ? 'translateY(-20px)' : 'translateY(20px)'
    if (from === 'home' && screen !== 'home' && screen !== 'detail') transform = homeEntrances[screen]
    if (screen === 'home' && from !== 'home' && from !== 'detail') transform = returnEntrances[from]
    const animation = page.current?.animate?.(
      [{ transform, opacity: .58 }, { transform: 'none', opacity: 1 }],
      { duration: 360, easing: 'cubic-bezier(.2,.74,.22,1)' },
    )
    return () => animation?.cancel()
  }, [screen, from])

  function notify(text: string) {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2600)
  }

  async function save(profile: OwnProfile, value: Preferences) {
    if (savingPreferences.current) throw new Error('Предыдущее сохранение ещё выполняется.')
    savingPreferences.current = true
    try {
      const preferences = await api.savePreferences(value)
      setValue({ ...profile, preferences })
      return preferences
    } finally {
      savingPreferences.current = false
    }
  }

  function content() {
    if (state.status !== 'ready') return <><Header title="YaHacks" /><Loading state={state} retry={retry} /></>
    const profile = state.value
    const back = () => navigate('home')
    switch (screen) {
      case 'home': return <Home profile={profile} people={() => navigate('people')}
        own={() => navigate('own')} calendar={() => navigate('calendar')} />
      case 'calendar': return <CalendarPage api={api} role={profile.preferences.role} back={back} />
      case 'people':
      case 'detail': return <PeopleFlow api={api} screen={screen} navigate={navigate} notify={notify} demo={demo} />
      case 'own': return <Own profile={profile} back={back} save={value => save(profile, value)} />
    }
  }

  return <main ref={main} className={`shell ${screen === 'home' ? 'shell-home' : ''}`}>
    {demo && <p className="demo-label">{webApp ? 'Демоданные' : 'Деморежим'}</p>}
    <div ref={page} className="screen-content">{content()}</div>
    <div className={`toast ${notice ? 'toast-visible' : ''}`} role="status">{notice}</div>
  </main>
}
