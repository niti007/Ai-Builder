'use client'
import { useState } from 'react'

const PRESET_ROLES = ['AI engineer', 'Founder', 'Content creator', 'Student']

export default function RoleSelect() {
  const [selected, setSelected] = useState('')
  const [custom, setCustom] = useState('')

  const isOther = selected === 'other'
  const value = isOther ? custom : selected

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setCustom('') }}
        required={!isOther}
        className="glass-input"
      >
        <option value="">Pick your role</option>
        {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        <option value="other">Other — type your own</option>
      </select>

      {isOther && (
        <input
          autoFocus
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. ML researcher, Designer, PM…"
          required
          className="glass-input"
        />
      )}

      {/* actual form field */}
      <input type="hidden" name="role" value={value} />
    </div>
  )
}
