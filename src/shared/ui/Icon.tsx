const shapes = {
  profile: <><rect x="3" y="4.5" width="18" height="15" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M5.8 16a3.5 3.5 0 0 1 6.4 0M15 10h3m-3 4h3" /></>,
  team: <><circle cx="9" cy="8" r="3" /><path d="M3 19v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1M16 5.3a3 3 0 0 1 0 5.5m2.1 3.4A4 4 0 0 1 21 18v1" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3.5v3M16 3.5v3M3.5 10h17m-5.5 4h2m-2 3h2" /><rect x="7.5" y="12.5" width="4" height="4" rx="1" fill="currentColor" stroke="none" /></>,
  invitations: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  plans: <path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1Z" />,
  details: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5m0-8h.01" /></>,
  external: <path d="M13 4h7v7m0-7-9 9m8 1v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: <path d="M20 11a8 8 0 0 0-13.8-5.5L4 8m0-5v5h5m-5 5a8 8 0 0 0 13.8 5.5L20 16m0 5v-5h-5" />,
  send: <path d="m3 10 17-6-5 16-4-7-8-3Zm8 3 9-9" />,
  edit: <path d="m14.5 5.5 4 4M5 19l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L5 19Z" />,
}

export function Icon({ name, className = 'action-icon' }: { name: keyof typeof shapes; className?: string }) {
  return <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {shapes[name]}
  </svg>
}
