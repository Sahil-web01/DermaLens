/**
 * Centralized API base URL resolver.
 * When running in client browser on HTTPS (e.g. Vercel), defaults to same-origin '/api'
 * to avoid browser mixed-content security blocks against http://localhost:5000.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const configured = process.env.NEXT_PUBLIC_API_URL
    if (configured && configured.startsWith('https://')) {
      return configured.replace(/\/$/, '')
    }
    // If running in browser and URL is localhost, keep localhost if user is running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return (configured || 'http://localhost:5000/api').replace(/\/$/, '')
    }
    // In production web deployment (e.g. Vercel), route through same-origin /api
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

