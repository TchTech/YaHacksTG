import { useState, type FormEvent } from 'react'
import type { Profile } from '../shared/api/types'

const listFields = [
  { name: 'skills', label: 'Навыки' },
  { name: 'teams', label: 'Команды' },
  { name: 'achievements', label: 'Достижения' },
  { name: 'projects', label: 'Кейсы и проекты' },
] as const

function photoUrlIsValid(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch { return false }
}

export function ProfileEditor({ profile, saving, save, finish }: {
  profile: Profile; saving: boolean; save: (value: Profile) => Promise<Profile>; finish: (saved: boolean) => void
}) {
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError('')
    const fields = new FormData(event.currentTarget)
    const read = (key: string) => String(fields.get(key) ?? '').trim()
    const readList = (key: string) => [...new Set(read(key).split(/\r?\n/).map(line => line.trim()).filter(Boolean))]
    const name = read('name')
    const ageText = read('age')
    const age = ageText === '' ? undefined : Number(ageText)
    const avatarUrl = read('avatarUrl') || undefined

    if (!name) { setError('Введите имя.'); return }
    if (age !== undefined && (!Number.isSafeInteger(age) || age < 0)) {
      setError('Укажите возраст целым неотрицательным числом.')
      return
    }
    if (avatarUrl && avatarUrl !== profile.avatarUrl && !photoUrlIsValid(avatarUrl)) {
      setError('Укажите ссылку на фото, которая начинается с https:// или http://.')
      return
    }

    try {
      await save({ name, age, avatarUrl, city: read('city') || undefined, role: read('role'), status: read('status'),
        summary: read('summary'), about: read('about'), skills: readList('skills'), teams: readList('teams'),
        achievements: readList('achievements'), projects: readList('projects') })
      finish(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить профиль. Попробуйте ещё раз.')
    }
  }

  return <form className="profile-editor" aria-label="Редактирование профиля" onSubmit={submit}>
    <fieldset disabled={saving}>
      <legend>Личные данные</legend>
      <div className="profile-fields">
        <label>Имя<input name="name" autoComplete="name" required autoFocus defaultValue={profile.name} /></label>
        <label>Возраст<input name="age" inputMode="numeric" type="number" min={0} step={1} defaultValue={profile.age ?? ''} /></label>
        <label>Город<input name="city" autoComplete="address-level2" defaultValue={profile.city ?? ''} /></label>
        <label>Роль в профиле<input name="role" defaultValue={profile.role} /></label>
        <label>Статус<input name="status" defaultValue={profile.status} /></label>
        <label>Ссылка на фото<input name="avatarUrl" inputMode="url" placeholder="https://…" defaultValue={profile.avatarUrl ?? ''} /></label>
        <label>Краткое описание<textarea name="summary" rows={3} defaultValue={profile.summary} /></label>
        <label>О себе<textarea name="about" rows={3} defaultValue={profile.about} /></label>
      </div>
    </fieldset>
    <fieldset disabled={saving}>
      <legend>Опыт и навыки</legend>
      <p className="muted" id="profile-list-help">По одному пункту на строку.</p>
      <div className="profile-fields">
        {listFields.map(({ name, label }) => <label key={name}>{label}
          <textarea name={name} rows={3} aria-describedby="profile-list-help" defaultValue={profile[name].join('\n')} />
        </label>)}
      </div>
    </fieldset>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="profile-editor-actions">
      <button className="primary" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить профиль'}</button>
      <button className="hint" type="button" disabled={saving} onClick={() => finish(false)}>Отмена</button>
    </div>
  </form>
}
