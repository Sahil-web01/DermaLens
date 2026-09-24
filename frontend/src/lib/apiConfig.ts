/**
 * Centralized API base URL resolver.
 * When running in client browser on HTTPS (e.g. Vercel), defaults to same-origin '/api'
 * to avoid browser mixed-content security blocks against http://localhost:5000.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const configured = process.env.NEXT_PUBLIC_API_URL
    // If configured with an external production HTTPS URL (e.g. Render backend), use it
    if (configured && configured.startsWith('https://')) {
      return configured.replace(/\/$/, '')
    }
    // Always route through same-origin /api in browser for zero CORS, zero mixed-content,
    // and autonomous server-side fallback between Express and SQLite
    return '/api'
  }
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
}

/**
 * Resolves check-in photo URLs.
 * If in production or photo starts with '/uploads', serves directly from local/static public folder.
 */
export function resolvePhotoUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) return ''
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://') || photoUrl.startsWith('data:')) return photoUrl
  
  const apiBase = getApiBase()
  // When running on Vercel or same-origin /api, serve /uploads directly from public folder
  if (apiBase === '/api' || (typeof window !== 'undefined' && window.location.hostname !== 'localhost')) {
    return photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`
  }
  
  const backendBase = apiBase.replace(/\/api$/, '')
  return `${backendBase}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`
}

