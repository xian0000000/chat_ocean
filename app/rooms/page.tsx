'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

interface Room {
  name: string
  description: string
  createdBy: string
  createdAt: number
  members: Record<string, boolean>
}

export default function RoomsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [rooms, setRooms] = useState<Record<string, Room>>({})
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchRooms()
  }, [user])

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms')
      setRooms(res.data || {})
    } catch (err) {
      console.error('Gagal fetch rooms:', err)
    } finally {
      setFetching(false)
    }
  }

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreating(true)
    try {
      await api.post('/rooms', { name: newRoomName.trim(), description: newRoomDesc.trim() })
      setNewRoomName('')
      setNewRoomDesc('')
      setShowForm(false)
      fetchRooms()
    } catch (err) {
      console.error('Gagal buat room:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/')
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="ocean-bg" />
      <p className="font-display text-ocean-200 text-sm tracking-widest animate-pulse">MEMUAT…</p>
    </div>
  )

  const roomEntries = Object.entries(rooms)
  const myRooms = roomEntries.filter(([, r]) => r.members?.[user.uid])
  const otherRooms = roomEntries.filter(([, r]) => !r.members?.[user.uid])

  return (
    <div className="min-h-screen">
      <div className="ocean-bg" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(42,144,192,0.15)', background: 'rgba(2,11,24,0.6)', backdropFilter: 'blur(12px)' }}>
        <span className="font-display text-lg tracking-widest" style={{ color: 'var(--foam)' }}>
          OCEAN CHAT
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/profile')} className="btn-ghost text-sm">
            {user.displayName || user.email?.split('@')[0]}
          </button>
          <button onClick={handleLogout} className="btn-ghost text-sm">Keluar</button>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl tracking-wider mb-1" style={{ color: 'var(--foam)' }}>
              Ruang Chat
            </h1>
            <p className="text-sm" style={{ color: 'var(--ocean-200)', fontStyle: 'italic' }}>
              Pilih ruang untuk mulai mengobrol
            </p>
          </div>
          <button className="btn-ocean" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Batal' : '+ Buat Ruang'}
          </button>
        </div>

        {/* Create room form */}
        {showForm && (
          <div className="glass p-6 mb-8" style={{ border: '1px solid rgba(64,255,204,0.2)' }}>
            <h2 className="font-display text-sm tracking-widest mb-4" style={{ color: 'var(--biolume)' }}>
              RUANG BARU
            </h2>
            <form onSubmit={createRoom} className="flex flex-col gap-3">
              <input className="ocean-input" placeholder="Nama ruang" value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)} />
              <input className="ocean-input" placeholder="Deskripsi (opsional)" value={newRoomDesc}
                onChange={e => setNewRoomDesc(e.target.value)} />
              <div className="flex gap-2">
                <button type="submit" className="btn-ocean" disabled={creating}>
                  {creating ? 'MEMBUAT…' : 'BUAT'}
                </button>
              </div>
            </form>
          </div>
        )}

        {fetching ? (
          <div className="text-center py-16" style={{ color: 'var(--ocean-300)' }}>
            <p className="font-display text-sm tracking-widest animate-pulse">MEMUAT RUANG…</p>
          </div>
        ) : (
          <>
            {/* My rooms */}
            {myRooms.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display text-xs tracking-widest mb-4"
                  style={{ color: 'var(--biolume-dim)', borderBottom: '1px solid rgba(64,255,204,0.1)', paddingBottom: '0.5rem' }}>
                  RUANGKU
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {myRooms.map(([roomId, room]) => (
                    <RoomCard key={roomId} roomId={roomId} room={room} isMember onClick={() => router.push(`/rooms/${roomId}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Other rooms */}
            {otherRooms.length > 0 && (
              <section>
                <h2 className="font-display text-xs tracking-widest mb-4"
                  style={{ color: 'var(--ocean-300)', borderBottom: '1px solid rgba(42,144,192,0.15)', paddingBottom: '0.5rem' }}>
                  RUANG LAIN
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {otherRooms.map(([roomId, room]) => (
                    <RoomCard key={roomId} roomId={roomId} room={room} isMember={false} onClick={() => router.push(`/rooms/${roomId}`)} />
                  ))}
                </div>
              </section>
            )}

            {roomEntries.length === 0 && (
              <div className="text-center py-16">
                <p style={{ color: 'var(--ocean-300)', fontStyle: 'italic' }}>Belum ada ruang. Buat yang pertama!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function RoomCard({ roomId, room, isMember, onClick }: {
  roomId: string; room: Room; isMember: boolean; onClick: () => void
}) {
  const memberCount = room.members ? Object.keys(room.members).length : 0
  return (
    <div className="glass glass-hover p-5 cursor-pointer" onClick={onClick}
      style={{ borderColor: isMember ? 'rgba(64,255,204,0.2)' : 'rgba(42,144,192,0.1)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-sm tracking-wider" style={{ color: 'var(--foam)' }}>
          {room.name}
        </h3>
        {isMember && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(64,255,204,0.1)', color: 'var(--biolume)', border: '1px solid rgba(64,255,204,0.2)', fontFamily: 'var(--font-cinzel)', fontSize: '0.55rem', letterSpacing: '0.1em' }}>
            MEMBER
          </span>
        )}
      </div>
      {room.description && (
        <p className="text-sm mb-3" style={{ color: 'var(--ocean-200)', fontStyle: 'italic' }}>
          {room.description}
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--ocean-300)' }}>
        {memberCount} anggota
      </p>
    </div>
  )
}
