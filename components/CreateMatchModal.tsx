'use client'
import { useState, useTransition } from 'react'
import { createMatch } from '@/lib/actions/match'

type User = { id: string; name: string; email: string }

export default function CreateMatchModal({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createMatch(formData)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        + Create Match
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Create a collab match</h2>

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="user1_id" className="block text-sm font-medium text-gray-700 mb-1">User 1</label>
                <select
                  id="user1_id"
                  name="user1_id"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="user2_id" className="block text-sm font-medium text-gray-700 mb-1">User 2</label>
                <select
                  id="user2_id"
                  name="user2_id"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">Collab goal</label>
                <input
                  id="topic"
                  name="topic"
                  required
                  placeholder="e.g. Build an AI Chrome extension for LinkedIn"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label htmlFor="scheduled_time" className="block text-sm font-medium text-gray-700 mb-1">Suggested call time</label>
                <input
                  id="scheduled_time"
                  name="scheduled_time"
                  type="datetime-local"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-black text-white py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {isPending ? 'Creating\u2026' : 'Create + notify both \u2192'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
