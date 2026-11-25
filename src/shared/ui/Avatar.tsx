import { useState } from 'react'
import type { AvatarProfile } from '../api/types'

export function Avatar({ profile, size }: { profile: AvatarProfile; size?: 'large' | 'small' }) {
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  const url = [profile.telegramAvatarUrl, profile.avatarUrl].find(src => src && !failedUrls.includes(src))
  return <div className={size ? `avatar avatar-${size}` : 'avatar'} aria-hidden="true">
    {url ? <img key={url} src={url} alt="" draggable={false} referrerPolicy="no-referrer"
      onError={() => setFailedUrls(previous => [...previous, url])} />
      : <span>{Array.from(profile.name.trim())[0]?.toUpperCase()}</span>}
  </div>
}
