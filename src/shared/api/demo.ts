import photo from '../media/participant.webp'
import aiWeekend from '../media/events/ai-weekend.webp'
import studentDataCup from '../media/events/student-data-cup.webp'
import mlChallenge from '../media/events/ml-challenge.webp'
import productHack from '../media/events/product-hack.webp'
import type { Api, Hackathon, Invitation, InvitationReply, Person, Preferences, Profile, TeamSearch } from './types'

const defaultPreferences: Preferences = { role: 'ML Engineer', format: 'any', reminderDays: 2 }
const basePerson: Person = {
  id: 'sasha', name: 'Саша', age: 21, city: 'Санкт-Петербург', avatarUrl: photo,
  role: 'ML Engineer', status: 'Ищет команду', skills: ['Python', 'PyTorch', 'LLM'],
  summary: 'Работаю с моделями и AI-агентами. Ищу команду на ближайший хакатон.',
  about: 'Работаю с LLM и рекомендательными системами. Ищу команду для совместной работы над полезным продуктом.',
  teams: ['Data Team · ML-разработчик'],
  achievements: ['Финалист AI Challenge', '2 место · Student Data Cup'],
  projects: ['Поиск научных статей с помощью AI', 'Рекомендательная система', 'Чат-бот для команды'],
}

const people: Person[] = [
  basePerson,
  {
    id: 'misha', name: 'Миша', age: 23, city: 'Москва', role: 'Backend Developer',
    status: 'Ищет команду', skills: ['Go', 'PostgreSQL', 'Docker'],
    summary: 'Проектирую API и помогаю командам запускать сервисы.',
    about: 'Участвую в хакатонах по аналитике и городским сервисам.',
    teams: ['Data Team'], achievements: ['Финалист Product Hack'], projects: ['Карта городских сервисов'],
  },
  {
    id: 'anton', name: 'Антон', age: 22, city: 'Казань', role: 'Product Designer',
    status: 'Ищет команду', skills: ['Figma', 'UX', 'Прототипы'],
    summary: 'Проверяю гипотезы и собираю прототипы для презентаций.',
    about: 'Люблю работать на стыке исследования пользователей и дизайна продукта.',
    teams: [], achievements: [], projects: ['Навигатор по хакатонам'],
  },
]

function demoDates(startOffset: number, endOffset: number) {
  const today = new Date()
  const date = (offset: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset)).toISOString().slice(0, 10)
  return { startsOn: date(startOffset), endsOn: date(endOffset) }
}

const events: Hackathon[] = [
  {
    id: 'ai-weekend', title: 'AI Weekend', ...demoDates(-2, 1), location: 'Онлайн',
    tags: ['AI Agents', 'ML'], previewUrl: aiWeekend, prizePool: '500 000 ₽',
    description: 'Соберите AI-агента для конкретной пользовательской задачи. За выходные нужно создать прототип, проверить его на нескольких сценариях и показать жюри, где агент экономит время или улучшает результат.',
  },
  {
    id: 'data-cup', title: 'Student Data Cup', ...demoDates(-1, 2), location: 'Москва',
    tags: ['Data Science'], previewUrl: studentDataCup, prizePool: '300 000 ₽',
    description: 'Разберите набор данных, сформулируйте гипотезу и соберите модель для решения кейса. На защите команды покажут метрики и объяснят, как использовать результат на практике.',
  },
  {
    id: 'ml-challenge', title: 'ML Challenge', ...demoDates(15, 17), location: 'Онлайн',
    tags: ['Машинное обучение'], previewUrl: mlChallenge, prizePool: '750 000 ₽',
    description: 'Постройте воспроизводимый пайплайн машинного обучения и улучшите базовую модель. Финальные решения сравнят по качеству на отложенной выборке и по скорости работы.',
  },
  {
    id: 'product-hack', title: 'Product Hack', ...demoDates(22, 23), location: 'Санкт-Петербург',
    tags: ['ML', 'Продукт'], previewUrl: productHack, prizePool: '400 000 ₽',
    description: 'Выберите проблему из предложенных кейсов, проверьте идею и соберите интерактивный прототип. На финальной презентации покажите сценарий пользователя и объясните, как измерить ценность продукта.',
  },
]

const candidatesByEvent = new Map<string, string[]>([
  ['ai-weekend', ['sasha', 'misha']],
  ['data-cup', ['misha', 'sasha']],
  ['ml-challenge', ['sasha']],
  ['product-hack', ['anton', 'misha']],
])
const peopleById = new Map(people.map(person => [person.id, person]))
const eventsById = new Map(events.map(event => [event.id, event]))
const profileStorageKey = 'yahacks-demo-profile'
const teamSearchStorageKey = 'yahacks-demo-team-search'
const plansKey = 'yahacks-demo-planned-events'
const invitationsKey = 'yahacks-demo-invitations'

const previewInvitation: Invitation = {
  id: 'demo-incoming-product', direction: 'incoming', status: 'pending',
  person: { id: 'anton', name: 'Антон' }, event: { id: 'product-hack', title: 'Product Hack' },
}

function storedList<T>(key: string, fallback: T[]): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (Array.isArray(value)) return value
  } catch { /* Keep the demo usable without browser storage. */ }
  return fallback
}

function writeList(key: string, value: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the changes in memory. */ }
}

