'use client'

import { buildSessionCalUrl } from '@/lib/gcal'

export function AddSessionToCalendarButton({
  session,
}: {
  session: {
    title: string
    description: string | null
    scheduled_at: string
    duration_minutes: number
  }
}) {
  const url = buildSessionCalUrl(session)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-stone-500 hover:text-jungle-700 font-medium flex items-center gap-1 transition-colors"
    >
      📅 Add to calendar
    </a>
  )
}
