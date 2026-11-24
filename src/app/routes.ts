import { matchPath } from 'react-router-dom'

export const routes = {
  home: '/',
  calendar: '/calendar',
  event: '/calendar/:eventId',
  eventTeam: '/calendar/:eventId/team/:personId?',
  people: '/people/:personId?',
  settings: '/settings',
} as const

export function eventPath(eventId: string) {
  return `${routes.calendar}/${encodeURIComponent(eventId)}`
}

export function teamPath(eventId?: string, personId?: string) {
  const path = eventId === undefined ? '/people' : `${eventPath(eventId)}/team`
  return personId === undefined ? path : `${path}/${encodeURIComponent(personId)}`
}

export function screenFor(pathname: string) {
  const teamMatch = matchPath(routes.eventTeam, pathname) ?? matchPath(routes.people, pathname)
  if (teamMatch) return teamMatch.params.personId ? 'detail' : 'people'
  if (matchPath(routes.settings, pathname)) return 'settings'
  if (matchPath(routes.event, pathname)) return 'event'
  if (matchPath(routes.calendar, pathname)) return 'calendar'
  return 'home'
}

export function backPath(pathname: string, from?: string) {
  const eventTeam = matchPath(routes.eventTeam, pathname)
  if (eventTeam?.params.eventId) {
    const event = `${routes.calendar}/${pathname.split('/')[2]}`
    if (eventTeam.params.personId) return `${event}/team`
    return from === routes.calendar ? routes.calendar : event
  }
  if (matchPath(routes.event, pathname)) return routes.calendar
  if (matchPath(routes.people, pathname)?.params.personId) return teamPath()
  return routes.home
}
