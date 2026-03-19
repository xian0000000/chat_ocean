'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth, database } from '@/lib/firebase'
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        // Set status online
        const userRef = ref(database, `users/${firebaseUser.uid}`)
        const onlineRef = ref(database, `users/${firebaseUser.uid}/online`)

        await set(onlineRef, true)

        // Set offline otomatis saat disconnect
        onDisconnect(onlineRef).set(false)

        // Simpan/update profil user di Realtime DB
        await set(userRef, {
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonim',
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
          email: firebaseUser.email,
          createdAt: Date.now(),
          online: true,
        })
      }
    })

    return () => unsub()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
