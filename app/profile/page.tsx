'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { ref, update } from 'firebase/database'
import { auth, database } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
    if (user) setDisplayName(user.displayName || '')
  }, [user, loading, router])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      await updateProfile(user, { displayName: displayName.trim() })
      await update(ref(database, `users/${user.uid}`), { displayName: displayName.trim() })
      setMessage({ type: 'ok', text: 'Profil berhasil disimpan' })
    } catch {
      setMessage({ type: 'err', text: 'Gagal menyimpan profil' })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.email || !newPassword || !currentPassword) return
    setSaving(true)
    setMessage(null)
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, newPassword)
      setNewPassword('')
      setCurrentPassword('')
      setMessage({ type: 'ok', text: 'Password berhasil diubah' })
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/wrong-password': 'Password saat ini salah',
        'auth/weak-password': 'Password baru minimal 6 karakter',
      }
      setMessage({ type: 'err', text: msgs[err.code] || 'Gagal mengubah password' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="ocean-bg" />
      <p className="font-display text-sm tracking-widest animate-pulse" style={{ color: 'var(--ocean-200)' }}>MEMUAT…</p>
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="ocean-bg" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(42,144,192,0.15)', background: 'rgba(2,11,24,0.6)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.push('/rooms')} className="btn-ghost text-sm">
          ← Kembali
        </button>
        <span className="font-display text-lg tracking-widest" style={{ color: 'var(--foam)' }}>
          PROFIL
        </span>
      </nav>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-10">

        {/* Avatar & info */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
            alt="Avatar"
            className="w-24 h-24 rounded-full mb-4"
            style={{ border: '2px solid rgba(64,255,204,0.3)', background: 'rgba(7,32,53,0.8)' }}
          />
          <h1 className="font-display text-xl tracking-wider mb-1" style={{ color: 'var(--foam)' }}>
            {user.displayName || 'Anonim'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--ocean-200)' }}>{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="status-dot online" />
            <span className="text-xs" style={{ color: 'var(--biolume)' }}>Online</span>
          </div>
        </div>

        {message && (
          <div className="mb-6 text-sm text-center py-2 px-4 rounded-lg"
            style={{
              background: message.type === 'ok' ? 'rgba(64,255,204,0.08)' : 'rgba(200,50,50,0.1)',
              border: `1px solid ${message.type === 'ok' ? 'rgba(64,255,204,0.2)' : 'rgba(200,50,50,0.2)'}`,
              color: message.type === 'ok' ? 'var(--biolume)' : '#ff9090',
            }}>
            {message.text}
          </div>
        )}

        {/* Edit nama */}
        <div className="glass p-6 mb-4">
          <h2 className="font-display text-xs tracking-widest mb-4" style={{ color: 'var(--ocean-200)' }}>
            UBAH NAMA
          </h2>
          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <input className="ocean-input" placeholder="Nama tampilan"
              value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <button type="submit" className="btn-ocean" disabled={saving}>
              SIMPAN
            </button>
          </form>
        </div>

        {/* Ganti password */}
        <div className="glass p-6">
          <h2 className="font-display text-xs tracking-widest mb-4" style={{ color: 'var(--ocean-200)' }}>
            GANTI PASSWORD
          </h2>
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <input className="ocean-input" type="password" placeholder="Password saat ini"
              value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            <input className="ocean-input" type="password" placeholder="Password baru"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <button type="submit" className="btn-ocean" disabled={saving}>
              GANTI PASSWORD
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
