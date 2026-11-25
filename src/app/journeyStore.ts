import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { requestMessage, type Resource } from '../shared/api/resource'
import type { Api, Hackathon, Invitation, InvitationReply, Person } from '../shared/api/types'

type JourneyState = {
  events: Record<string, Resource<Hackathon | null> | undefined>
  people: Record<string, Resource<Person | null> | undefined>
  plans: Resource<Hackathon[]>
  invitations: Resource<Invitation[]>
  planPending: boolean
  replyPending: string | null
}
type WithJourney = { journey: JourneyState }
const idle = { status: 'idle' } as const
const initialState: JourneyState = { events: {}, people: {}, plans: idle, invitations: idle, planPending: false, replyPending: null }
const recordKey = (id: string) => `id:${id}`

export const selectEvent = (state: WithJourney, id: string) => state.journey.events[recordKey(id)] ?? idle
export const selectPerson = (state: WithJourney, id: string) => state.journey.people[recordKey(id)] ?? idle
export const selectPlans = (state: WithJourney) => state.journey.plans
export const selectInvitations = (state: WithJourney) => state.journey.invitations
export const selectPlanPending = (state: WithJourney) => state.journey.planPending
export const selectReplyPending = (state: WithJourney) => state.journey.replyPending

const thunk = createAsyncThunk.withTypes<{ state: WithJourney; extra: Api; rejectValue: string }>()

export const loadEvent = thunk('journey/event', async (id: string, { extra, rejectWithValue }) => {
  try { return await extra.event(id) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (id, { getState }) => selectEvent(getState(), id).status !== 'loading' })

export const loadPerson = thunk('journey/person', async (id: string, { extra, rejectWithValue }) => {
  try { return await extra.person(id) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (id, { getState }) => selectPerson(getState(), id).status !== 'loading' })

export const loadPlans = thunk('journey/plans', async (_, { extra, rejectWithValue }) => {
  try { return await extra.plannedEvents() } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectPlans(getState()).status !== 'loading' && !selectPlanPending(getState()) })

export const updatePlan = thunk('journey/updatePlan', async ({ event, planned }: { event: Hackathon; planned: boolean }, { extra, rejectWithValue }) => {
  try { await extra.setEventPlan(event.id, planned) } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectPlans(getState()).status === 'ready' && !selectPlanPending(getState()) })

export const loadInvitations = thunk('journey/invitations', async (_, { extra, rejectWithValue }) => {
  try { return await extra.invitations() } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectInvitations(getState()).status !== 'loading' && !selectReplyPending(getState()) })

export const replyToInvitation = thunk('journey/reply', async ({ id, status, preview }: { id: string; status: InvitationReply; preview?: boolean }, { extra, rejectWithValue }) => {
  try {
    if (!preview) return await extra.replyToInvitation(id, status)
    if (extra.replyAsDemoRecipient) return await extra.replyAsDemoRecipient(id, status)
    throw new Error('Демо-ответ недоступен.')
  } catch (error) { return rejectWithValue(requestMessage(error)) }
}, { condition: (_, { getState }) => selectInvitations(getState()).status === 'ready' && !selectReplyPending(getState()) })

export const journeyReducer = createSlice({
  name: 'journey', initialState, reducers: {},
  extraReducers: builder => builder
    .addCase(loadEvent.pending, (state, action) => { state.events[recordKey(action.meta.arg)] = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadEvent.fulfilled, (state, action) => { state.events[recordKey(action.meta.arg)] = { status: 'ready', value: action.payload } })
    .addCase(loadEvent.rejected, (state, action) => { state.events[recordKey(action.meta.arg)] = { status: 'error', message: requestMessage(action.payload) } })
    .addCase(loadPerson.pending, (state, action) => { state.people[recordKey(action.meta.arg)] = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadPerson.fulfilled, (state, action) => { state.people[recordKey(action.meta.arg)] = { status: 'ready', value: action.payload } })
    .addCase(loadPerson.rejected, (state, action) => { state.people[recordKey(action.meta.arg)] = { status: 'error', message: requestMessage(action.payload) } })
    .addCase(loadPlans.pending, (state, action) => { state.plans = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadPlans.fulfilled, (state, action) => { state.plans = { status: 'ready', value: action.payload } })
    .addCase(loadPlans.rejected, (state, action) => { state.plans = { status: 'error', message: requestMessage(action.payload) } })
    .addCase(updatePlan.pending, state => { state.planPending = true })
    .addCase(updatePlan.fulfilled, (state, action) => {
      state.planPending = false
      if (state.plans.status !== 'ready') return
      const { event, planned } = action.meta.arg
      const remaining = state.plans.value.filter(item => item.id !== event.id)
      state.plans.value = planned ? [...remaining, event] : remaining
    })
    .addCase(updatePlan.rejected, state => { state.planPending = false })
    .addCase(loadInvitations.pending, (state, action) => { state.invitations = { status: 'loading', requestId: action.meta.requestId } })
    .addCase(loadInvitations.fulfilled, (state, action) => { state.invitations = { status: 'ready', value: action.payload } })
    .addCase(loadInvitations.rejected, (state, action) => { state.invitations = { status: 'error', message: requestMessage(action.payload) } })
    .addCase(replyToInvitation.pending, (state, action) => { state.replyPending = action.meta.arg.id })
    .addCase(replyToInvitation.fulfilled, (state, action) => {
      state.replyPending = null
      if (state.invitations.status === 'ready') {
        state.invitations.value = state.invitations.value.map(item => item.id === action.payload.id ? action.payload : item)
      }
    })
    .addCase(replyToInvitation.rejected, state => { state.replyPending = null }),
}).reducer
