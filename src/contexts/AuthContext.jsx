import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { isFounderEmail } from '../lib/founders'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabaseReady) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id, session.user.email)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id, session.user.email)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, email) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Safety net: founder emails always resolve to founder role,
    // even if the DB row is stale (pre-migration or manual override).
    if (data && isFounderEmail(email) && data.role !== 'founder') {
      setProfile({ ...data, role: 'founder' })
    } else {
      setProfile(data)
    }

    setLoading(false)
  }

  async function signIn(email, password) {
    if (!supabaseReady) return { error: { message: 'Supabase not configured.' } }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password) {
    if (!supabaseReady) return { error: { message: 'Supabase not configured.' } }
    // Role is assigned server-side (DB trigger), never from the client.
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  async function refreshProfile() {
    if (!session) return
    await fetchProfile(session.user.id, session.user.email)
  }

  async function signOut() {
    if (!supabaseReady) return
    await supabase.auth.signOut()
  }

  const isFounder = profile?.role === 'founder'
  const isAdmin   = isFounder // legacy alias
  const user      = session?.user ?? null

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isAdmin, isFounder, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
