/** Adresy e-mail, którym przy logowaniu/rejestracji nadawana jest rola ADMIN (ADMIN_EMAILS="a@x.pl,b@y.pl"). */
export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}