function readTeamSearch(): TeamSearch | null {
  try {
    const value = JSON.parse(localStorage.getItem(teamSearchStorageKey) ?? 'null')
    if (value?.kind === 'event' && typeof value.eventId === 'string' && typeof value.eventTitle === 'string') {
      return { kind: 'event', eventId: value.eventId, eventTitle: value.eventTitle }
    }
    if (value?.kind === 'other' && (value.title === undefined || typeof value.title === 'string')) {
      return { kind: 'other', title: value.title }
    }
  } catch { /* Storage may be unavailable in a preview WebView. */ }
  return null
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false
  const fields = value as Record<string, unknown>
  return typeof fields.name === 'string' && fields.name.trim().length > 0
    && ['role', 'status', 'summary', 'about'].every(key => typeof fields[key] === 'string')
    && ['city', 'avatarUrl'].every(key => fields[key] === undefined || typeof fields[key] === 'string')
    && (fields.age === undefined || (typeof fields.age === 'number' && Number.isSafeInteger(fields.age) && fields.age >= 0))
    && ['skills', 'teams', 'achievements', 'projects'].every(key => {
      const list = fields[key]
      return Array.isArray(list) && list.every(item => typeof item === 'string')
    })
}

function readProfile(): Profile | undefined {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(profileStorageKey) ?? 'null')
    if (isProfile(value)) return value
  } catch { /* Storage may be unavailable in a preview WebView. */ }
}

function readPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem('yahacks-demo-preferences') ?? 'null')
    if (value && typeof value.role === 'string' && ['online', 'in-person', 'any'].includes(value.format)
        && [0, 1, 2, 7].includes(value.reminderDays)) return value
  } catch {
    // Storage may be unavailable in a preview WebView.
  }
  return defaultPreferences
}

export function createDemoApi(): Api {
  let preferences = readPreferences()
  let ownProfile = readProfile()
  let teamSearch = readTeamSearch()
  let plans: string[] = []
  let invitations = [previewInvitation]

  function readInvitations() {
    return storedList(invitationsKey, invitations).map(item => {
      const avatarUrl = peopleById.get(item.person.id)?.avatarUrl
      return avatarUrl ? { ...item, person: { ...item.person, avatarUrl } } : item
    })
  }

  function updateInvitations(value: Invitation[]) {
    invitations = value
    writeList(invitationsKey, invitations)
  }

  function reply(id: string, status: InvitationReply, direction: Invitation['direction']) {
    const current = readInvitations()
    const invitation = current.find(item => item.id === id && item.direction === direction)
    if (!invitation) throw new Error('Приглашение недоступно.')
    if (invitation.status !== 'pending') {
      if (invitation.status === status) return invitation
      throw new Error('На это приглашение уже ответили.')
    }
    const updated = { ...invitation, status }
    updateInvitations(current.map(item => item.id === id ? updated : item))
    return updated
  }
  return {
    async profile() {
      const fields = ownProfile ?? {
        name: 'Алекс', role: preferences.role, status: 'Открыт к приглашениям',
        skills: ['ML', 'AI Agents', 'Python'], summary: '', about: '',
        teams: ['Data Team'], achievements: basePerson.achievements, projects: basePerson.projects,
      }
      return { ...fields, preferences, ...(teamSearch ? { teamSearch } : {}) }
    },
    async saveProfile(value) {
      ownProfile = value
      try { localStorage.setItem(profileStorageKey, JSON.stringify(value)) } catch { /* Keep the profile in memory. */ }
      return value
    },
    async saveTeamSearch(value) {
      teamSearch = value
      try { localStorage.setItem(teamSearchStorageKey, JSON.stringify(value)) } catch { /* Keep the mode in memory. */ }
      return value
    },
    async events() {
      return events.filter(event => preferences.format === 'any'
        || (event.location === 'Онлайн') === (preferences.format === 'online'))
    },
    async event(id) { return eventsById.get(id) ?? null },
    async plannedEvents() {
      const selected = new Set(storedList(plansKey, plans))
      return events.filter(event => selected.has(event.id))
    },
    async setEventPlan(id, planned) {
      if (!eventsById.has(id)) throw new Error('Хакатон не найден.')
      const selected = new Set(storedList(plansKey, plans))
      if (planned) selected.add(id)
      else selected.delete(id)
      plans = [...selected]
      writeList(plansKey, plans)
    },
    async ongoingEvents() {
      const today = demoDates(0, 0).startsOn
      return events.filter(event => event.startsOn <= today && today <= event.endsOn)
    },
    async people(eventId) {
      const invited = new Set(readInvitations().filter(item => item.direction === 'outgoing' && item.event?.id === eventId)
        .map(item => item.person.id))
      if (eventId === undefined) return people.filter(person => !invited.has(person.id))
      const candidates = candidatesByEvent.get(eventId) ?? []
      return candidates.flatMap(id => {
        const person = peopleById.get(id)
        return person && !invited.has(id) ? [person] : []
      })
    },
    async person(id) { return peopleById.get(id) ?? null },
    async invite(personId, eventId) {
      const person = peopleById.get(personId)
      const event = eventId === undefined ? undefined : eventsById.get(eventId)
      if (!person || (eventId !== undefined && !event)) throw new Error('Участник или хакатон не найдены.')
      const current = readInvitations()
      const id = JSON.stringify([personId, eventId ?? null])
      if (!current.some(item => item.id === id)) updateInvitations([{
        id, direction: 'outgoing', status: 'pending', person: { id: person.id, name: person.name },
        ...(event ? { event: { id: event.id, title: event.title } } : {}),
      }, ...current])
    },
    async invitations() { return readInvitations() },
    async replyToInvitation(id, status) { return reply(id, status, 'incoming') },
    async replyAsDemoRecipient(id, status) { return reply(id, status, 'outgoing') },
    async savePreferences(value) {
      preferences = value
      try { localStorage.setItem('yahacks-demo-preferences', JSON.stringify(value)) } catch { /* Keep settings in memory. */ }
      return value
    },
  }
}
