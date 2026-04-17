'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[OnboardingError]', error)
  }, [error])

  return (
    <main className="max-w-lg mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h1>
      <p className="text-gray-500 mb-6">We couldn't save your profile. Please try again.</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-black text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
        <Link href="/" className="border border-gray-200 text-gray-700 px-6 py-2.5 rounded-full font-medium hover:bg-gray-50 transition-colors">
          Go home
        </Link>
      </div>
    </main>
  )
}
