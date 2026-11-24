export type Preferences = {
  role: string
  format: 'online' | 'in-person' | 'any'
  reminderDays: 0 | 1 | 2 | 7
}

export type Profile = {
  name: string
  age?: number
  city?: string
  avatarUrl?: string
  role: string
  status: string
  skills: string[]
  summary: string
  about: string
  teams: string[]
  achievements: string[]
  projects: string[]
}

export type Person = Profile & { id: string }
export type OwnProfile = Profile & { preferences: Preferences }

export type Hackathon = {
  id: string
  title: string
  startsOn: string
  endsOn: string
  location: string
  tags: string[]
  previewUrl?: string
  prizePool?: string
  description?: string
  eventUrl?: string
}

export interface Api {
  profile(): Promise<OwnProfile>
  saveProfile(profile: Profile): Promise<Profile>
  events(): Promise<Hackathon[]>
  people(eventId?: string): Promise<Person[]>
  invite(personId: string, eventId?: string): Promise<void>
  savePreferences(preferences: Preferences): Promise<Preferences>
}
