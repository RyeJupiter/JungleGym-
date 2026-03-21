import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, formatDuration } from '@junglegym/shared'
import { Navbar } from '@/components/Navbar'
import type { Metadata } from 'next'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, tagline')
    .eq('username', username)
    .single()

  if (!profile) return { title: `@${username}` }
  return {
    title: `${profile.display_name} (@${username}) — JungleGym`,
    description: profile.tagline ?? undefined,
  }
}

export default async function TreehousePage({ params }: Props) {
  const { username } = await params
  const supabase = await createServerSupabaseClient()

  // Step 1: fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Step 2: two-step queries — no FK join filters per architecture rules
  const [{ data: videos }, { data: sessions }, { data: { user: authUser } }] =
    await Promise.all([
      supabase
        .from('videos')
        .select('id, title, description, thumbnail_url, duration_seconds, is_free, price_supported, price_community, price_abundance, tags, view_count, created_at')
        .eq('creator_id', profile.user_id)
        .eq('published', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('live_sessions')
        .select('id, title, description, scheduled_at, duration_minutes, status, max_participants')
        .eq('creator_id', profile.user_id)
        .in('status', ['scheduled', 'live'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(4),
      supabase.auth.getUser(),
    ])

  const allVideos = videos ?? []
  const upcomingSessions = sessions ?? []
  const freeVideos = allVideos.filter((v) => v.is_free)
  const paidVideos = allVideos.filter((v) => !v.is_free)

  // Format the rates for display
  const rates = {
    supported: Number(profile.supported_rate),
    community: Number(profile.community_rate),
    abundance: Number(profile.abundance_rate),
  }

  const isOwnProfile = authUser?.id === profile.user_id

  return (
    <div className="min-h-screen bg-jungle-900">
      <Navbar />

      {/* Treehouse Hero Banner */}
      <div className="relative bg-gradient-to-b from-jungle-800 to-jungle-900 border-b border-jungle-700/50">
        {/* Subtle canopy pattern overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-8 -left-8 w-64 h-64 rounded-full bg-jungle-400 blur-3xl" />
          <div className="absolute top-0 right-1/4 w-48 h-48 rounded-full bg-jungle-300 blur-3xl" />
          <div className="absolute -bottom-8 right-0 w-72 h-72 rounded-full bg-jungle-500 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-12">
          {/* Treehouse label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-jungle-400 text-xs font-bold uppercase tracking-widest">Treehouse</span>
            <span className="text-jungle-700 text-xs">·</span>
            <span className="text-jungle-500 text-xs">@{profile.username}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-jungle-700 border-2 border-jungle-500/40 shadow-xl flex items-center justify-center">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl select-none">🌿</span>
                )}
              </div>
              {/* Online dot — visible if they have upcoming sessions */}
              {upcomingSessions.some((s) => s.status === 'live') && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-jungle-800" title="Live now" />
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-1">
                {profile.display_name}
              </h1>
              <p className="text-jungle-400 text-sm font-medium mb-3">@{profile.username}</p>

              {profile.tagline && (
                <p className="text-jungle-200 text-base italic mb-4 leading-snug max-w-xl">
                  &ldquo;{profile.tagline}&rdquo;
                </p>
              )}

              {profile.bio && (
                <p className="text-jungle-300 text-sm leading-relaxed max-w-2xl mb-4">
                  {profile.bio}
                </p>
              )}

              {/* Meta row: location + tags */}
              <div className="flex flex-wrap items-center gap-2">
                {profile.location && (
                  <span className="text-jungle-400 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {profile.location}
                  </span>
                )}
                {profile.location && profile.tags?.length > 0 && (
                  <span className="text-jungle-700 text-xs">·</span>
                )}
                {profile.tags?.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/explore?tag=${encodeURIComponent(tag)}`}
                    className="bg-jungle-700/60 hover:bg-jungle-600/80 text-jungle-300 text-xs font-semibold px-3 py-1 rounded-full transition-colors capitalize"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats + edit CTA */}
            <div className="flex-shrink-0 flex flex-col items-end gap-3">
              {/* Video count + pricing rates */}
              <div className="text-right">
                <p className="text-2xl font-black text-white">{allVideos.length}</p>
                <p className="text-jungle-400 text-xs">{allVideos.length === 1 ? 'video' : 'videos'}</p>
              </div>

              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="bg-jungle-700 hover:bg-jungle-600 text-jungle-200 text-xs font-semibold px-4 py-2 rounded-lg border border-jungle-600 transition-colors"
                >
                  Edit profile
                </Link>
              )}
            </div>
          </div>

          {/* Pricing rates bar */}
          {allVideos.some((v) => !v.is_free) && (
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <span className="text-jungle-500 text-xs font-semibold uppercase tracking-wide">Rates:</span>
              {[
                { emoji: '🌱', label: 'Supported', rate: rates.supported },
                { emoji: '🌿', label: 'Community', rate: rates.community },
                { emoji: '🌳', label: 'Abundance', rate: rates.abundance },
              ].map(({ emoji, label, rate }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 bg-jungle-800/80 border border-jungle-700 text-jungle-300 text-xs font-medium px-3 py-1.5 rounded-lg"
                >
                  {emoji}
                  <span className="text-jungle-500">{label}</span>
                  <span className="text-jungle-200 font-bold">${rate.toFixed(2)}/min</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Upcoming Live Sessions */}
        {upcomingSessions.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Upcoming sessions
              </h2>
              <Link
                href="/sessions"
                className="text-jungle-400 hover:text-jungle-200 text-sm font-medium transition-colors"
              >
                All sessions →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingSessions.map((s) => {
                const sessionDate = new Date(s.scheduled_at)
                const isLive = s.status === 'live'
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border p-5 transition-colors ${
                      isLive
                        ? 'bg-green-900/30 border-green-700/60 hover:border-green-500'
                        : 'bg-jungle-800/60 border-jungle-700 hover:border-jungle-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-bold text-white text-sm leading-snug">{s.title}</p>
                      {isLive ? (
                        <span className="flex-shrink-0 flex items-center gap-1 bg-green-700 text-green-100 text-xs font-bold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                          Live now
                        </span>
                      ) : (
                        <span className="flex-shrink-0 bg-jungle-700 text-jungle-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                          Gift-based
                        </span>
                      )}
                    </div>

                    {s.description && (
                      <p className="text-jungle-400 text-xs leading-relaxed mb-3 line-clamp-2">
                        {s.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-jungle-500 text-xs">
                      <span>
                        {sessionDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span>·</span>
                      <span>
                        {sessionDate.toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>·</span>
                      <span>{s.duration_minutes} min</span>
                      {s.max_participants && (
                        <>
                          <span>·</span>
                          <span>max {s.max_participants}</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Free Videos */}
        {freeVideos.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl font-black text-white">Free to watch</h2>
              <span className="bg-jungle-600 text-jungle-100 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {freeVideos.length}
              </span>
            </div>
            <VideoGrid videos={freeVideos} />
          </section>
        )}

        {/* Paid Videos */}
        {paidVideos.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl font-black text-white">Paid content</h2>
              <span className="bg-earth-600 text-earth-100 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {paidVideos.length}
              </span>
            </div>
            <VideoGrid videos={paidVideos} />
          </section>
        )}

        {/* Empty state */}
        {allVideos.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 select-none">🌱</div>
            <p className="text-jungle-400 font-semibold text-lg mb-1">No videos yet</p>
            <p className="text-jungle-600 text-sm">
              {profile.display_name}&apos;s treehouse is still being built. Check back soon.
            </p>
          </div>
        )}

        {/* Footer attribution */}
        <div className="border-t border-jungle-800 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-jungle-600 text-xs">
            {profile.display_name}&apos;s treehouse on{' '}
            <Link href="/" className="text-jungle-400 hover:text-jungle-200 transition-colors font-semibold">
              JungleGym
            </Link>
          </p>
          <Link
            href="/explore"
            className="text-jungle-500 hover:text-jungle-300 text-xs font-medium transition-colors"
          >
            Explore more creators →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Video Grid ─────────────────────────────────────────────────────────────

type VideoCardData = {
  id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number | null
  is_free: boolean
  price_supported: number | null
  price_community: number | null
  price_abundance: number | null
  tags: string[]
  view_count: number
}

function VideoGrid({ videos }: { videos: VideoCardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  )
}

function VideoCard({ video: v }: { video: VideoCardData }) {
  return (
    <Link href={`/video/${v.id}`} className="group block">
      <div className="bg-jungle-800/60 border border-jungle-700 hover:border-jungle-500 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-jungle-900/50 hover:-translate-y-0.5">
        {/* Thumbnail */}
        <div className="aspect-video bg-jungle-900 relative overflow-hidden">
          {v.thumbnail_url ? (
            <img
              src={v.thumbnail_url}
              alt={v.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-jungle-800 to-jungle-900">
              <span className="text-4xl select-none opacity-60">🌿</span>
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {v.is_free ? (
            <span className="absolute top-2.5 left-2.5 bg-jungle-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow">
              Free
            </span>
          ) : (
            v.price_supported && (
              <span className="absolute top-2.5 left-2.5 bg-earth-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow">
                from {formatPrice(Number(v.price_supported))}
              </span>
            )
          )}

          {v.duration_seconds && (
            <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-1.5 py-0.5 rounded">
              {formatDuration(v.duration_seconds)}
            </span>
          )}
        </div>

        {/* Card body */}
        <div className="p-3.5">
          <p className="font-bold text-white text-sm leading-snug mb-1.5 group-hover:text-jungle-200 transition-colors line-clamp-2">
            {v.title}
          </p>

          <div className="flex items-center justify-between gap-2">
            {/* Tags (first 2) */}
            <div className="flex flex-wrap gap-1">
              {v.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-jungle-500 text-xs capitalize"
                >
                  {tag}
                </span>
              ))}
              {v.tags.length > 2 && (
                <span className="text-jungle-600 text-xs">+{v.tags.length - 2}</span>
              )}
            </div>

            {/* Pricing pills for paid */}
            {!v.is_free && v.price_supported && v.price_community && v.price_abundance && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {[
                  { label: '🌱', price: v.price_supported },
                  { label: '🌿', price: v.price_community },
                  { label: '🌳', price: v.price_abundance },
                ].map(({ label, price }) => (
                  <span
                    key={label}
                    className="flex items-center gap-0.5 bg-jungle-900/80 text-jungle-400 text-xs px-1.5 py-0.5 rounded"
                    title={formatPrice(Number(price))}
                  >
                    {label}
                    <span className="text-jungle-300 font-semibold">{formatPrice(Number(price))}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
