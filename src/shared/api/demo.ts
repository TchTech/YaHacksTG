import photo from '../media/participant.webp'
import type { Api, OwnProfile, Person, Preferences } from './types'

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

const events = [
  { id: 'ai-weekend', title: 'AI Weekend', startsOn: '2026-10-24', endsOn: '2026-10-26', location: 'Онлайн', tags: ['AI Agents', 'ML'] },
  { id: 'data-cup', title: 'Student Data Cup', startsOn: '2026-10-28', endsOn: '2026-10-30', location: 'Москва', tags: ['Data Science'] },
  { id: 'ml-challenge', title: 'ML Challenge', startsOn: '2026-11-08', endsOn: '2026-11-10', location: 'Онлайн', tags: ['Машинное обучение'] },
  { id: 'product-hack', title: 'Product Hack', startsOn: '2026-11-15', endsOn: '2026-11-16', location: 'Санкт-Петербург', tags: ['ML', 'Продукт'] },
]

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
  const invited = new Set<string>()
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
    async people() { return people.filter(person => !invited.has(person.id)) },
    async invite(personId) { invited.add(personId) },
    async savePreferences(value) {
      preferences = value
      try { localStorage.setItem('yahacks-demo-preferences', JSON.stringify(value)) } catch { /* Keep settings in memory. */ }
      return value
    },
  }
}
