import photo from '../media/participant.webp'
import aiWeekend from '../media/events/ai-weekend.webp'
import studentDataCup from '../media/events/student-data-cup.webp'
import mlChallenge from '../media/events/ml-challenge.webp'
import productHack from '../media/events/product-hack.webp'
import type { Api, Hackathon, OwnProfile, Person, Preferences } from './types'

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

const events: Hackathon[] = [
  {
    id: 'ai-weekend', title: 'AI Weekend', startsOn: '2026-10-24', endsOn: '2026-10-26', location: 'Онлайн',
    tags: ['AI Agents', 'ML'], previewUrl: aiWeekend, prizePool: '500 000 ₽',
    description: 'Соберите AI-агента для конкретной пользовательской задачи. За выходные нужно создать прототип, проверить его на нескольких сценариях и показать жюри, где агент экономит время или улучшает результат.',
  },
  {
    id: 'data-cup', title: 'Student Data Cup', startsOn: '2026-10-28', endsOn: '2026-10-30', location: 'Москва',
    tags: ['Data Science'], previewUrl: studentDataCup, prizePool: '300 000 ₽',
    description: 'Разберите набор данных, сформулируйте гипотезу и соберите модель для решения кейса. На защите команды покажут метрики и объяснят, как использовать результат на практике.',
  },
  {
    id: 'ml-challenge', title: 'ML Challenge', startsOn: '2026-11-08', endsOn: '2026-11-10', location: 'Онлайн',
    tags: ['Машинное обучение'], previewUrl: mlChallenge, prizePool: '750 000 ₽',
    description: 'Постройте воспроизводимый пайплайн машинного обучения и улучшите базовую модель. Финальные решения сравнят по качеству на отложенной выборке и по скорости работы.',
  },
  {
    id: 'product-hack', title: 'Product Hack', startsOn: '2026-11-15', endsOn: '2026-11-16', location: 'Санкт-Петербург',
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
  const invitedByEvent = new Map<string | undefined, Set<string>>()
  return {
    async profile() {
      const profile: OwnProfile = {
        name: 'Алекс', role: preferences.role, status: 'Открыт к приглашениям',
        skills: ['ML', 'AI Agents', 'Python'], summary: '', about: '',
        teams: ['Data Team'], achievements: basePerson.achievements, projects: basePerson.projects, preferences,
      }
      return profile
    },
    async events() {
      return events.filter(event => preferences.format === 'any'
        || (event.location === 'Онлайн') === (preferences.format === 'online'))
    },
    async people(eventId) {
      const invited = invitedByEvent.get(eventId)
      if (eventId === undefined) return people.filter(person => !invited?.has(person.id))
      const candidates = candidatesByEvent.get(eventId) ?? []
      return candidates.flatMap(id => {
        const person = peopleById.get(id)
        return person && !invited?.has(id) ? [person] : []
      })
    },
    async invite(personId, eventId) {
      const invited = invitedByEvent.get(eventId) ?? new Set<string>()
      invited.add(personId)
      invitedByEvent.set(eventId, invited)
    },
    async savePreferences(value) {
      preferences = value
      try { localStorage.setItem('yahacks-demo-preferences', JSON.stringify(value)) } catch { /* Keep settings in memory. */ }
      return value
    },
  }
}
