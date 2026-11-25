export type Resource<T> =
  | { status: 'idle' }
  | { status: 'loading'; requestId: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: T }

export function requestMessage(error: unknown) {
  if (typeof error === 'string') return error
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message : 'Не удалось соединиться с сервером. Попробуйте ещё раз.'
}
