import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Back, Calendar, Detail, Header, Own, PeopleHeader, PersonCard } from '../features/screens'
import type { Hackathon, OwnProfile } from '../shared/api/types'
import {
  clearInviteError, invitePerson, loadEvents, loadPeople, loadProfile, requestMessage, savePreferences, saveProfile,
  selectEvents, selectPeople, selectSaving, useAppDispatch, useAppSelector, type Resource,
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

export function CalendarPage(props: Omit<Parameters<typeof Calendar>[0], 'events'>) {
  const { events, retry } = useEvents()
  if (events.status === 'ready') return <Calendar events={events.value} {...props} />
  return <><Header title="Календарь событий" actions={{ up: props.back }}><Back direction="↑" onClick={props.back} /></Header>
    <Loading state={events} retry={retry} /></>
}

export function EventRoute({ children, calendar }: { children: (event: Hackathon) => ReactNode; calendar: () => void }) {
  const { eventId } = useParams()
  const { events, retry } = useEvents()
  const header = <Header title="Событие" actions={{ up: calendar }}><Back direction="↑" onClick={calendar} to="К календарю" /></Header>
  if (events.status !== 'ready') return <>{header}<Loading state={events} retry={retry} /></>
  const event = events.value.find(item => item.id === eventId)
  if (!event) return <>{header}<p className="empty">Событие пока недоступно в вашем календаре.</p></>
  return children(event)
}

export function PeoplePage({ event, back, fromCalendar, openPerson, notify }: {
  event?: Hackathon; back: () => void; fromCalendar?: boolean; openPerson: (id: string) => void; notify: () => void
}) {
  const { personId } = useParams()
  const eventId = event?.id
  const dispatch = useAppDispatch()
  const { people, inviting, inviteError } = useAppSelector(state => selectPeople(state, eventId))
  const [skipped, setSkipped] = useState<string[]>([])
  useEffect(() => {
    if (people.status === 'idle') void dispatch(loadPeople(eventId))
  }, [dispatch, eventId, people.status])

  function retry() {
    setSkipped([])
    void dispatch(loadPeople(eventId))
  }

  const header = personId === undefined ? <PeopleHeader back={back} event={event} fromCalendar={fromCalendar} />
    : <Header title="Профиль участника" actions={{ up: back }}><Back direction="↑" onClick={back} to="К карточке" /></Header>
  if (people.status !== 'ready') return <>{header}<Loading state={people} retry={retry} /></>
  if (personId !== undefined) {
    const person = people.value.find(candidate => candidate.id === personId)
    return person ? <Detail person={person} back={back} /> : <>{header}<p className="empty">Участник пока недоступен в этой подборке.</p></>
  }
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

export function SettingsPage({ profile, back }: { profile: OwnProfile; back: () => void }) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector(selectSaving)
  return <Own profile={profile} back={back} saving={saving} save={async value => {
    try { return await dispatch(savePreferences(value)).unwrap() }
    catch (error) { throw new Error(requestMessage(error)) }
  }} saveProfile={async value => {
    try { return await dispatch(saveProfile(value)).unwrap() }
    catch (error) { throw new Error(requestMessage(error)) }
  }} />
}
