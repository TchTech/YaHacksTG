import { useEffect, useState } from 'react'
import { Back, Header } from '../features/screens'
import type { Hackathon, Invitation, InvitationReply } from '../shared/api/types'
import { Loading } from './Pages'
import { loadInvitations, loadPlans, replyToInvitation, selectInvitations, selectPlanPending, selectPlans, selectReplyPending, updatePlan } from './journeyStore'
import { requestMessage, useAppDispatch, useAppSelector } from './store'

export function EventPlan({ event, openPlans }: { event: Hackathon; openPlans: () => void }) {
  const dispatch = useAppDispatch()
  const plans = useAppSelector(selectPlans)
  const pending = useAppSelector(selectPlanPending)
  const [error, setError] = useState('')
  const planned = plans.status === 'ready' && plans.value.some(item => item.id === event.id)

  useEffect(() => {
    if (plans.status === 'idle') void dispatch(loadPlans())
  }, [dispatch, plans.status])

  async function change() {
    setError('')
    try { await dispatch(updatePlan({ event, planned: !planned })).unwrap() }
    catch (failure) { setError(requestMessage(failure)) }
  }

  if (plans.status !== 'ready') return <Loading state={plans} retry={() => { void dispatch(loadPlans()) }} />
  return <section className="event-plan" aria-label="Планы участия">
    {planned && <p className="accent" role="status">Хакатон добавлен в ваши планы.</p>}
    <div className="event-detail-actions">
      <button className={planned ? 'event-secondary' : 'primary'} type="button" disabled={pending} onClick={() => { void change() }}>
        {pending ? 'Сохраняем…' : planned ? 'Убрать из планов' : 'Хочу участвовать'}
      </button>
      {planned && <button className="hint" type="button" onClick={openPlans}>Мои хакатоны</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}

export function MyHackathonsPage({ back, calendar, open }: { back: () => void; calendar: () => void; open: (event: Hackathon) => void }) {
  const dispatch = useAppDispatch()
  const plans = useAppSelector(selectPlans)
  useEffect(() => {
    if (plans.status === 'idle') void dispatch(loadPlans())
  }, [dispatch, plans.status])
  return <>
    <Header title="Мои хакатоны" actions={{ up: back }}><Back direction="↑" onClick={back} to="Назад" /></Header>
    {plans.status !== 'ready' ? <Loading state={plans} retry={() => { void dispatch(loadPlans()) }} /> : plans.value.length === 0 ? <div className="empty">
      <p>Хакатоны, в которых вы планируете участвовать, появятся здесь.</p>
      <button type="button" className="primary" onClick={calendar}>Открыть календарь</button>
    </div> : <ul className="journey-list">
      {[...plans.value].sort((a, b) => a.startsOn.localeCompare(b.startsOn)).map(event => <li key={event.id} className="journey-card">
        <div><h2>{event.title}</h2><p className="muted"><time dateTime={event.startsOn}>{new Date(event.startsOn).toLocaleDateString('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</time> · {event.location}</p></div>
        <button className="event-secondary" type="button" onClick={() => open(event)}>Открыть событие</button>
      </li>)}
    </ul>}
  </>
}

const statusLabels = { pending: 'Ожидает ответа', accepted: 'Принято', declined: 'Отклонено' }

export function InvitationsPage({ back, demo, openEvent }: {
  back: () => void; demo: boolean; openEvent: (id: string) => void
}) {
  const dispatch = useAppDispatch()
  const invitations = useAppSelector(selectInvitations)
  const pending = useAppSelector(selectReplyPending)
  const [preview, setPreview] = useState<string>()
  const [error, setError] = useState('')

  useEffect(() => {
    void dispatch(loadInvitations())
    const refresh = () => { void dispatch(loadInvitations()) }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [dispatch])

  async function reply(invitation: Invitation, status: InvitationReply, asRecipient: boolean) {
    setError('')
    try {
      await dispatch(replyToInvitation({ id: invitation.id, status, preview: asRecipient })).unwrap()
      if (asRecipient) setPreview(undefined)
    }
    catch (failure) { setError(requestMessage(failure)) }
  }

  function card(invitation: Invitation) {
    const { id, person, event, status, direction } = invitation
    const asRecipient = demo && direction === 'outgoing' && preview === id
    const canReply = status === 'pending' && (direction === 'incoming' || asRecipient)
    const username = person.telegramUsername
    const contact = status === 'accepted' && username && /^[A-Za-z0-9_]{1,32}$/.test(username) ? `https://t.me/${username}` : undefined
    return <li className="journey-card invitation-card" key={id}>
      <div className="invitation-heading">
        <h3>{person.name}</h3>
        <span className={`invitation-status ${status}`}>{statusLabels[status]}</span>
      </div>
      {event ? <button type="button" className="hint invitation-event" onClick={() => openEvent(event.id)}>{event.title}</button>
        : <p className="muted">Без привязки к хакатону</p>}
      {demo && direction === 'outgoing' && status === 'pending' && <button className="hint" type="button" onClick={() => setPreview(asRecipient ? undefined : id)}>
        {asRecipient ? 'Закрыть демо-просмотр' : 'Посмотреть со стороны получателя'}
      </button>}
      {asRecipient && <p className="muted">Деморежим. Вы отвечаете от лица {person.name}.</p>}
      {canReply && <div className="event-detail-actions">
        <button className="primary" type="button" disabled={pending !== null} onClick={() => { void reply(invitation, 'accepted', asRecipient) }}>Принять</button>
        <button className="event-secondary" type="button" disabled={pending !== null} onClick={() => { void reply(invitation, 'declined', asRecipient) }}>Отклонить</button>
      </div>}
      {contact && <a className="event-secondary" href={contact} target="_blank" rel="noreferrer">Написать в Telegram</a>}
      {status === 'accepted' && !contact && <p className="muted">{demo ? 'В реальном режиме здесь появится контакт собеседника в Telegram.' : 'Собеседник не указал имя пользователя в Telegram.'}</p>}
    </li>
  }

  return <>
    <Header title="Приглашения" actions={{ up: back }}><Back direction="↑" onClick={back} to="Назад" /></Header>
    {invitations.status !== 'ready' ? <Loading state={invitations} retry={() => { void dispatch(loadInvitations()) }} /> : <>
      <button className="event-secondary" type="button" disabled={pending !== null} onClick={() => { void dispatch(loadInvitations()) }}>Обновить приглашения</button>
      {error && <p className="error invitation-error" role="alert">{error}</p>}
      <div className="invitation-columns">
        {(['incoming', 'outgoing'] as const).map(direction => {
          const entries = invitations.value.filter(item => item.direction === direction)
          return <section key={direction}>
            <h2>{direction === 'incoming' ? 'Входящие' : 'Исходящие'}</h2>
            {entries.length ? <ul className="journey-list">{entries.map(card)}</ul> : <p className="muted">Приглашений пока нет.</p>}
          </section>
        })}
      </div>
    </>}
  </>
}
