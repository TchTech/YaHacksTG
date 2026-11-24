import { describe, expect, it, vi } from 'vitest'
import { createDemoApi } from '../shared/api/demo'
import type { Hackathon } from '../shared/api/types'
import { createAppStore, invitePerson, loadEvents, loadPeople, loadProfile, savePreferences, selectEvents, selectPeople, selectProfile } from './store'

describe('Redux resources', () => {
  it('loads a profile, saves preferences and invalidates recommendations', async () => {
    const store = createAppStore(createDemoApi())
    expect(selectProfile(store.getState()).status).toBe('idle')
    const request = store.dispatch(loadProfile())
    expect(selectProfile(store.getState()).status).toBe('loading')
    await request.unwrap()
    await store.dispatch(loadEvents()).unwrap()
    await store.dispatch(loadPeople(undefined)).unwrap()
    const preferences = { role: 'Backend Developer', format: 'online', reminderDays: 1 } as const
    await store.dispatch(savePreferences(preferences)).unwrap()
    expect(selectProfile(store.getState())).toMatchObject({ status: 'ready', value: { preferences } })
    expect(selectPeople(store.getState()).people.status).toBe('idle')
    expect(selectEvents(store.getState()).status).toBe('idle')
    expect((await store.dispatch(loadEvents()).unwrap()).every(event => event.location === 'Онлайн')).toBe(true)
  })

  it('surfaces a request error and permits a successful retry', async () => {
    const api = createDemoApi()
    vi.spyOn(api, 'events').mockRejectedValueOnce(new Error('Сервис недоступен'))
    const store = createAppStore(api)
    await store.dispatch(loadEvents())
    expect(selectEvents(store.getState())).toEqual({ status: 'error', message: 'Сервис недоступен' })
    await store.dispatch(loadEvents()).unwrap()
    expect(selectEvents(store.getState()).status).toBe('ready')
  })

  it('ignores an old calendar response after saving settings', async () => {
    const api = createDemoApi()
    let finish!: (events: Hackathon[]) => void
    vi.spyOn(api, 'events').mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const store = createAppStore(api)
    const outdated = store.dispatch(loadEvents())
    await store.dispatch(savePreferences({ role: 'ML Engineer', format: 'online', reminderDays: 2 })).unwrap()
    const onlineEvents = await store.dispatch(loadEvents()).unwrap()
    finish([])
    await outdated
    expect(selectEvents(store.getState())).toEqual({ status: 'ready', value: onlineEvents })
  })

  it('deduplicates invitations and keeps recommendations separate per event', async () => {
    const api = createDemoApi()
    const invite = vi.spyOn(api, 'invite')
    const store = createAppStore(api)
    await Promise.all([store.dispatch(loadPeople('ai-weekend')), store.dispatch(loadPeople('ml-challenge'))])
    const target = { personId: 'sasha', eventId: 'ai-weekend' }
    const first = store.dispatch(invitePerson(target))
    const repeated = store.dispatch(invitePerson(target))
    await Promise.all([first, repeated])
    expect(invite).toHaveBeenCalledExactlyOnceWith('sasha', 'ai-weekend')
    const ai = selectPeople(store.getState(), 'ai-weekend').people
    const ml = selectPeople(store.getState(), 'ml-challenge').people
    expect(ai.status === 'ready' && ai.value.map(person => person.id)).toEqual(['misha'])
    expect(ml.status === 'ready' && ml.value.map(person => person.id)).toEqual(['sasha'])
  })
})
