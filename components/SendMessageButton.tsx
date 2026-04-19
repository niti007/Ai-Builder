'use client'
import { useState, useRef } from 'react'
import { sendConnectionRequest } from '@/lib/actions/connections'

type Props = {
  toUserId: string
  toName: string
}

export default function SendMessageButton({ toUserId, toName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  if (done) {
    return (
      <span className="text-[10px] text-[#555] tracking-[0.1em] uppercase">
        Message sent ✓
      </span>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost px-4 py-2 text-[10px]"
      >
        Say hi →
      </button>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setLoading(true)
    const fd = new FormData(formRef.current)
    await sendConnectionRequest(fd)
    setDone(true)
    setLoading(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-3 space-y-2">
      <input type="hidden" name="to_user_id" value={toUserId} />
      <textarea
        name="message"
        autoFocus
        required
        maxLength={300}
        rows={3}
        placeholder={`What do you want to build with ${toName}? Keep it short.`}
        className="glass-input resize-none text-[12px]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-gradient px-4 py-2 text-[10px] flex-1"
        >
          {loading ? 'Sending...' : 'SEND →'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost px-4 py-2 text-[10px]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
