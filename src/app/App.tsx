import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { EventDetail, Home } from '../features/screens'
import { bindBackButton, getWebApp, setupWebApp } from '../shared/telegram/webApp'
import { Icon } from '../shared/ui/Icon'
import { CalendarPage, EventRoute, PeoplePage, ProfileLoading, SettingsPage, type PeopleDecision } from './Pages'
import { EventPlan, InvitationsPage, MyHackathonsPage } from './JourneyPages'
import { backPath, eventPath, routes, screenFor, teamPath } from './routes'
import { loadProfile, selectProfile, useAppDispatch, useAppSelector } from './store'

type Screen = ReturnType<typeof screenFor>
type RouteState = { backTo?: string }

const homeEntrances: Partial<Record<Screen, string>> = { people: 'translateX(42px)', settings: 'translateX(-42px)', calendar: 'translateY(-28px)' }
const returnEntrances: Partial<Record<Screen, string>> = { people: 'translateX(-42px)', settings: 'translateX(42px)', calendar: 'translateY(28px)' }

export function App({ webApp, demo }: { webApp?: ReturnType<typeof getWebApp>; demo: boolean }) {
  const dispatch = useAppDispatch()
  const profile = useAppSelector(selectProfile)
  const navigate = useNavigate()
  const { pathname, state } = useLocation()
  const origin = (state as RouteState | null)?.backTo
  const screen = screenFor(pathname)
  const from = useRef<Screen>(screen)
  const [notice, setNotice] = useState<{ decision: PeopleDecision; name: string } | null>(null)
  const main = useRef<HTMLElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const calendarExit = useRef<Animation | null>(null)
  const calendarReturnOffset = useRef<number | null>(null)

  const open = (path: string) => navigate(path, { state: { backTo: pathname } satisfies RouteState })
  const openPlans = () => open(routes.plans)
  const openInvitations = () => open(routes.invitations)
  const back = useCallback(() => {
    const destination = backPath(pathname, origin)
    if (origin === destination) navigate(-1)
    else navigate(destination, { replace: true })
  }, [navigate, pathname, origin])

  function swipeBackFromCalendar(direction: 'up' | 'down') {
    if (calendarExit.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      back()
      return
    }
    const offset = direction === 'up' ? -48 : 48
    const animation = page.current?.animate?.(
      [{ transform: 'none', opacity: 1 }, { transform: `translateY(${offset}px)`, opacity: 0 }],
      { duration: 170, easing: 'ease-in', fill: 'forwards' },
    )
    if (!animation) {
      back()
      return
    }
    calendarExit.current = animation
    void animation.finished.then(() => {
      if (calendarExit.current !== animation) return
      calendarReturnOffset.current = -offset
      back()
    }, () => {})
  }

  useEffect(() => {
    if (profile.status === 'idle') void dispatch(loadProfile())
  }, [dispatch, profile.status])
  useEffect(() => setupWebApp(webApp), [webApp])
  useEffect(() => bindBackButton(webApp, screen === 'home' ? undefined : back), [webApp, screen, back])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
  useLayoutEffect(() => () => {
    calendarExit.current?.cancel()
    calendarExit.current = null
  }, [pathname])
  useEffect(() => {
    window.scrollTo(0, 0)
    if (profile.status === 'ready') main.current?.querySelector('h1')?.focus({ preventScroll: true })
  }, [pathname, profile.status])

  useLayoutEffect(() => {
    const previous = from.current
    from.current = screen
    const returnOffset = calendarReturnOffset.current
    calendarReturnOffset.current = null
    if (previous === screen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let transform = screen === 'detail' ? 'translateY(-20px)' : 'translateY(20px)'
    if (previous === 'home') transform = homeEntrances[screen] ?? transform
    if (screen === 'home') transform = returnEntrances[previous] ?? transform
    if (screen === 'home' && previous === 'calendar' && returnOffset !== null) transform = `translateY(${returnOffset}px)`
    const animation = page.current?.animate?.(
      [{ transform, opacity: .58 }, { transform: 'none', opacity: 1 }],
      { duration: 360, easing: 'cubic-bezier(.2,.74,.22,1)' },
    )
    return () => animation?.cancel()
  }, [pathname, screen])

  function notify(decision: PeopleDecision, name: string) {
    setNotice({ decision, name })
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3000)
  }

  return <main ref={main} className={`shell ${screen === 'home' ? 'shell-home' : ''}`}>
    {demo && <p className="demo-label">{webApp ? 'Демоданные' : 'Деморежим'}</p>}
    <div ref={page} className="screen-content">
      {profile.status !== 'ready' ? <ProfileLoading profile={profile} /> : <Routes>
        <Route path={routes.home} element={<Home profile={profile.value}
          people={() => open(teamPath())} own={() => open(routes.settings)} calendar={() => open(routes.calendar)} />} />
        <Route path={routes.calendar} element={<CalendarPage role={profile.value.preferences.role} back={back} swipeBack={swipeBackFromCalendar}
          open={event => open(eventPath(event.id))} findTeam={event => open(teamPath(event.id))} openPlans={openPlans} />} />
        <Route path={routes.event} element={<EventRoute calendar={back}>
          {event => <EventDetail event={event} back={back} findTeam={() => open(teamPath(event.id))}
            plan={<EventPlan key={event.id} event={event} openPlans={openPlans} />} />}
        </EventRoute>} />
        <Route path={routes.eventTeam} element={<EventRoute calendar={() => navigate(routes.calendar, { replace: true })}>
          {event => <PeoplePage key={event.id} event={event} back={back} fromCalendar={origin === routes.calendar}
            openPerson={id => open(teamPath(event.id, id))} openInvitations={openInvitations} notify={notify} />}
        </EventRoute>} />
        <Route path={routes.people} element={<PeoplePage back={back} openPerson={id => open(teamPath(undefined, id))} openInvitations={openInvitations} notify={notify} />} />
        <Route path={routes.plans} element={<MyHackathonsPage back={back} calendar={() => open(routes.calendar)} open={event => open(eventPath(event.id))} />} />
        <Route path={routes.invitations} element={<InvitationsPage back={back} demo={demo} openEvent={id => open(eventPath(id))} />} />
        <Route path={routes.settings} element={<SettingsPage profile={profile.value} back={back} activity={<nav className="profile-activity" aria-label="Моя активность">
          <button className="event-secondary" type="button" onClick={openPlans}><Icon name="plans" />Мои хакатоны</button>
          <button className="event-secondary" type="button" onClick={openInvitations}><Icon name="invitations" />Приглашения</button>
        </nav>} />} />
        <Route path="*" element={<Navigate to={routes.home} replace />} />
      </Routes>}
    </div>
    <div role="status" aria-atomic="true">
      {notice && <div key={`${notice.decision}:${notice.name}`} className="toast" data-decision={notice.decision}>
        <span className="decision-icon"><Icon name={notice.decision === 'invite' ? 'check' : 'close'} /></span>
        <div className="toast-copy">
          <strong>{notice.decision === 'invite' ? 'Запрос отправлен' : 'Участник пропущен'}</strong>
          <span>{notice.decision === 'invite' ? `${notice.name} · Ответ появится в приглашениях` : notice.name}</span>
        </div>
      </div>}
    </div>
  </main>
}
