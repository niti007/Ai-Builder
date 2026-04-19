'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function OnboardingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[OnboardingError]', error) }, [error])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-[10px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4">// Error</div>
      <h1 style={{ fontFamily: 'var(--font-anton)', fontSize: '36px', letterSpacing: '0.02em', textTransform: 'uppercase' }} className="text-white mb-3">
        Something broke.
      </h1>
      <p className="text-[11px] text-[#444] mb-8">Couldn&apos;t save profile. Try again.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-gradient px-6 py-3 text-[11px]">TRY_AGAIN</button>
        <Link href="/"><button className="btn-ghost px-6 py-3 text-[11px]">HOME</button></Link>
      </div>
    </main>
  )
}
