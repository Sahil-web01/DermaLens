import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Providers } from './providers'

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    if (session.user.role === 'PATIENT') {
      redirect('/patient')
    } else {
      redirect('/clinician')
    }
  }

  return (
    <Providers>
      <main className="min-h-screen flex flex-col">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-xl font-semibold text-foreground">DermaLens AI</span>
              </div>
              <nav className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Get Started
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <section className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Smart Surgical Wound Monitoring & Triage Support
            </h1>
            <p className="mb-10 text-lg text-muted-foreground max-w-2xl mx-auto">
              DermaLens AI helps patients and clinicians collaborate on post-operative wound recovery.
              Guided photo capture, structured symptom check-ins, and experimental AI research output
              support clinical decision-making — never replacing it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-ring">
                Access Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 px-4">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-2xl font-semibold text-foreground">How It Works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Guided Photo Capture</h3>
                <p className="text-muted-foreground">Patients capture standardized wound photos with overlay guidance, automatic quality feedback, and framing assistance.</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Structured Symptom Check-In</h3>
                <p className="text-muted-foreground">Pain scores (0–10), redness, swelling, drainage, fever, and free-text notes — always visible to clinicians.</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Experimental AI Research Output</h3>
                <p className="text-muted-foreground">MobileNetV2-compatible concern assessment labeled as research output. Never overrides patient-reported symptoms.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 px-4 bg-muted/50">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-lg border border-border bg-card p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">Important Safety Notice</h3>
                  <p className="text-muted-foreground">
                    <strong>Experimental research output.</strong> This result is not a medical diagnosis and does not replace clinical assessment.
                    AI output must never override patient-reported symptoms. A lower AI concern score must never cancel fever, increasing pain, redness, swelling, or drainage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-8 px-4">
          <div className="mx-auto max-w-7xl text-center text-sm text-muted-foreground">
            <p>DermaLens AI — Hackathon Prototype. Not a clinical diagnostic system.</p>
          </div>
        </footer>
      </main>
    </Providers>
  )
}