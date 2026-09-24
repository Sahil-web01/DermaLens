'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Camera,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  HeartHandshake,
  Check,
  X,
  UserPlus,
  RefreshCw,
} from 'lucide-react'
import { ChoosePhysicianModal } from '@/components/patient/choose-physician-modal'
import { getApiBase, resolvePhotoUrl } from '@/lib/apiConfig'
import { getBackendAuthHeaders } from '@/lib/backendSession'


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
  const { data: session } = useSession()
  const [patient, setPatient] = useState<any>(null)
  const [timeline, setTimeline] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const displayName = session?.user?.name || patient?.name || 'Patient'

  const loadData = useCallback(async () => {
    try {
      const email = session?.user?.email
      const name = session?.user?.name
      const query = email ? `?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}` : ''
      const headers = getBackendAuthHeaders(session)
      const res = await fetch(`${getApiBase()}/patients/timeline${query}`, { headers })
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
  }, [session?.user?.email, session?.user?.name])

  useEffect(() => {
    if (session !== undefined) {
      loadData()
    }
  }, [session, loadData])

  const handleAcceptOffer = async () => {
    if (!patient?._id && !session?.user?.email) return
    setActionLoading(true)
    setActionNotice(null)
    try {
      const idOrEndpoint = patient?._id || 'patient-consent'
      const res = await fetch(`${getApiBase()}/patients/${idOrEndpoint}/patient-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          email: session?.user?.email,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({ type: 'success', text: data.message || 'Physician care offer accepted!' })
        await loadData()
      } else {
        setActionNotice({ type: 'error', text: data.message || 'Failed to accept offer.' })
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Network error.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineOffer = async () => {
    if (!patient?._id && !session?.user?.email) return
    if (!window.confirm('Are you sure you want to decline this doctor? You will be able to choose another physician.')) return
    setActionLoading(true)
    setActionNotice(null)
    try {
      const idOrEndpoint = patient?._id || 'patient-consent'
      const res = await fetch(`${getApiBase()}/patients/${idOrEndpoint}/patient-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          email: session?.user?.email,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({ type: 'success', text: 'Care offer declined. Please select your preferred doctor.' })
        await loadData()
        setIsModalOpen(true)
      } else {
        setActionNotice({ type: 'error', text: data.message || 'Failed to decline offer.' })
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Network error.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSelectDoctor = async (clinicianId: string, doctorName: string) => {
    setActionLoading(true)
    setActionNotice(null)
    try {
      const idOrEndpoint = patient?._id || 'request-doctor'
      const res = await fetch(`${getApiBase()}/patients/${idOrEndpoint}/request-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicianId,
          email: session?.user?.email,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({
          type: 'success',
          text: `Care request sent to ${doctorName}! Awaiting physician clinical consent.`,
        })
        await loadData()
      } else {
        setActionNotice({ type: 'error', text: data.message || 'Failed to submit request.' })
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Network error.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReleaseDoctor = async () => {
    if (!window.confirm('Do you wish to release your current doctor assignment and select another physician?')) return
    setActionLoading(true)
    setActionNotice(null)
    try {
      const idOrEndpoint = patient?._id || 'release-doctor'
      const res = await fetch(`${getApiBase()}/patients/${idOrEndpoint}/release-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({ type: 'success', text: 'Doctor assignment released. You may choose a new physician.' })
        await loadData()
        setIsModalOpen(true)
      } else {
        setActionNotice({ type: 'error', text: data.message || 'Failed to release assignment.' })
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Network error.' })
    } finally {
      setActionLoading(false)
    }
  }


  const latestCheckIn = timeline.length > 0 ? timeline[timeline.length - 1] : null
  const assignmentStatus = patient?.assignmentStatus || (patient?.assignedClinicianId ? 'assigned' : 'unassigned')

  return (
    <DashboardLayout userRole="PATIENT" userName={displayName}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 p-8 text-white shadow-elevated">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                Post-Operative Recovery Portal
              </span>
              <h1 className="text-3xl font-bold">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 text-sky-100 max-w-xl">
                Procedure: <strong>{patient?.surgeryType || 'General Post-Op Surveillance'}</strong> (MRN: {patient?.mrn || 'Assigned on enrollment'}).
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

        {/* Action Notice Toast/Alert */}
        {actionNotice && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            <span>{actionNotice.text}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-xs font-semibold underline ml-4 hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ATTENDING CARE TEAM & PATIENT-DOCTOR MUTUAL CONSENT CARD */}
        {/* ======================================================== */}
        <Card className="border-2 overflow-hidden shadow-sm">
          {assignmentStatus === 'pending_patient_consent' ? (
            /* STATE 1: DOCTOR MADE AN OFFER - PATIENT MUST ACCEPT OR DECLINE */
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="h-5 w-5 text-amber-600 animate-pulse" />
                    <h3 className="text-lg font-bold text-foreground">Physician Care Offer Received</h3>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
                      Your Consent Required
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90">
                    <strong>{patient?.pendingClinician?.name || 'An attending surgeon'}</strong> ({patient?.pendingClinician?.email}) has offered to oversee your surgical wound surveillance.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Patient Autonomy: You have the right to accept this physician or decline and select another surgeon of your choice.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2 self-start md:self-center">
                  <Button
                    onClick={handleAcceptOffer}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  >
                    <Check className="h-4 w-4" /> Accept &amp; Consent to Doctor
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeclineOffer}
                    disabled={actionLoading}
                    className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs gap-1.5 font-semibold"
                  >
                    <X className="h-4 w-4" /> Decline &amp; Choose Another Doctor
                  </Button>
                </div>
              </div>
            </div>
          ) : assignmentStatus === 'pending_doctor_consent' ? (
            /* STATE 2: PATIENT REQUESTED DOCTOR - AWAITING DOCTOR CONSENT */
            <div className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-l-4 border-sky-500 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-sky-600" />
                    <h3 className="text-lg font-bold text-foreground">Doctor Clinical Consent Pending</h3>
                    <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300 text-xs font-semibold">
                      Awaiting Surgeon Consent
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90">
                    You selected <strong>{patient?.pendingClinician?.name || 'your chosen doctor'}</strong> ({patient?.pendingClinician?.email}) as your attending physician.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your care request was sent. The surgeon will review your surgical case and confirm clinical consent shortly.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  disabled={actionLoading}
                  className="text-xs font-semibold gap-1.5 self-start md:self-center"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Change / Select Different Doctor
                </Button>
              </div>
            </div>
          ) : assignmentStatus === 'assigned' && (patient?.assignedClinician || patient?.assignedClinicianId) ? (
            /* STATE 3: MUTUAL CONSENT ACTIVE */
            <div className="p-6 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent border-l-4 border-emerald-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-foreground">Attending Physician</h3>
                    <Badge variant="default" className="bg-emerald-600 text-xs font-semibold gap-1">
                      Active Mutual Consent
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90 font-medium">
                    {patient?.assignedClinician?.name || 'Dr. Sarah Chen, MD'}{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      ({patient?.assignedClinician?.email || 'clinician@demo.com'})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This doctor is actively reviewing your wound healing trajectory and symptom flags. You retain patient autonomy to change your attending doctor at any time.
                  </p>
                </div>

                <div className="flex gap-2 self-start md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    disabled={actionLoading}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Change Doctor
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReleaseDoctor}
                    disabled={actionLoading}
                    className="text-xs text-muted-foreground hover:text-rose-600"
                  >
                    Release
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 4: UNASSIGNED - PATIENT CHOOSES THEIR DOCTOR */
            <div className="p-6 bg-gradient-to-r from-slate-500/5 via-indigo-500/5 to-transparent border-l-4 border-indigo-400">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-foreground">Choose Your Attending Surgeon</h3>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Unassigned
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90">
                    You are not currently assigned to a doctor. In DermaLens, patients have the right to select their attending physician with doctor consent.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Browse our verified hospital clinical directory to choose the surgeon who will monitor your wound.
                  </p>
                </div>

                <Button
                  onClick={() => setIsModalOpen(true)}
                  disabled={actionLoading}
                  className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 self-start md:self-center shadow-sm"
                >
                  <Stethoscope className="h-4 w-4" /> Choose Doctor
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Safety Disclaimer Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200 p-4 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
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
                          src={resolvePhotoUrl(item.photoUrl)}
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

        {/* Modal: Choose Your Attending Physician with Mutual Consent */}
        <ChoosePhysicianModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectDoctor={handleSelectDoctor}
          currentDoctorId={patient?.assignedClinicianId || patient?.assignedClinician?._id}
          pendingDoctorId={patient?.pendingClinicianId || patient?.pendingClinician?._id}
        />
      </div>
    </DashboardLayout>
  )
}
