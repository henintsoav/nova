import { createContext, useContext, useState } from 'react'
import fr from '../i18n/fr'
import en from '../i18n/en'

const translations = { fr, en }
const STORAGE_KEY  = 'nova_lang'
const LANGUAGES    = ['fr', 'en']

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.includes(saved) ? saved : 'fr'
  })

  function switchLang(l) {
    if (!LANGUAGES.includes(l)) return
    setLang(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], switchLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
