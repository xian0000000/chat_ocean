'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export default function AuthPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/rooms')
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        if (!displayName.trim()) { setError('Nama wajib diisi'); setSubmitting(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, {
          displayName: displayName.trim(),
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
        })
      }
      router.push('/rooms')
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Email atau password salah',
        'auth/email-already-in-use': 'Email sudah terdaftar',
        'auth/weak-password': 'Password minimal 6 karakter',
        'auth/invalid-email': 'Format email tidak valid',
      }
      setError(msgs[err.code] || 'Terjadi kesalahan, coba lagi')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="ocean-bg" />
      <p className="font-display text-ocean-200 text-sm tracking-widest animate-pulse">MEMUAT…</p>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="ocean-bg" />

      {/* Bubbles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bubble" style={{
          width: `${8 + i * 4}px`, height: `${8 + i * 4}px`,
          left: `${10 + i * 15}%`, bottom: '-5%',
          animationDuration: `${6 + i * 2}s`, animationDelay: `${i * 1.2}s`,
        }} />
      ))}

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: 'rgba(64,255,204,0.08)', border: '1px solid rgba(64,255,204,0.2)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q8 12 16 16 Q24 20 28 12" stroke="#40ffcc" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M4 24 Q8 16 16 20 Q24 24 28 16" stroke="rgba(64,255,204,0.4)" strokeWidth="1" fill="none" strokeLinecap="round"/>
              <circle cx="16" cy="14" r="3" fill="rgba(64,255,204,0.2)" stroke="#40ffcc" strokeWidth="1"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl tracking-widest mb-1" style={{ color: 'var(--foam)' }}>
            OCEAN CHAT
          </h1>
          <p className="text-sm" style={{ color: 'var(--ocean-200)', fontStyle: 'italic' }}>
            dari kedalaman samudra
          </p>
        </div>

        {/* Card */}
        <div className="glass p-8">
          {/* Tab toggle */}
          <div className="flex mb-6 rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(42,144,192,0.2)' }}>
            {(['login', 'register'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2 text-sm transition-all"
                style={{
                  fontFamily: 'var(--font-cinzel)',
                  letterSpacing: '0.1em',
                  fontSize: '0.7rem',
                  background: mode === m ? 'rgba(18,69,112,0.6)' : 'transparent',
                  color: mode === m ? 'var(--foam)' : 'var(--ocean-200)',
                  borderBottom: mode === m ? '1px solid var(--biolume-dim)' : '1px solid transparent',
                }}>
                {m === 'login' ? 'MASUK' : 'DAFTAR'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs mb-1.5 tracking-widest"
                  style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--ocean-200)', fontSize: '0.65rem' }}>
                  NAMA
                </label>
                <input className="ocean-input" placeholder="Nama kamu" value={displayName}
                  onChange={e => setDisplayName(e.target.value)} />
              </div>
            )}

            <div>
              <label className="block text-xs mb-1.5 tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--ocean-200)', fontSize: '0.65rem' }}>
                EMAIL
              </label>
              <input className="ocean-input" type="email" placeholder="email@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs mb-1.5 tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--ocean-200)', fontSize: '0.65rem' }}>
                PASSWORD
              </label>
              <input className="ocean-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && (
              <p className="text-sm text-center py-2 px-3 rounded-lg"
                style={{ background: 'rgba(200,50,50,0.1)', border: '1px solid rgba(200,50,50,0.2)', color: '#ff9090' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-ocean mt-2" disabled={submitting}>
              {submitting ? 'MEMPROSES…' : mode === 'login' ? 'MASUK' : 'BUAT AKUN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
