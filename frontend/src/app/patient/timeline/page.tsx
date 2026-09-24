'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Camera, AlertCircle, CheckCircle2, ShieldAlert, Printer, FileText } from 'lucide-react'
import { ClinicalReportModal } from '@/components/clinical/clinical-report-modal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

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
  const searchParams = useSearchParams()
  const patientId = searchParams?.get('patientId')

  const [patient, setPatient] = useState<any>(null)
  const [timeline, setTimeline] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isReportOpen, setIsReportOpen] = useState(false)

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const url = patientId
          ? `${API_BASE}/patients/${patientId}/timeline`
          : `${API_BASE}/patients/timeline`

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.patient) setPatient(data.patient)
          if (data.timeline) {
            setTimeline(data.timeline)
            setSelectedIndex(data.timeline.length - 1)
          }
        }
      } catch (err) {
        console.error('Failed to load timeline:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTimeline()
  }, [patientId])

  const currentItem = timeline[selectedIndex]

  return (
    <DashboardLayout userRole="PATIENT">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/patient">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Recovery Timeline Scrubber</h1>
              <p className="text-sm text-muted-foreground">
                Patient: <strong>{patient?.name || 'David Rodriguez'}</strong> &bull; Procedure:{' '}
                {patient?.surgeryType || 'Open Appendectomy'}
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
            <Link href="/patient/check-in">
              <Button className="gap-2" size="sm">
                <Camera className="h-4 w-4" /> New Check-In
              </Button>
            </Link>
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
        ) : timeline.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-40" />
              <h3 className="text-lg font-semibold text-foreground">No Timeline Records Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
                You haven&apos;t recorded any wound check-ins yet. Take your first photo to begin tracking your recovery.
              </p>
              <Link href="/patient/check-in">
                <Button>Start First Check-In</Button>
              </Link>
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
                  <CardContent className="flex items-center justify-center p-6 bg-muted/30 min-h-[340px]">
                    {currentItem.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`http://localhost:5000${currentItem.photoUrl}`}
                        alt="Wound Capture"
                        className="max-h-[380px] w-auto rounded-lg object-contain shadow-card border border-border"
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
