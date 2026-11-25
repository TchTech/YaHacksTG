// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoApi } from '../shared/api/demo'
import { App } from './App'
import { createAppStore } from './store'

function LocationProbe() {
  return <output data-testid="pathname">{useLocation().pathname}</output>
}

function renderApp(path = '/', api = createDemoApi()) {
  return render(<Provider store={createAppStore(api)}><MemoryRouter initialEntries={[path]}>
    <App demo /><LocationProbe />
  </MemoryRouter></Provider>)
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('YaHacks MVP', () => {
  it('opens an event, finds a team and returns to the event', async () => {
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Календарь событий' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подробнее о событии AI Weekend' }))
    expect(screen.getByTestId('pathname').textContent).toBe('/calendar/ai-weekend')
    expect(await screen.findByText('500 000 ₽')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Найти команду' }))
    expect(await screen.findByRole('heading', { name: 'Саша, 21' })).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toBe('/calendar/ai-weekend/team')
    fireEvent.click(screen.getByRole('button', { name: /Запрос в команду/ }))
    expect(await screen.findByRole('heading', { name: 'Миша, 23' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'К событию' }))
    expect(await screen.findByRole('heading', { name: 'AI Weekend' })).toBeTruthy()
  })

  it('loads a linked participant and returns to the same event team', async () => {
    renderApp('/calendar/product-hack/team/anton')
    expect(await screen.findByRole('heading', { name: 'Антон' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'К карточке' }))
    expect(await screen.findByRole('heading', { name: 'Антон, 22' })).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toBe('/calendar/product-hack/team')
  })

  it('shows the hackathon website alongside a separate registration link', async () => {
    const api = createDemoApi()
    const event = (await api.event('ai-weekend'))!
    vi.spyOn(api, 'event').mockResolvedValue({
      ...event, eventUrl: 'https://example.org/ai-weekend', registrationUrl: 'https://example.org/register',
    })
    renderApp('/calendar/ai-weekend', api)
    const site = await screen.findByRole<HTMLAnchorElement>('link', { name: 'Сайт хакатона' })
    expect(site.href).toBe('https://example.org/ai-weekend')
    expect(site.target).toBe('_blank')
    expect(screen.getByRole<HTMLAnchorElement>('link', { name: 'Перейти к регистрации' }).href).toBe('https://example.org/register')
  })

  it('saves and removes plans, and opens a linked event regardless of calendar preferences', async () => {
    localStorage.setItem('yahacks-demo-preferences', JSON.stringify({ role: 'ML Engineer', format: 'online', reminderDays: 2 }))
    renderApp('/calendar/data-cup')
    expect(await screen.findByRole('heading', { name: 'Student Data Cup' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Хочу участвовать' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Мои хакатоны' }))
    expect(await screen.findByRole('heading', { name: 'Мои хакатоны' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Student Data Cup' })).toBeTruthy()
    expect((await createDemoApi().plannedEvents()).map(event => event.id)).toEqual(['data-cup'])
    fireEvent.click(screen.getByRole('button', { name: 'Открыть событие' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Убрать из планов' }))
    expect(await screen.findByRole('button', { name: 'Хочу участвовать' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(await screen.findByRole('button', { name: 'Открыть календарь' })).toBeTruthy()
  })

  it('finds a team from the calendar, tracks an invitation and persists the recipient response', async () => {
    renderApp('/calendar')
    fireEvent.click(await screen.findByRole('button', { name: 'Найти команду для AI Weekend' }))
    expect((await screen.findByRole('heading', { name: 'Саша, 21' })).textContent).toBe('Саша, 21')
    expect(await createDemoApi().plannedEvents()).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: /Запрос в команду/ }))
    expect(await screen.findByRole('heading', { name: 'Миша, 23' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Приглашения' }))
    const outgoing = within((await screen.findByRole('heading', { name: 'Исходящие' })).closest('section')!)
    expect(outgoing.getByText('Ожидает ответа')).toBeTruthy()
    expect(outgoing.getByRole('heading', { name: 'Саша' }).parentElement?.querySelector('.avatar img')).toBeTruthy()
    expect(outgoing.getByRole('button', { name: 'AI Weekend' })).toBeTruthy()
    fireEvent.click(outgoing.getByRole('button', { name: 'Посмотреть со стороны получателя' }))
    fireEvent.click(outgoing.getByRole('button', { name: 'Принять' }))
    expect(await outgoing.findByText('Принято')).toBeTruthy()
    expect(outgoing.getByRole('heading', { name: 'Саша' }).parentElement?.querySelector('.avatar img')).toBeTruthy()
    expect(document.querySelector('.invitation-confetti')).toBeNull()
    expect(outgoing.queryByRole('link', { name: 'Написать в Telegram' })).toBeNull()
    const incoming = within(screen.getByRole('heading', { name: 'Входящие' }).closest('section')!)
    fireEvent.click(incoming.getByRole('button', { name: 'Отклонить' }))
    expect(await incoming.findByText('Отклонено')).toBeTruthy()
    expect((await createDemoApi().invitations()).map(item => item.status)).toEqual(['accepted', 'declined'])

    cleanup()
    renderApp('/calendar/ai-weekend/team/sasha')
    expect(await screen.findByRole('heading', { name: 'Саша' })).toBeTruthy()
  })

  it('only shows usable Telegram contacts for accepted invitations', async () => {
    const api = createDemoApi()
    vi.spyOn(api, 'invitations').mockResolvedValue([
      { id: 'pending', direction: 'outgoing', status: 'pending', person: { id: 'a', name: 'A', telegramUsername: 'valid_test' } },
      { id: 'accepted', direction: 'incoming', status: 'accepted', person: { id: 'b', name: 'B', telegramUsername: 'valid_test' } },
      { id: 'invalid', direction: 'incoming', status: 'accepted', person: { id: 'c', name: 'C', telegramUsername: 'https://example.org' } },
    ])
    renderApp('/invitations', api)
    const link = await screen.findByRole<HTMLAnchorElement>('link', { name: 'Написать в Telegram' })
    expect(link.href).toBe('https://t.me/valid_test')
    expect(screen.getAllByRole('link', { name: 'Написать в Telegram' })).toHaveLength(1)
  })

  it('prefers the Telegram photo and falls back to the profile photo or initial', async () => {
    const api = createDemoApi()
    vi.spyOn(api, 'invitations').mockResolvedValue([{
      id: 'pending', direction: 'incoming', status: 'pending',
      person: { id: 'anya', name: 'Аня', telegramAvatarUrl: 'https://example.org/telegram.jpg', avatarUrl: 'https://example.org/profile.jpg' },
    }])
    renderApp('/invitations', api)
    const heading = await screen.findByRole('heading', { name: 'Аня' })
    const avatar = heading.parentElement!.querySelector('.avatar')!
    const telegram = avatar.querySelector('img')!
    expect(telegram.src).toBe('https://example.org/telegram.jpg')
    fireEvent.error(telegram)
    const profile = avatar.querySelector('img')!
    expect(profile.src).toBe('https://example.org/profile.jpg')
    fireEvent.error(profile)
    expect(avatar.textContent).toBe('А')
  })

  it('can retry a failed invitation reply without changing its status prematurely', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList)
    const api = createDemoApi()
    vi.spyOn(api, 'replyToInvitation').mockRejectedValueOnce(new Error('Связь прервалась'))
    renderApp('/invitations', api)
    fireEvent.click(await screen.findByRole('button', { name: 'Принять' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Связь прервалась')
    expect(screen.getByText('Ожидает ответа')).toBeTruthy()
    expect(document.querySelector('.invitation-confetti')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Принять' }))
    expect(await screen.findByText('Принято')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    const particle = document.querySelector('.invitation-confetti > span')
    expect(particle).toBeTruthy()
    fireEvent.animationEnd(particle!)
    expect(document.querySelector('.invitation-confetti')).toBeNull()
  })

  it('validates and saves preferences in demo mode', async () => {
    const api = createDemoApi()
    const save = vi.spyOn(api, 'savePreferences')
    renderApp('/settings', api)
    const role = await screen.findByRole('textbox', { name: 'Роль' })
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Сохранить' })
    fireEvent.change(role, { target: { value: '   ' } })
    expect(submit.disabled).toBe(true)
    fireEvent.change(role, { target: { value: 'QA Engineer' } })
    const format = screen.getByRole('combobox', { name: 'Формат событий' })
    const reminders = screen.getByRole('combobox', { name: 'Напоминать о дедлайнах' })
    expect(format.getAttribute('aria-controls')).not.toBe(reminders.getAttribute('aria-controls'))
    fireEvent.click(format)
    fireEvent.click(reminders)
    expect(format.getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(reminders, { key: 'Home' })
    fireEvent.keyDown(reminders, { key: 'Enter' })
    expect(reminders.textContent).toBe('Выключено')
    fireEvent.click(format)
    fireEvent.click(screen.getByRole('option', { name: 'Онлайн' }))
    expect(format.textContent).toBe('Онлайн')
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(submit)
    expect(await screen.findByText('Настройки сохранены')).toBeTruthy()
    const expected = { role: 'QA Engineer', format: 'online', reminderDays: 0 }
    expect(save).toHaveBeenCalledExactlyOnceWith(expected)
    expect((await createDemoApi().profile()).preferences).toEqual(expected)
  })

  it('edits every personal field without changing recommendations, and restores them on reload', async () => {
    localStorage.setItem('yahacks-demo-preferences', JSON.stringify({ role: 'ML Engineer', format: 'online', reminderDays: 2 }))
    renderApp('/settings')
    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать профиль' }))
    const form = within(screen.getByRole('form', { name: 'Редактирование профиля' }))
    const fields = {
      Имя: '  Мария  ', Возраст: '24', Город: 'Пермь', 'Роль в профиле': 'Продуктовый дизайнер', Статус: 'Ищу команду',
      'Ссылка на фото': 'https://example.org/maria.jpg', 'Краткое описание': 'Разрабатываю интерфейсы', 'О себе': 'Люблю хакатоны',
      Навыки: 'Figma\nTypeScript\n  Figma  ', Команды: 'Команда Wave', Достижения: 'Финалист AI Weekend', 'Кейсы и проекты': 'Дизайн навигатора',
    }
    for (const [label, value] of Object.entries(fields)) fireEvent.change(form.getByLabelText(label), { target: { value } })
    fireEvent.click(form.getByRole('button', { name: 'Сохранить профиль' }))
    expect(await screen.findByText('Профиль сохранён')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Мария, 24' })).toBeTruthy()
    expect(screen.getByText('Люблю хакатоны')).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Роль' }).value).toBe('ML Engineer')
    expect(await createDemoApi().profile()).toEqual({
      name: 'Мария', age: 24, city: 'Пермь', role: 'Продуктовый дизайнер', status: 'Ищу команду', avatarUrl: 'https://example.org/maria.jpg',
      summary: 'Разрабатываю интерфейсы', about: 'Люблю хакатоны', skills: ['Figma', 'TypeScript'], teams: ['Команда Wave'],
      achievements: ['Финалист AI Weekend'], projects: ['Дизайн навигатора'], preferences: { role: 'ML Engineer', format: 'online', reminderDays: 2 },
    })
    fireEvent.click(screen.getByRole('button', { name: 'На главную' }))
    expect(await screen.findByText('Привет, Мария')).toBeTruthy()
  })

  it('retains the profile draft when validation or saving fails and discards it on cancel', async () => {
    const api = createDemoApi()
    const save = vi.spyOn(api, 'saveProfile').mockRejectedValueOnce(new Error('Не удалось сохранить профиль'))
    renderApp('/settings', api)
    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать профиль' }))
    const name = screen.getByLabelText<HTMLInputElement>('Имя')
    const photo = screen.getByLabelText<HTMLInputElement>('Ссылка на фото')
    const submit = screen.getByRole('button', { name: 'Сохранить профиль' })
    fireEvent.change(name, { target: { value: '   ' } })
    fireEvent.click(submit)
    expect((await screen.findByRole('alert')).textContent).toBe('Введите имя.')
    fireEvent.change(name, { target: { value: 'Мария' } })
    fireEvent.change(photo, { target: { value: 'ftp://example.org/photo' } })
    fireEvent.click(submit)
    expect((await screen.findByRole('alert')).textContent).toContain('Укажите ссылку на фото')
    expect(save).not.toHaveBeenCalled()
    fireEvent.change(photo, { target: { value: '' } })
    fireEvent.click(submit)
    expect(await screen.findByText('Не удалось сохранить профиль')).toBeTruthy()
    expect(name.value).toBe('Мария')
    fireEvent.click(submit)
    expect(await screen.findByText('Профиль сохранён')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать профиль' }))
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Черновик' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.getByRole('heading', { name: 'Мария' })).toBeTruthy()
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('saves a current hackathon independently of recommendations and allows turning the mode off', async () => {
    localStorage.setItem('yahacks-demo-preferences', JSON.stringify({ role: 'ML Engineer', format: 'online', reminderDays: 2 }))
    renderApp('/settings')
    fireEvent.click(await screen.findByRole('switch', { name: 'Ищу команду' }))
    const choice = screen.getByRole('combobox', { name: 'Хакатон' })
    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Сохранить режим' })
    expect(save.disabled).toBe(true)
    fireEvent.click(choice)
    const currentEvent = await screen.findByRole('option', { name: 'Student Data Cup' })
    expect(screen.queryByRole('option', { name: 'ML Challenge' })).toBeNull()
    fireEvent.click(currentEvent)
    fireEvent.click(save)
    expect(await screen.findByText('Режим поиска команды включён.')).toBeTruthy()
    expect((await createDemoApi().profile()).teamSearch).toEqual({ kind: 'event', eventId: 'data-cup', eventTitle: 'Student Data Cup' })

    fireEvent.click(screen.getByRole('button', { name: 'Редактировать профиль' }))
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Мария' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить профиль' }))
    expect(await screen.findByRole('heading', { name: 'Мария' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Хакатон' }).textContent).toContain('Student Data Cup')

    cleanup()
    renderApp('/settings')
    const toggle = await screen.findByRole<HTMLInputElement>('switch', { name: 'Ищу команду' })
    expect(toggle.checked).toBe(true)
    fireEvent.click(toggle)
    expect(screen.queryByRole('combobox', { name: 'Хакатон' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить режим' }))
    expect(await screen.findByText('Режим поиска команды выключен.')).toBeTruthy()
    expect((await createDemoApi().profile()).teamSearch).toBeUndefined()
  })

  it('offers another hackathon after a calendar error and keeps the choice on a failed save', async () => {
    const api = createDemoApi()
    const load = vi.spyOn(api, 'ongoingEvents').mockRejectedValueOnce(new Error('Не удалось загрузить хакатоны'))
    vi.spyOn(api, 'saveTeamSearch').mockRejectedValueOnce(new Error('Попробуйте сохранить ещё раз'))
    renderApp('/settings', api)
    fireEvent.click(await screen.findByRole('switch', { name: 'Ищу команду' }))
    expect(await screen.findByText('Не удалось загрузить хакатоны')).toBeTruthy()
    const choice = screen.getByRole('combobox', { name: 'Хакатон' })
    fireEvent.click(choice)
    fireEvent.click(screen.getByRole('option', { name: 'Другое' }))
    const title = screen.getByRole<HTMLInputElement>('textbox', { name: 'Название хакатона (необязательно)' })
    fireEvent.change(title, { target: { value: '  Weekend Sprint  ' } })
    const save = screen.getByRole('button', { name: 'Сохранить режим' })
    fireEvent.click(save)
    expect(await screen.findByText('Попробуйте сохранить ещё раз')).toBeTruthy()
    expect(title.value).toBe('  Weekend Sprint  ')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }))
    fireEvent.click(choice)
    expect(await screen.findByRole('option', { name: 'AI Weekend' })).toBeTruthy()
    fireEvent.keyDown(choice, { key: 'Escape' })
    fireEvent.click(save)
    expect(await screen.findByText('Режим поиска команды включён.')).toBeTruthy()
    expect((await createDemoApi().profile()).teamSearch).toEqual({ kind: 'other', title: 'Weekend Sprint' })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('opens, dismisses and selects hackathons with the keyboard', async () => {
    renderApp('/settings')
    fireEvent.click(await screen.findByRole('switch', { name: 'Ищу команду' }))
    const choice = screen.getByRole('combobox', { name: 'Хакатон' })
    choice.focus()
    fireEvent.keyDown(choice, { key: 'ArrowDown' })
    const firstEvent = await screen.findByRole('option', { name: 'AI Weekend' })
    fireEvent.keyDown(choice, { key: 'Home' })
    expect(choice.getAttribute('aria-activedescendant')).toBe(firstEvent.id)
    fireEvent.keyDown(choice, { key: 'ArrowDown' })
    expect(choice.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Student Data Cup' }).id)
    fireEvent.keyDown(choice, { key: 'Escape' })
    expect(choice.getAttribute('aria-expanded')).toBe('false')
    expect(choice.textContent).toBe('Выберите хакатон')
    fireEvent.keyDown(choice, { key: 'End' })
    fireEvent.keyDown(choice, { key: 'Enter' })
    expect(choice.textContent).toBe('Другое')
    expect(document.activeElement).toBe(choice)
    expect(screen.getByRole('textbox', { name: 'Название хакатона (необязательно)' })).toBeTruthy()
    fireEvent.click(choice)
    fireEvent.click(document.body)
    expect(choice.getAttribute('aria-expanded')).toBe('false')
  })

  it('shows loading, an error, a retry and an empty calendar', async () => {
    const api = createDemoApi()
    vi.spyOn(api, 'events').mockRejectedValueOnce(new Error('Календарь сейчас недоступен')).mockResolvedValueOnce([])
    renderApp('/calendar', api)
    expect(within(screen.getByRole('main')).getByText('Загрузка…')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toBe('Календарь сейчас недоступен')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Нет событий по вашим настройкам.')).toBeTruthy()
  })
})
