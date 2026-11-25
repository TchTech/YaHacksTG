import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Back, Calendar, Detail, Header, Own, PeopleHeader, PersonCard } from '../features/screens'
import { TeamSearchPanel } from '../features/TeamSearchPanel'
import type { Hackathon, OwnProfile, TeamSearch } from '../shared/api/types'
import { Icon } from '../shared/ui/Icon'
import { loadEvent, loadPerson, selectEvent, selectPerson } from './journeyStore'
import {
  clearInviteError, invitePerson, loadEvents, loadOngoingEvents, loadPeople, loadProfile, requestMessage, savePreferences, saveProfile, saveTeamSearch,
  selectEvents, selectOngoingEvents, selectPeople, selectSaving, useAppDispatch, useAppSelector, type Resource,
} from './store'

export function Loading({ state, retry }: { state: Resource<unknown>; retry: () => void }) {
  if (state.status === 'error') return <div className="empty">
    <p role="alert" className="error">{state.message}</p>
    <button className="primary" type="button" onClick={retry}>Повторить</button>
  </div>
  return <p className="empty" role="status">Загрузка…</p>
}

export function ProfileLoading({ profile }: { profile: Resource<OwnProfile> }) {
  const dispatch = useAppDispatch()
  return <><Header title="YaHacks" /><Loading state={profile} retry={() => { void dispatch(loadProfile()) }} /></>
}

function useEvents() {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectEvents)
  useEffect(() => {
    if (events.status === 'idle') void dispatch(loadEvents())
  }, [dispatch, events.status])
  return { events, retry: () => { void dispatch(loadEvents()) } }
}

export function CalendarPage({ back, ...props }: Omit<Parameters<typeof Calendar>[0], 'events'> & { back: () => void }) {
  const { events, retry } = useEvents()
  return <>
    <Header title="Календарь событий" actions={{ up: back, down: back }}><Back direction="↕" onClick={back} /></Header>
    {events.status === 'ready' ? <Calendar events={events.value} {...props} /> : <Loading state={events} retry={retry} />}
  </>
}

export function EventRoute({ children, calendar }: { children: (event: Hackathon) => ReactNode; calendar: () => void }) {
  const { eventId = '' } = useParams()
  const dispatch = useAppDispatch()
  const event = useAppSelector(state => selectEvent(state, eventId))
  useEffect(() => {
    if (event.status === 'idle') void dispatch(loadEvent(eventId))
  }, [dispatch, eventId, event.status])
  const header = <Header title="Событие" actions={{ up: calendar }}><Back direction="↑" onClick={calendar} to="Назад" /></Header>
  if (event.status !== 'ready') return <>{header}<Loading state={event} retry={() => { void dispatch(loadEvent(eventId)) }} /></>
  if (!event.value) return <>{header}<p className="empty">Событие недоступно.</p></>
  return children(event.value)
}

export function PeoplePage({ event, back, fromCalendar, openPerson, openInvitations, notify }: {
  event?: Hackathon; back: () => void; fromCalendar?: boolean; openPerson: (id: string) => void; openInvitations: () => void; notify: () => void
}) {
  const { personId } = useParams()
  const eventId = event?.id
  const dispatch = useAppDispatch()
  const { people, inviting, inviteError } = useAppSelector(state => selectPeople(state, eventId))
  const personDetail = useAppSelector(state => selectPerson(state, personId ?? ''))
  const [skipped, setSkipped] = useState<string[]>([])
  useEffect(() => {
    if (personId === undefined && people.status === 'idle') void dispatch(loadPeople(eventId))
    if (personId !== undefined && personDetail.status === 'idle') void dispatch(loadPerson(personId))
  }, [dispatch, eventId, people.status, personDetail.status, personId])

  function retry() {
    setSkipped([])
    void dispatch(loadPeople(eventId))
  }

  if (personId !== undefined) {
    const header = <Header title="Профиль участника" actions={{ up: back }}><Back direction="↑" onClick={back} to="К карточке" /></Header>
    if (personDetail.status !== 'ready') return <>{header}<Loading state={personDetail} retry={() => { void dispatch(loadPerson(personId)) }} /></>
    return personDetail.value ? <Detail person={personDetail.value} back={back} /> : <>{header}<p className="empty">Профиль участника недоступен.</p></>
  }
  const header = <><PeopleHeader back={back} event={event} fromCalendar={fromCalendar} />
    <button className="event-secondary journey-shortcut" type="button" onClick={openInvitations}><Icon name="invitations" />Приглашения</button></>
  if (people.status !== 'ready') return <>{header}<Loading state={people} retry={retry} /></>
  const person = people.value.find(candidate => !skipped.includes(candidate.id))
  if (!person) return <>{header}<div className="empty"><p>{event ? 'Для этого события пока нет новых рекомендаций.' : 'Новых рекомендаций пока нет.'}</p>
    <button type="button" className="primary" onClick={retry}>Обновить подбор</button>
  </div></>
  return <>{header}<PersonCard person={person} detail={() => { if (!inviting) openPerson(person.id) }}
    skip={() => {
      if (inviting) return
      setSkipped(ids => [...ids, person.id])
      dispatch(clearInviteError(eventId))
    }}
    invite={() => {
      void dispatch(invitePerson({ personId: person.id, eventId })).then(action => {
        if (invitePerson.fulfilled.match(action)) notify()
      })
    }} busy={inviting} error={inviteError} /></>
}

function TeamSearchSection({ mode }: { mode: TeamSearch | null }) {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectOngoingEvents)
  const saving = useAppSelector(selectSaving)
  const load = useCallback(() => { void dispatch(loadOngoingEvents()) }, [dispatch])
  return <TeamSearchPanel mode={mode} options={events.status === 'ready' ? events.value : undefined}
    loadError={events.status === 'error' ? events.message : undefined} load={load} saving={saving} save={async value => {
      try { return await dispatch(saveTeamSearch(value)).unwrap() }
      catch (error) { throw new Error(requestMessage(error)) }
    }} />
}

export function SettingsPage({ profile, back, activity }: { profile: OwnProfile; back: () => void; activity: ReactNode }) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector(selectSaving)
  return <Own profile={profile} back={back} saving={saving} activity={activity} teamSearch={<TeamSearchSection mode={profile.teamSearch ?? null} />} save={async value => {
    try { return await dispatch(savePreferences(value)).unwrap() }
    catch (error) { throw new Error(requestMessage(error)) }
  }} saveProfile={async value => {
    try { return await dispatch(saveProfile(value)).unwrap() }
    catch (error) { throw new Error(requestMessage(error)) }
  }} />
}
