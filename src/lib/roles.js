// All assignable roles (used by founders in the admin panel)
export const ROLES = [
  { value: 'founder',    labelFr: 'Fondateur',      labelEn: 'Founder',          game: null },
  { value: 'staff',      labelFr: 'Staff',           labelEn: 'Staff',            game: null },
  { value: 'coach_lol',  labelFr: 'Coach LoL',       labelEn: 'LoL Coach',        game: 'lol' },
  { value: 'coach_wr',   labelFr: 'Coach Wild Rift', labelEn: 'Wild Rift Coach',  game: 'wildrift' },
  { value: 'coach_valo', labelFr: 'Coach Valorant',  labelEn: 'Valorant Coach',   game: 'valorant' },
  { value: 'member_lol', labelFr: 'Membre LoL',      labelEn: 'LoL Member',       game: 'lol' },
  { value: 'member_wr',  labelFr: 'Membre Wild Rift',labelEn: 'Wild Rift Member', game: 'wildrift' },
  { value: 'member_valo',labelFr: 'Membre Valorant', labelEn: 'Valorant Member',  game: 'valorant' },
  { value: 'member',     labelFr: 'Membre',          labelEn: 'Member',           game: null },
]

const GAME_MAP = {
  member_lol:  'lol',
  member_wr:   'wildrift',
  member_valo: 'valorant',
  coach_lol:   'lol',
  coach_wr:    'wildrift',
  coach_valo:  'valorant',
}

export function getRoleGame(role) {
  return GAME_MAP[role] ?? null
}

export function getAccessibleGames(role) {
  if (role === 'founder' || role === 'staff') return ['lol', 'wildrift', 'valorant']
  const game = getRoleGame(role)
  return game ? [game] : []
}

export function canAccessGame(role, game) {
  return getAccessibleGames(role).includes(game)
}

export function isFounder(role) {
  return role === 'founder'
}

export function isCoach(role) {
  return typeof role === 'string' && role.startsWith('coach_')
}

export function isStaff(role) {
  return role === 'staff'
}

export function isCoachOrStaff(role) {
  return isCoach(role) || isStaff(role) || isFounder(role)
}

// Scrim section is visible for founder, staff, coach_*, member_*
// Hidden for role='member' (default) and unauthenticated
export function hasScrimAccess(role) {
  return Boolean(role) && role !== 'member'
}

// Keep old name as alias so existing callers don't break
export const hasCalendarAccess = hasScrimAccess

export function canCreateProposal(role) {
  return isCoachOrStaff(role)
}

export function canManageContent(role) {
  return role === 'founder' || role === 'staff'
}

export function canManageResults(role) {
  return isCoachOrStaff(role)
}

// Only founders can assign / change roles
export function canAssignRoles(role) {
  return isFounder(role)
}

// Coaches manage their game's roster; staff and founders manage all
const COACH_GAME = { coach_lol: 'lol', coach_wr: 'wildrift', coach_valo: 'valorant' }

export function canManageRoster(role, game) {
  if (role === 'founder' || role === 'staff') return true
  return COACH_GAME[role] === game
}

export function getRoleLabel(role, lang = 'fr') {
  const found = ROLES.find((r) => r.value === role)
  if (!found) return role ?? '—'
  return lang === 'fr' ? found.labelFr : found.labelEn
}
