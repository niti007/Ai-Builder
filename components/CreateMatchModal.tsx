'use client'
import { useState, useTransition } from 'react'
import { createMatch } from '@/lib/actions/match'

type User = { id: string; name: string; email: string }

export default function CreateMatchModal({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    const user1Id = formData.get('user1_id') as string
    const user2Id = formData.get('user2_id') as string
    if (user1Id === user2Id) { setErrorMsg('Select two different users.'); return }
    setErrorMsg(null)
    startTransition(async () => {
      try { await createMatch(formData); setOpen(false) }
      catch { setErrorMsg('Failed to create match. Try again.') }
    })
  }

  return (
    <>
      <button onClick={() => { setErrorMsg(null); setOpen(true) }} className="btn-gradient px-5 py-3 text-[11px]">
        + CREATE_MATCH
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div className="w-full max-w-md border border-[#222] bg-[#0a0a0a] p-6">
            <div className="text-[9px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4">Create_match /</div>
            <h2
              style={{ fontFamily: 'var(--font-anton)', fontSize: '24px', letterSpacing: '0.02em', textTransform: 'uppercase' }}
              className="text-white mb-6"
            >
              New Collab
            </h2>

            {errorMsg && (
              <div className="mb-4 text-[11px] px-4 py-3 border border-[#ff2d00]/30 bg-[#ff2d00]/5 text-[#ff6644]">
                {errorMsg}
              </div>
            )}

            <form action={handleSubmit} className="space-y-4">
              {[
                { id: 'user1_id', label: 'User 1' },
                { id: 'user2_id', label: 'User 2' },
              ].map(({ id, label }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-[9px] text-[#444] tracking-[0.2em] uppercase mb-2">{label}</label>
                  <select id={id} name={id} required className="glass-input">
                    <option value="">Select user</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                  </select>
                </div>
              ))}

              <div>
                <label htmlFor="topic" className="block text-[9px] text-[#444] tracking-[0.2em] uppercase mb-2">Collab goal</label>
                <input id="topic" name="topic" required placeholder="e.g. Build an AI Chrome extension" className="glass-input" />
              </div>

              <div>
                <label htmlFor="scheduled_time" className="block text-[9px] text-[#444] tracking-[0.2em] uppercase mb-2">Call time</label>
                <input id="scheduled_time" name="scheduled_time" type="datetime-local" required className="glass-input" style={{ colorScheme: 'dark' }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 py-3 text-[11px]">
                  CANCEL
                </button>
                <button type="submit" disabled={isPending} className="btn-gradient flex-1 py-3 text-[11px]">
                  {isPending ? 'CREATING…' : 'CREATE →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
