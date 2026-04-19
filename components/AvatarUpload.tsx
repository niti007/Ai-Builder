'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AvatarUpload({ currentUrl }: { currentUrl?: string }) {
  const [preview, setPreview] = useState(currentUrl ?? '')
  const [url, setUrl] = useState(currentUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('Max 5 MB'); return }

    setErr('')
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (error || !data) {
      setErr('Upload failed. Try again.')
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
      setUrl(publicUrl)
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <input type="hidden" name="avatar_url" value={url} />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-20 h-20 rounded-full border-2 border-[#3a3a3a] hover:border-[#ff2d00] transition-colors overflow-hidden flex items-center justify-center bg-[#161616] cursor-pointer"
      >
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[#444] text-[9px] tracking-[0.12em] uppercase text-center leading-tight">
            Add<br />photo
          </span>
        )}
      </button>

      {uploading && <span className="text-[10px] text-[#555]">Uploading…</span>}
      {err && <span className="text-[10px] text-[#ff2d00]">{err}</span>}
      {url && !uploading && (
        <span className="text-[10px] text-[#444] tracking-widest">Photo saved ✓</span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
