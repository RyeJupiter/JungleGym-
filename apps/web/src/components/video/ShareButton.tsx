'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function ShareButton({ videoId, isLoggedIn }: { videoId: string; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  async function handleOpen() {
    if (!isLoggedIn) {
      router.push(`/auth/login?next=/video/${videoId}`)
      return
    }
    setOpen(true)
    if (link) return // already fetched
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('video_shares')
        .upsert(
          { video_id: videoId, owner_user_id: user.id },
          { onConflict: 'owner_user_id,video_id', ignoreDuplicates: false }
        )
        .select('token')
        .single()
      if (error) throw error
      setLink(`${window.location.origin}/api/share/${data.token}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not generate link')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full mt-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        🔗 Share with a friend
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl">
            <h3 className="font-black text-stone-900 text-lg mb-1">Share this class</h3>
            <p className="text-stone-500 text-sm mb-6">
              Send this link to one friend. They get free access — once.
            </p>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {loading ? (
              <div className="text-center py-4 text-stone-400 text-sm">Generating link...</div>
            ) : link ? (
              <div className="space-y-3">
                <input
                  readOnly
                  value={link}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-stone-700 text-sm bg-stone-50 focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className="w-full bg-jungle-600 hover:bg-jungle-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy link'}
                </button>
                <p className="text-xs text-stone-400 text-center">
                  This link can only be used once. Once redeemed, it expires.
                </p>
              </div>
            ) : null}

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-stone-400 hover:text-stone-600 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
