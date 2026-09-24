'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const BACKEND_BASE = API_BASE.replace(/\/api$/, '')

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

export default function PatientDashboard() {
  const [patient, setPatient] = useState<any>(null)
  const [timeline, setTimeline] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch timeline and patient info from Express backend
        const res = await fetch(`${API_BASE}/patients/timeline`)
        if (res.ok) {
          const data = await res.json()
          if (data.patient) setPatient(data.patient)
          if (data.timeline) setTimeline(data.timeline)
        }
      } catch (err) {
        console.error('Failed to load patient data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const latestCheckIn = timeline.length > 0 ? timeline[timeline.length - 1] : null

  return (
    <DashboardLayout userRole="PATIENT" userName={patient?.name || 'David Rodriguez'}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 p-8 text-white shadow-elevated">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                Post-Operative Recovery Portal
              </span>
              <h1 className="text-3xl font-bold">
                Welcome back, {patient?.name || 'David Rodriguez'}
              </h1>
              <p className="mt-2 text-sky-100 max-w-xl">
                Procedure: <strong>{patient?.surgeryType || 'Open Appendectomy'}</strong> (MRN: {patient?.mrn || 'MRN-2026-002'}).
                Submit daily photos and symptom updates so your surgical team can review your healing.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/patient/check-in">
                <Button size="lg" className="w-full bg-white text-sky-800 hover:bg-sky-50 shadow-md font-semibold">
                  <Camera className="mr-2 h-5 w-5" /> Start Daily Check-In
                </Button>
              </Link>
              <Link href="/patient/timeline">
                <Button size="lg" variant="outline" className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur">
                  <Calendar className="mr-2 h-5 w-5" /> View Timeline
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Clinical Safety Notice: </span>
            DermaLens AI provides surgical triage support. AI analyses are experimental research aids and never replace doctor instructions. If you experience sudden high fever, uncontrollable pain, or severe wound separation, call your clinic or emergency services immediately.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Check-Ins</CardDescription>
              <CardTitle className="text-3xl font-bold text-foreground">
                {loading ? '...' : timeline.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" /> Recorded along recovery path
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latest Status</CardDescription>
              <CardTitle className="text-2xl font-bold capitalize">
                {loading ? (
                  '...'
                ) : latestCheckIn ? (
                  <Badge variant={latestCheckIn.reviewStatus === 'reviewed' ? 'default' : 'secondary'} className="text-sm">
                    {latestCheckIn.reviewStatus.replace('_', ' ')}
                  </Badge>
                ) : (
                  'No Check-Ins'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {latestCheckIn
                  ? `Captured ${new Date(latestCheckIn.capturedAt).toLocaleDateString()}`
                  : 'Start your first photo check-in'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Connected Services</CardDescription>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" /> Express + ML Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                FastAPI MobileNetV2 triage & MongoDB sync active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Check-Ins Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Recovery Check-Ins</CardTitle>
              <CardDescription>Your photographic and symptom history</CardDescription>
            </div>
            <Link href="/patient/timeline" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View full timeline <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading check-ins...</div>
            ) : timeline.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <p>No check-in entries yet. Click &quot;Start Daily Check-In&quot; to begin.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {timeline.slice(-3).reverse().map((item) => (
                  <div key={item._id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {item.photoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.photoUrl.startsWith('http') ? item.photoUrl : `${BACKEND_BASE}${item.photoUrl}`}
                          alt="Wound site"
                          className="h-16 w-16 rounded-lg object-cover border border-border bg-muted flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No Photo
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {new Date(item.capturedAt).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.reviewStatus.replace('_', ' ')}
                          </Badge>
                          {item.mlOutput?.predictedClass && (
                            <Badge
                              variant={item.mlOutput.predictedClass === 'Elevated Concern' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              AI: {item.mlOutput.predictedClass}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.clinicianNotes || 'Pending clinician review notes.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.symptoms.fever && <Badge variant="destructive" className="text-[10px]">Fever</Badge>}
                      {item.symptoms.purulentDischarge && <Badge variant="destructive" className="text-[10px]">Cloudy Discharge</Badge>}
                      {item.symptoms.spreadingRedness && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Redness</Badge>}
                      {item.symptoms.increasingPain && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Pain</Badge>}
                      {!item.symptoms.fever && !item.symptoms.purulentDischarge && !item.symptoms.spreadingRedness && !item.symptoms.increasingPain && (
                        <Badge variant="secondary" className="text-[10px]">No Severe Symptoms</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
