/** Format a JS Date as YYYYMMDDTHHmmssZ for GCal URL dates param */
export function toGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function buildSessionCalUrl(session: {
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
}): string {
  const start = new Date(session.scheduled_at)
  const end = new Date(start.getTime() + session.duration_minutes * 60 * 1000)
  const details = [
    session.description ?? '',
    '',
    'Join live on JungleGym: ' + (typeof window !== 'undefined' ? window.location.origin : 'https://junglegym.academy') + '/sessions',
  ].filter(Boolean).join('\n').trim()

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    details: details.slice(0, 500),
    location: 'JungleGym Live (online)',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export const RRULE_OPTIONS = [
  { label: 'Every day', value: 'RRULE:FREQ=DAILY' },
  { label: 'Weekdays (Mon–Fri)', value: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Mon / Wed / Fri', value: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR' },
  { label: 'Once a week', value: 'RRULE:FREQ=WEEKLY' },
] as const

export function buildVideoCalUrl(opts: {
  videoTitle: string
  videoId: string
  timeHHMM: string
  rrule: string
}): string {
  const [hours, minutes] = opts.timeHHMM.split(':').map(Number)
  const start = new Date()
  start.setHours(hours, minutes, 0, 0)
  if (start <= new Date()) start.setDate(start.getDate() + 1)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // 1h block

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://junglegym.academy'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Practice: ${opts.videoTitle}`,
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    details: `${origin}/video/${opts.videoId}`,
    recur: opts.rrule,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
