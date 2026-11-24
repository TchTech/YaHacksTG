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
    expect(screen.getByText('500 000 ₽')).toBeTruthy()
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

  it('validates and saves preferences in demo mode', async () => {
    renderApp('/settings')
    const role = await screen.findByRole('textbox', { name: 'Роль' })
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Сохранить' })
    fireEvent.change(role, { target: { value: '   ' } })
    expect(submit.disabled).toBe(true)
    fireEvent.change(role, { target: { value: 'QA Engineer' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Формат событий' }), { target: { value: 'online' } })
    fireEvent.click(submit)
    expect(await screen.findByText('Настройки сохранены')).toBeTruthy()
    expect(localStorage.getItem('yahacks-demo-preferences')).toContain('QA Engineer')
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
