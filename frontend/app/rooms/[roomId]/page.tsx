'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ref, push, onValue, query, limitToLast, serverTimestamp } from 'firebase/database'
import { database } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: number
  type: string
}

interface Room {
  name: string
  description: string
  createdBy: string
  members: Record<string, boolean>
}

export default function ChatRoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.roomId as string
  const { user, loading } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  // Fetch room info
  useEffect(() => {
    if (!user) return
    api.get(`/rooms/${roomId}`).then(res => {
      const roomData = res.data as Room
      setRoom(roomData)
      setIsMember(!!roomData.members?.[user.uid])
    }).catch(() => router.push('/rooms'))
  }, [roomId, user])

  // Realtime messages listener
  useEffect(() => {
    if (!user || !isMember) return

    const msgRef = query(
      ref(database, `messages/${roomId}`),
      limitToLast(100)
    )

    const unsub = onValue(msgRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) { setMessages([]); return }
      const msgs = Object.entries(data).map(([id, val]: any) => ({ id, ...val }))
      msgs.sort((a, b) => a.timestamp - b.timestamp)
      setMessages(msgs)
    })

    return () => unsub()
  }, [roomId, user, isMember])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !user || sending) return
    setSending(true)
    try {
      await push(ref(database, `messages/${roomId}`), {
        text: text.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'Anonim',
        timestamp: Date.now(),
        type: 'text',
      })
      setText('')
    } catch (err) {
      console.error('Gagal kirim pesan:', err)
    } finally {
      setSending(false)
    }
  }

  const joinRoom = async () => {
    if (!user) return
    setJoining(true)
    try {
      await api.post(`/rooms/${roomId}/members/${user.uid}`)
      setIsMember(true)
    } catch (err) {
      console.error('Gagal join room:', err)
    } finally {
      setJoining(false)
    }
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="ocean-bg" />
      <p className="font-display text-sm tracking-widest animate-pulse" style={{ color: 'var(--ocean-200)' }}>MEMUAT…</p>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <div className="ocean-bg" />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(42,144,192,0.15)', background: 'rgba(2,11,24,0.7)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.push('/rooms')} className="btn-ghost text-sm px-3 py-1.5">
          ← Kembali
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-sm tracking-wider truncate" style={{ color: 'var(--foam)' }}>
            {room?.name || '…'}
          </h1>
          {room?.description && (
            <p className="text-xs truncate" style={{ color: 'var(--ocean-200)', fontStyle: 'italic' }}>
              {room.description}
            </p>
          )}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--ocean-300)' }}>
          {room?.members ? Object.keys(room.members).length : 0} anggota
        </span>
      </header>

      {/* Messages */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        {!isMember ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <p style={{ color: 'var(--ocean-200)', fontStyle: 'italic' }}>
              Kamu belum bergabung dengan ruang ini
            </p>
            <button className="btn-ocean" onClick={joinRoom} disabled={joining}>
              {joining ? 'BERGABUNG…' : 'BERGABUNG'}
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p style={{ color: 'var(--ocean-300)', fontStyle: 'italic' }}>
              Belum ada pesan. Mulai obrolan!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-3xl mx-auto">
            {messages.map((msg, i) => {
              const isMe = msg.senderId === user.uid
              const showName = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId)
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <span className="text-xs mb-1 px-1" style={{ color: 'var(--ocean-200)' }}>
                      {msg.senderName}
                    </span>
                  )}
                  <div className={isMe ? 'msg-mine' : 'msg-other'}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--foam)' }}>
                      {msg.text}
                    </p>
                    <p className="text-xs mt-1" style={{ color: isMe ? 'rgba(160,232,248,0.4)' : 'rgba(42,144,192,0.5)' }}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Input */}
      {isMember && (
        <footer className="relative z-10 px-4 py-4"
          style={{ borderTop: '1px solid rgba(42,144,192,0.15)', background: 'rgba(2,11,24,0.7)', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={sendMessage} className="flex gap-3 max-w-3xl mx-auto">
            <input
              className="ocean-input flex-1"
              placeholder="Tulis pesan…"
              value={text}
              onChange={e => setText(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn-ocean px-5 flex-shrink-0" disabled={sending || !text.trim()}>
              Kirim
            </button>
          </form>
        </footer>
      )}
    </div>
  )
}
