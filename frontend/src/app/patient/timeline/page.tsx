'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Camera, AlertCircle, CheckCircle2, ShieldAlert, Printer, FileText } from 'lucide-react'
import { ClinicalReportModal } from '@/components/clinical/clinical-report-modal'
import { getBackendAuthHeaders } from '@/lib/backendSession'

import { getApiBase, resolvePhotoUrl } from '@/lib/apiConfig'


interface CheckInRecord {
  _id: string
  photoUrl: string
  capturedAt: string
  symptoms: {
    fever?: boolean
    increasingPain?: boolean
    purulentDischarge?: boolean
    spreadingRedness?: boolean
  }
  mlOutput?: {
    concernScore: number | null
    predictedClass: string
    modelVersion: string
  }
  reviewStatus: string
  clinicianNotes?: string
}

function TimelineContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const patientId = searchParams?.get('patientId')

  const [patient, setPatient] = useState<any>(null)
  const [timeline, setTimeline] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isReportOpen, setIsReportOpen] = useState(false)

  const isClinician = session?.user?.role === 'CLINICIAN'
  const patientDisplayName = patient?.name || (isClinician ? 'Patient' : session?.user?.name || 'Patient')
  const userHeaderName = session?.user?.name || (isClinician ? 'Dr. Sarah Chen, MD' : patientDisplayName)
  const userRole = (session?.user?.role || 'PATIENT') as 'PATIENT' | 'CLINICIAN'

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const email = session?.user?.email
        const name = session?.user?.name
        const query = email ? `email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}` : ''

        const url = patientId
          ? `${getApiBase()}/patients/${patientId}/timeline`
          : `${getApiBase()}/patients/timeline${query ? `?${query}` : ''}`


        const headers = getBackendAuthHeaders(session)
        const res = await fetch(url, { headers })
        if (res.ok) {
          const data = await res.json()
          if (data.patient) setPatient(data.patient)
          if (data.timeline) {
            setTimeline(data.timeline)
            setSelectedIndex(data.timeline.length > 0 ? data.timeline.length - 1 : 0)
          }
        } else if (res.status === 403) {
          const errData = await res.json().catch(() => null)
          setAccessDeniedMessage(errData?.message || 'Access Denied: You are not the assigned clinician for this patient.')
        }
      } catch (err) {
        console.error('Failed to load timeline:', err)
      } finally {
        setLoading(false)
      }
    }
    if (session !== undefined) {
      fetchTimeline()
    }
  }, [patientId, session])

  const currentItem = timeline.length > 0 ? timeline[selectedIndex] : null

  return (
    <DashboardLayout userRole={userRole} userName={userHeaderName}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={isClinician ? '/clinician/patients' : '/patient'}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> {isClinician ? 'Patient Cohort' : 'Dashboard'}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Recovery Timeline Scrubber</h1>
              <p className="text-sm text-muted-foreground">
                Patient: <strong>{patientDisplayName}</strong> (MRN: {patient?.mrn || 'Assigned'}) &bull; Procedure:{' '}
                {patient?.surgeryType || 'General Post-Op Surveillance'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReportOpen(true)}
              className="gap-1.5 text-xs text-sky-600 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
            >
              <Printer className="h-4 w-4" /> Export Report (PDF)
            </Button>
            {!isClinician && (
              <Link href="/patient/check-in">
                <Button className="gap-2" size="sm">
                  <Camera className="h-4 w-4" /> New Check-In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Safety Banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            DermaLens AI wound trajectory scrubber provides historical visualization of healing. AI concern scores are experimental and never supersede physician directives.
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading timeline...</div>
        ) : accessDeniedMessage ? (
          <Card className="border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 max-w-lg mx-auto">
            <CardContent className="py-16 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Clinical Access Restricted</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {accessDeniedMessage} Under physician-patient isolation rules, patient wound photos, symptoms, and check-in timelines are strictly restricted to the assigned attending clinician.
              </p>
              <div className="pt-2">
                <Link href={isClinician ? '/clinician/patients' : '/patient'}>
                  <Button className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Return to My Patient Cohort
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : timeline.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center max-w-lg mx-auto">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Awaiting Initial Check-In</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                {isClinician
                  ? `Patient ${patientDisplayName} (${patient?.mrn || 'Assigned'}) is enrolled in remote surgical surveillance. No post-operative wound photos have been recorded yet.`
                  : "You haven't recorded any wound check-ins yet. Take your baseline Day 0/Day 1 photo to begin tracking your recovery trajectory."}
              </p>
              {isClinician ? (
                <div className="flex justify-center gap-3">
                  <Link href="/clinician/patients">
                    <Button variant="outline">Back to Cohort</Button>
                  </Link>
                  <Button
                    onClick={() => alert(`Check-in reminder prompt queued for ${patientDisplayName}.`)}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Request Check-In
                  </Button>
                </div>
              ) : (
                <Link href="/patient/check-in">
                  <Button className="gap-2">
                    <Camera className="h-4 w-4" /> Start First Check-In
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Scrubber Navigation Bar */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                  {timeline.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    const date = new Date(item.capturedAt)
                    const isHighRisk =
                      item.symptoms.fever ||
                      item.symptoms.purulentDischarge ||
                      item.mlOutput?.predictedClass === 'Elevated Concern'

                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`flex-1 min-w-[130px] p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                            : 'border-border hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Day {idx + 1}</span>
                          {isHighRisk ? (
                            <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="mt-2 text-[10px] font-medium uppercase tracking-wider">
                          <span className={item.reviewStatus === 'reviewed' ? 'text-emerald-600' : 'text-amber-600'}>
                            {item.reviewStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Check-In Detail View */}
            {currentItem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo Viewer */}
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Wound Photo</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {new Date(currentItem.capturedAt).toLocaleString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center p-6 bg-muted/20 min-h-[380px]">
                    {currentItem.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={resolvePhotoUrl(currentItem.photoUrl)}
                        alt="Wound Capture"

                        className="w-full max-w-[420px] aspect-square rounded-xl object-contain shadow-md border border-border bg-slate-900/5 dark:bg-slate-900/40"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                        }}
                      />
                    ) : (
                      <div className="text-muted-foreground text-sm">No photo available</div>
                    )}
                  </CardContent>
                </Card>

                {/* Details & Symptoms Panel */}
                <div className="space-y-6">
                  {/* AI Triage Assessment */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>AI Triage Analysis</span>
                        <Badge
                          variant={
                            currentItem.mlOutput?.predictedClass === 'Elevated Concern'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {currentItem.mlOutput?.predictedClass || 'Low Concern'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Concern Score:</span>
                        <span className="font-semibold text-foreground">
                          {currentItem.mlOutput?.concernScore !== null && currentItem.mlOutput?.concernScore !== undefined
                            ? `${Math.round(currentItem.mlOutput.concernScore * 100)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Model Architecture:</span>
                        <span className="text-foreground">MobileNetV2 CNN ({currentItem.mlOutput?.modelVersion || 'v1.0'})</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reported Symptoms */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Reported Symptoms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              currentItem.symptoms.fever ? 'bg-destructive' : 'bg-emerald-500'
                            }`}
                          />
                          <span>Fever: {currentItem.symptoms.fever ? 'Yes (Reported)' : 'No'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              currentItem.symptoms.purulentDischarge ? 'bg-destructive' : 'bg-emerald-500'
                            }`}
                          />
                          <span>Discharge: {currentItem.symptoms.purulentDischarge ? 'Cloudy/Pus' : 'None'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              currentItem.symptoms.spreadingRedness ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>Erythema: {currentItem.symptoms.spreadingRedness ? 'Spreading' : 'Normal'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              currentItem.symptoms.increasingPain ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>Pain: {currentItem.symptoms.increasingPain ? 'Increasing' : 'Controlled'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Clinician Review & Notes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Clinical Team Review</span>
                        <Badge variant="outline" className="capitalize">
                          {currentItem.reviewStatus.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 border border-border">
                        {currentItem.clinicianNotes || 'Case is currently pending review by your surgical care team.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clinical PDF Report Modal */}
        <ClinicalReportModal
          patientId={patient?.id || patient?._id || patientId}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      </div>
    </DashboardLayout>
  )
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
          Loading recovery timeline...
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  )
}
