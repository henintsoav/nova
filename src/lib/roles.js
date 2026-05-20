export const ROLES = [
  { value: 'member_lol',  labelFr: 'Membre LoL',       labelEn: 'LoL Member',       game: 'lol' },
  { value: 'member_wr',   labelFr: 'Membre Wild Rift',  labelEn: 'Wild Rift Member', game: 'wildrift' },
  { value: 'member_valo', labelFr: 'Membre Valorant',   labelEn: 'Valorant Member',  game: 'valorant' },
  { value: 'coach_lol',   labelFr: 'Coach LoL',         labelEn: 'LoL Coach',        game: 'lol' },
  { value: 'coach_wr',    labelFr: 'Coach Wild Rift',   labelEn: 'Wild Rift Coach',  game: 'wildrift' },
  { value: 'coach_valo',  labelFr: 'Coach Valorant',    labelEn: 'Valorant Coach',   game: 'valorant' },
  { value: 'staff',       labelFr: 'Staff',             labelEn: 'Staff',            game: null },
  { value: 'member',      labelFr: 'Membre',            labelEn: 'Member',           game: null },
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
  if (role === 'staff') return ['lol', 'wildrift', 'valorant']
  const game = getRoleGame(role)
  return game ? [game] : []
}

export function canAccessGame(role, game) {
  return getAccessibleGames(role).includes(game)
}

export function isCoach(role) {
  return typeof role === 'string' && role.startsWith('coach_')
}

export function isStaff(role) {
  return role === 'staff'
}

export function isCoachOrStaff(role) {
  return isCoach(role) || isStaff(role)
}

export function hasCalendarAccess(role) {
  return role !== 'member' && Boolean(role)
}

export function canCreateProposal(role) {
  return isCoachOrStaff(role)
}

export function getRoleLabel(role, lang = 'fr') {
  const found = ROLES.find((r) => r.value === role)
  if (!found) return role
  return lang === 'fr' ? found.labelFr : found.labelEn
}
