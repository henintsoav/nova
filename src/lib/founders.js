// Authoritative list of founder emails.
// Users with these emails always get role = 'founder'.
// Checked both server-side (DB trigger) and client-side (AuthContext).
export const FOUNDER_EMAILS = [
  'victoriaheny@gmail.com',
  'nielsmerieau@hotmail.fr',
  'peeeeachyy@gmail.com',
]

export function isFounderEmail(email) {
  return typeof email === 'string' && FOUNDER_EMAILS.includes(email.toLowerCase())
}
