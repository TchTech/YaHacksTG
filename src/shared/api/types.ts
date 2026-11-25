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

type TelegramAvatar = { telegramAvatarUrl?: string }
export type AvatarProfile = Pick<Profile, 'name' | 'avatarUrl'> & TelegramAvatar
export type Person = Profile & TelegramAvatar & { id: string }
export type TeamSearch =
  | { kind: 'event'; eventId: string; eventTitle: string }
  | { kind: 'other'; title?: string }

export type OwnProfile = Profile & TelegramAvatar & { preferences: Preferences; teamSearch?: TeamSearch | null }

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
  registrationUrl?: string
}

export type InvitationReply = 'accepted' | 'declined'
export type Invitation = {
  id: string
  direction: 'incoming' | 'outgoing'
  status: 'pending' | InvitationReply
  person: AvatarProfile & { id: string; telegramUsername?: string }
  event?: { id: string; title: string }
}

export interface Api {
  profile(): Promise<OwnProfile>
  saveProfile(profile: Profile): Promise<Profile>
  saveTeamSearch(mode: TeamSearch | null): Promise<TeamSearch | null>
  events(): Promise<Hackathon[]>
  event(id: string): Promise<Hackathon | null>
  plannedEvents(): Promise<Hackathon[]>
  setEventPlan(id: string, planned: boolean): Promise<void>
  ongoingEvents(): Promise<Hackathon[]>
  people(eventId?: string): Promise<Person[]>
  person(id: string): Promise<Person | null>
  invite(personId: string, eventId?: string): Promise<void>
  invitations(): Promise<Invitation[]>
  replyToInvitation(id: string, reply: InvitationReply): Promise<Invitation>
  replyAsDemoRecipient?(id: string, reply: InvitationReply): Promise<Invitation>
  savePreferences(preferences: Preferences): Promise<Preferences>
}
