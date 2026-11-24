import { createDemoApi } from './demo'
import type { Api } from './types'

function eventQuery(eventId?: string) {
  return eventId ? `?${new URLSearchParams({ eventId })}` : ''
}

function createHttpApi(base: string, initData: string): Api {
  let session: Promise<string> | undefined
  const root = base.replace(/\/+$/, '')

  async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    if (options.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(`${root}${path}`, { ...options, headers, cache: 'no-store' })
    if (!response.ok) {
      if (response.status === 401) session = undefined
      throw new Error(response.status === 401
        ? 'Сессия недействительна. Откройте Mini App заново в Telegram.'
        : 'Не удалось выполнить запрос. Попробуйте ещё раз.')
    }
    return response.status === 204 ? undefined as T : response.json()
  }

  async function authenticated<T>(path: string, options?: RequestInit): Promise<T> {
    if (!initData) throw new Error('Для входа откройте Mini App внутри Telegram.')
    session ??= request<{ accessToken: string }>('/auth/telegram', {
      method: 'POST', body: JSON.stringify({ initData }),
    }).then(result => result.accessToken).catch(error => {
      session = undefined
      throw error
    })
    return request<T>(path, options, await session)
  }

  return {
    profile: () => authenticated('/me'),
    saveProfile: value => authenticated('/me', { method: 'PUT', body: JSON.stringify(value) }),
    events: () => authenticated('/events'),
    people: eventId => authenticated(`/people${eventQuery(eventId)}`),
    invite: (id, eventId) => authenticated(`/people/${encodeURIComponent(id)}/invitation${eventQuery(eventId)}`, { method: 'PUT' }),
    savePreferences: value => authenticated('/me/preferences', {
      method: 'PUT', body: JSON.stringify(value),
    }),
  }
}

export function createApi(initData: string) {
  const base = import.meta.env.VITE_API_BASE_URL?.trim()
  return { api: base ? createHttpApi(base, initData) : createDemoApi(), demo: !base }
}
