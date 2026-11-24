import { describe, expect, it } from 'vitest'
import { backPath, eventPath, screenFor, teamPath } from './routes'

describe('application routes', () => {
  it('distinguishes each screen and handles an unknown route', () => {
    expect(['/', '/calendar', '/calendar/ai-weekend', '/people', '/people/sasha', '/settings', '/unknown'].map(screenFor))
      .toEqual(['home', 'calendar', 'event', 'people', 'detail', 'settings', 'home'])
  })

  it('keeps event and participant IDs in separate encoded segments', () => {
    expect(eventPath('demo / test')).toBe('/calendar/demo%20%2F%20test')
    const profile = teamPath('demo / test', 'user?1')
    expect(profile).toBe('/calendar/demo%20%2F%20test/team/user%3F1')
    expect(screenFor(profile)).toBe('detail')
    expect(backPath(profile)).toBe('/calendar/demo%20%2F%20test/team')
  })

  it('returns from a team search to its origin and supports direct links', () => {
    expect(backPath(teamPath('ai-weekend'), '/calendar')).toBe('/calendar')
    expect(backPath(teamPath('ai-weekend'))).toBe('/calendar/ai-weekend')
    expect(backPath(teamPath(undefined, 'sasha'))).toBe('/people')
    expect(backPath('/calendar/%/team')).toBe('/calendar/%')
  })
})
