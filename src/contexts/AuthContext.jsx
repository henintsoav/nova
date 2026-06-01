import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { isFounderEmail } from '../lib/founders'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]               = useState(null)
  const [profile, setProfile]               = useState(null)
  const [loading, setLoading]               = useState(supabaseReady)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  useEffect(() => {
    if (!supabaseReady) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id, session.user.email)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
        return
      }
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

    // Soft-deleted account: block access immediately
    if (data?.is_deleted) {
      await supabase.auth.signOut()
      setProfile(null)
      setLoading(false)
      return
    }

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

  async function signUp(email, password, gdprConsent = false) {
    if (!supabaseReady) return { error: { message: 'Supabase not configured.' } }
    // Role is assigned server-side (DB trigger), never from the client.
    // GDPR consent is stored in user metadata and written to the profile by the trigger.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        data: {
          gdpr_consent:    gdprConsent,
          gdpr_consent_at: gdprConsent ? new Date().toISOString() : null,
        },
      },
    })
    return { error }
  }

  async function resetPasswordEmail(email) {
    if (!supabaseReady) return { error: { message: 'Supabase not configured.' } }
    const redirectTo = window.location.href.split('#')[0]
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error }
  }

  async function updatePassword(newPassword) {
    if (!supabaseReady) return { error: { message: 'Supabase not configured.' } }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) setIsRecoveryMode(false)
    return { error }
  }

  async function deleteAccount() {
    if (!supabaseReady || !session) return { error: { message: 'Not authenticated.' } }
    const { error } = await supabase
      .from('profiles')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
    if (error) return { error }
    await supabase.auth.signOut()
    return { error: null }
  }

  async function refreshProfile() {
    if (!session) return
    await fetchProfile(session.user.id, session.user.email)
  }

  async function signInWithDiscord() {
    if (!supabaseReady) return { error: { message: 'Supabase not configured.' } }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        scopes: 'identify email',
      },
    })
    return { error }
  }

  async function signOut() {
    if (!supabaseReady) return
    await supabase.auth.signOut()
  }

  const isFounder = profile?.role === 'founder'
  const isAdmin   = isFounder // legacy alias
  const user      = session?.user ?? null

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      isAdmin, isFounder,
      isRecoveryMode,
      signIn, signUp, signOut,
      signInWithDiscord,
      resetPasswordEmail, updatePassword,
      deleteAccount,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
