import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScheduleSessionForm } from '@/components/studio/ScheduleSessionForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Schedule Session' }

export default async function NewSessionPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: user } = await supabase
    .from('users').select('role').eq('id', session.user.id).single()
  if (user?.role !== 'creator') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-black text-xl text-jungle-800">
          jungle<span className="text-jungle-500">gym</span>
        </Link>
        <Link href="/studio" className="text-sm text-stone-600 hover:text-stone-900 font-medium">
          ← Studio
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-stone-900 mb-2">Schedule a session</h1>
        <p className="text-stone-500 mb-8">Gift-based. 100% of gifts go directly to you.</p>
        <ScheduleSessionForm creatorId={session.user.id} />
      </div>
    </div>
  )
}
