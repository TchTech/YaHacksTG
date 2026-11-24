import { configureStore, createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { Api, Hackathon, OwnProfile, Person, Preferences, Profile, TeamSearch } from '../shared/api/types'

export type Resource<T> =
  | { status: 'idle' }
  | { status: 'loading'; requestId: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: T }

type ProfileState = { profile: Resource<OwnProfile>; saving: boolean }
type CalendarState = { events: Resource<Hackathon[]>; ongoing: Resource<Hackathon[]> }
type PeopleScope = { people: Resource<Person[]>; inviting: boolean; inviteError: string; invited: string[] }
type PeopleState = Record<string, PeopleScope | undefined>
type RootState = { profile: ProfileState; calendar: CalendarState; people: PeopleState }

const idle = { status: 'idle' } as const
const emptyScope: PeopleScope = { people: idle, inviting: false, inviteError: '', invited: [] }
const scopeKey = (eventId?: string) => eventId === undefined ? 'general' : `event:${eventId}`

export const selectProfile = (state: RootState) => state.profile.profile
export const selectSaving = (state: RootState) => state.profile.saving
export const selectEvents = (state: RootState) => state.calendar.events
export const selectOngoingEvents = (state: RootState) => state.calendar.ongoing
export const selectPeople = (state: RootState, eventId?: string) => state.people[scopeKey(eventId)] ?? emptyScope

export function requestMessage(error: unknown) {
  if (typeof error === 'string') return error
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message : 'Не удалось соединиться с сервером. Попробуйте ещё раз.'
}

const thunk = createAsyncThunk.withTypes<{ state: RootState; extra: Api; rejectValue: string }>()

export const loadProfile = thunk('profile/load', async (_, { extra, rejectWithValue }) => {
  try { return await extra.profile() } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectProfile(getState()).status !== 'loading' && !selectSaving(getState()) })

export const saveProfile = thunk('profile/saveDetails', async (value: Profile, { extra, rejectWithValue }) => {
  try { return await extra.saveProfile(value) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectProfile(getState()).status === 'ready' && !selectSaving(getState()) })

export const saveTeamSearch = thunk('profile/saveTeamSearch', async (mode: TeamSearch | null, { extra, rejectWithValue }) => {
  try { return await extra.saveTeamSearch(mode) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectProfile(getState()).status === 'ready' && !selectSaving(getState()) })

export const savePreferences = thunk('profile/save', async (value: Preferences, { extra, rejectWithValue }) => {
  try { return await extra.savePreferences(value) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => !selectSaving(getState()) })

export const loadEvents = thunk('calendar/load', async (_, { extra, rejectWithValue }) => {
  try { return await extra.events() } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectEvents(getState()).status !== 'loading' })

export const loadOngoingEvents = thunk('calendar/loadOngoing', async (_, { extra, rejectWithValue }) => {
  try { return await extra.ongoingEvents() } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectOngoingEvents(getState()).status !== 'loading' })

export const loadPeople = thunk('people/load', async (eventId: string | undefined, { extra, rejectWithValue }) => {
  try { return await extra.people(eventId) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (eventId, { getState }) => selectPeople(getState(), eventId).people.status !== 'loading' })

export const invitePerson = thunk('people/invite', async ({ personId, eventId }: { personId: string; eventId?: string }, { extra, rejectWithValue }) => {
  try { await extra.invite(personId, eventId) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, {
  condition: ({ eventId, personId }, { getState }) => {
    const scope = selectPeople(getState(), eventId)
    return !scope.inviting && !scope.invited.includes(personId)
  },
})

const initialProfile: ProfileState = { profile: idle, saving: false }
const profileSlice = createSlice({
  name: 'profile',
  initialState: initialProfile,
  reducers: {},
  extraReducers: builder => builder
    .addCase(loadProfile.pending, (state, action) => { state.profile = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadProfile.fulfilled, (state, action) => { state.profile = { status: 'ready', value: action.payload } })
    .addCase(loadProfile.rejected, (state, action) => { state.profile = { status: 'error', message: requestMessage(action.payload) } })
    .addCase(saveProfile.fulfilled, (state, action) => {
      state.saving = false
      if (state.profile.status === 'ready') {
        const { preferences, teamSearch } = state.profile.value
        state.profile.value = { ...action.payload, preferences, ...(teamSearch === undefined ? {} : { teamSearch }) }
      }
    })
    .addCase(saveTeamSearch.fulfilled, (state, action) => {
      state.saving = false
      if (state.profile.status === 'ready') state.profile.value.teamSearch = action.payload
    })
    .addCase(savePreferences.fulfilled, (state, action) => {
      state.saving = false
      if (state.profile.status === 'ready') state.profile.value.preferences = action.payload
    })
    .addMatcher(isAnyOf(saveProfile.pending, savePreferences.pending, saveTeamSearch.pending), state => { state.saving = true })
    .addMatcher(isAnyOf(saveProfile.rejected, savePreferences.rejected, saveTeamSearch.rejected), state => { state.saving = false }),
})

const initialCalendar: CalendarState = { events: idle, ongoing: idle }
const calendarSlice = createSlice({
  name: 'calendar',
  initialState: initialCalendar,
  reducers: {},
  extraReducers: builder => builder
    .addCase(loadEvents.pending, (state, action) => { state.events = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadEvents.fulfilled, (state, action) => {
      if (state.events.status === 'loading' && state.events.requestId === action.meta.requestId) {
        state.events = { status: 'ready', value: action.payload }
      }
    })
    .addCase(loadEvents.rejected, (state, action) => {
      if (state.events.status === 'loading' && state.events.requestId === action.meta.requestId) {
        state.events = { status: 'error', message: requestMessage(action.payload) }
      }
    })
    .addCase(loadOngoingEvents.pending, (state, action) => { state.ongoing = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadOngoingEvents.fulfilled, (state, action) => { state.ongoing = { status: 'ready', value: action.payload } })
    .addCase(loadOngoingEvents.rejected, (state, action) => { state.ongoing = { status: 'error', message: requestMessage(action.payload) } })
    .addCase(savePreferences.fulfilled, state => { state.events = idle }),
})

function peopleScope(state: PeopleState, eventId?: string): PeopleScope {
  return state[scopeKey(eventId)] ??= { people: idle, inviting: false, inviteError: '', invited: [] }
}

const initialPeople: PeopleState = {}
const peopleSlice = createSlice({
  name: 'people',
  initialState: initialPeople,
  reducers: {
    clearInviteError(state, action: { payload: string | undefined }) {
      peopleScope(state, action.payload).inviteError = ''
    },
  },
  extraReducers: builder => builder
    .addCase(loadPeople.pending, (state, action) => {
      peopleScope(state, action.meta.arg).people = { status: 'loading', requestId: action.meta.requestId }
    })
    .addCase(loadPeople.fulfilled, (state, action) => {
      const scope = peopleScope(state, action.meta.arg)
      if (scope.people.status === 'loading' && scope.people.requestId === action.meta.requestId) {
        scope.people = { status: 'ready', value: action.payload.filter(person => !scope.invited.includes(person.id)) }
      }
    })
    .addCase(loadPeople.rejected, (state, action) => {
      const scope = peopleScope(state, action.meta.arg)
      if (scope.people.status === 'loading' && scope.people.requestId === action.meta.requestId) {
        scope.people = { status: 'error', message: requestMessage(action.payload) }
      }
    })
    .addCase(invitePerson.pending, (state, action) => {
      const scope = peopleScope(state, action.meta.arg.eventId)
      scope.inviting = true
      scope.inviteError = ''
    })
    .addCase(invitePerson.fulfilled, (state, action) => {
      const { personId, eventId } = action.meta.arg
      const scope = peopleScope(state, eventId)
      scope.inviting = false
      scope.invited.push(personId)
      if (scope.people.status === 'ready') scope.people.value = scope.people.value.filter(person => person.id !== personId)
    })
    .addCase(invitePerson.rejected, (state, action) => {
      const scope = peopleScope(state, action.meta.arg.eventId)
      scope.inviting = false
      scope.inviteError = requestMessage(action.payload)
    })
    .addMatcher(isAnyOf(saveProfile.fulfilled, savePreferences.fulfilled), state => {
      for (const scope of Object.values(state)) if (scope) scope.people = idle
    }),
})

export const { clearInviteError } = peopleSlice.actions

export function createAppStore(api: Api) {
  return configureStore({
    reducer: { profile: profileSlice.reducer, calendar: calendarSlice.reducer, people: peopleSlice.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware({ thunk: { extraArgument: api } }),
  })
}

export const useAppDispatch = useDispatch.withTypes<ReturnType<typeof createAppStore>['dispatch']>()
export const useAppSelector = useSelector.withTypes<RootState>()
