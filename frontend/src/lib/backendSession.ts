import type { Session } from 'next-auth'

const TOKEN_KEY = 'dermalens_backend_token'

export function getBackendAuthHeaders(session: Session | null | undefined): HeadersInit {
  const headers: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (session?.user?.email) {
    headers['X-Clinician-Email'] = session.user.email
  }
  return headers
}

/** After NextAuth login, obtain matching Express JWT for protected MongoDB routes. */
export async function syncBackendAuthToken(email: string, password: string): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  try {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, data.token)
    }
  } catch {
    // Backend may be offline; X-Clinician-Email still scopes clinician views when Mongo user exists.
  }
}

export function clearBackendAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
  }
}
