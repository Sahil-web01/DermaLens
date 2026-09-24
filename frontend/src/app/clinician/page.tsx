'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  X,
  Loader2,
  FileText,
  Printer,
  Stethoscope,
  Activity,
  Eye,
  Thermometer,
  AlertCircle,
  Calendar,
  Sparkles,
  Maximize2,
  Droplets,
  Flame,
} from 'lucide-react'
import { ClinicalReportModal } from '@/components/clinical/clinical-report-modal'
import { formatDateTime } from '@/lib/utils'
import { getBackendAuthHeaders } from '@/lib/backendSession'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const BACKEND_BASE = API_BASE.replace(/\/api$/, '')

interface QueueItem {
  _id: string
  patientId: {
    _id: string
    name: string
    mrn: string
    surgeryType: string
    surgeryDate?: string
  }
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
  isHighRisk?: boolean
  riskReasons?: string[]
}

interface StatsData {
  total: number
  pending: number
  flagged: number
  underReview: number
  reviewed: number
}

export default function ClinicianDashboard() {
  const { data: session } = useSession()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    pending: 0,
    flagged: 0,
    underReview: 0,
    reviewed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<QueueItem | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [newStatus, setNewStatus] = useState('reviewed')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [filter, setFilter] = useState<'all' | 'high_risk' | 'pending'>('all')
  const [reportPatientId, setReportPatientId] = useState<string | null>(null)

  const clinicianName = session?.user?.name || 'Dr. Sarah Chen, MD'

  const fetchQueueAndStats = async () => {
    const authHeaders = getBackendAuthHeaders(session)
    try {
      // 1. Fetch queue prioritized by high risk
      const qRes = await fetch(`${API_BASE}/clinician/queue`, { headers: authHeaders })
      if (qRes.ok) {
        const qData = await qRes.json()
        setQueue(qData.data || [])
      }

      // 2. Fetch stats
      const sRes = await fetch(`${API_BASE}/clinician/stats`, { headers: authHeaders })
      if (sRes.ok) {
        const sData = await sRes.json()
        setStats(sData.data || stats)
      }
    } catch (err) {
      console.error('Error fetching clinician queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchQueueAndStats()
    }
  }, [session?.user?.email])

  const handleOpenReview = (item: QueueItem) => {
    setSelectedCase(item)
    setReviewNote(item.clinicianNotes || '')
    setNewStatus(item.reviewStatus === 'pending' ? 'reviewed' : item.reviewStatus)
  }

  const handleSubmitReview = async () => {
    if (!selectedCase) return
    setIsSubmittingReview(true)

    try {
      const res = await fetch(`${API_BASE}/checkins/${selectedCase._id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getBackendAuthHeaders(session),
        },
        body: JSON.stringify({
          reviewStatus: newStatus,
          clinicianNotes: reviewNote,
        }),
      })

      if (res.ok) {
        setSelectedCase(null)
        await fetchQueueAndStats()
      } else {
        const err = await res.json()
        alert(`Failed to save review: ${err.message || 'Server error'}`)
      }
    } catch (error: any) {
      alert(`Network error: ${error.message}`)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const filteredQueue = queue.filter((item) => {
    if (filter === 'high_risk') return item.isHighRisk
    if (filter === 'pending') return item.reviewStatus === 'pending'
    return true
  })

  return (
    <DashboardLayout userRole="CLINICIAN" userName={clinicianName}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Clinician Surgical Triage Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Clinician: <strong className="text-foreground">{clinicianName}</strong> &bull; Prioritized by AI MobileNetV2 concern scores and positive severe symptom flags.
            </p>
          </div>
          <Button onClick={fetchQueueAndStats} variant="outline" size="sm" className="gap-2">
            <Clock className="h-4 w-4" /> Refresh Queue
          </Button>
        </div>

        {/* Safety Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200 p-4 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="font-semibold">Safety Boundary: </strong>
            Experimental triage decision aid. MobileNetV2 CNN scores must NEVER override reported fever or purulent discharge. A low AI concern score does NOT cancel patient-reported symptoms.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardDescription>Flagged High Risk</CardDescription>
              <CardTitle className="text-3xl font-bold text-rose-600 flex items-center justify-between">
                <span>{stats.flagged}</span>
                <AlertTriangle className="h-6 w-6 text-rose-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Fever, discharge, or CNN score &ge; 50%</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardDescription>Pending Triage</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600 flex items-center justify-between">
                <span>{stats.pending}</span>
                <Clock className="h-6 w-6 text-amber-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Awaiting clinician assessment</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardDescription>Total Ingested</CardDescription>
              <CardTitle className="text-3xl font-bold text-foreground flex items-center justify-between">
                <span>{stats.total}</span>
                <Users className="h-6 w-6 text-primary opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Recorded across all cohorts</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardDescription>Reviewed / Closed</CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-600 flex items-center justify-between">
                <span>{stats.reviewed}</span>
                <CheckCircle2 className="h-6 w-6 text-emerald-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Successfully triaged cases</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
          >
            All Actionable ({queue.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'high_risk' ? 'destructive' : 'ghost'}
            onClick={() => setFilter('high_risk')}
            className="gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> High-Risk Priority ({queue.filter((q) => q.isHighRisk).length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'pending' ? 'secondary' : 'ghost'}
            onClick={() => setFilter('pending')}
          >
            Pending Only ({queue.filter((q) => q.reviewStatus === 'pending').length})
          </Button>
        </div>

        {/* Queue List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading triage queue...</div>
          ) : filteredQueue.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <h3 className="text-lg font-semibold text-foreground">Queue is clear!</h3>
                <p className="text-sm text-muted-foreground mt-1">No unreviewed check-ins matching this filter.</p>
              </CardContent>
            </Card>
          ) : (
            filteredQueue.map((item, index) => {
              const patient = item.patientId || { name: 'Unknown', mrn: 'N/A', surgeryType: 'Surgical Recovery' }
              const score = item.mlOutput?.concernScore

              return (
                <Card
                  key={item._id}
                  onClick={() => handleOpenReview(item)}
                  className={`transition-all hover:shadow-md cursor-pointer hover:border-primary/50 group ${
                    item.isHighRisk
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20 hover:bg-rose-50/40'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Patient & Image Info */}
                    <div className="flex items-start gap-4">
                      {/* Priority rank indicator */}
                      <div className="flex flex-col items-center justify-center font-bold text-xs text-muted-foreground pt-1">
                        <span>#{index + 1}</span>
                        {item.isHighRisk && (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </div>

                      {/* Wound photo preview */}
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0 group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                        {item.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.photoUrl.startsWith('http') ? item.photoUrl : `${BACKEND_BASE}${item.photoUrl}`}
                            alt="Wound site"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                            No Photo
                          </div>
                        )}
                      </div>

                      {/* Patient details */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {patient.name}
                          </h3>
                          <span className="text-xs text-muted-foreground font-mono">({patient.mrn})</span>
                          {item.isHighRisk && (
                            <Badge variant="destructive" className="text-xs">
                              HIGH RISK
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.reviewStatus.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground mt-0.5">
                          Procedure: <strong>{patient.surgeryType}</strong> &bull; Submitted:{' '}
                          {formatDateTime(item.capturedAt)}
                        </div>

                        {/* Symptoms tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.symptoms.fever && (
                            <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                              <Thermometer className="h-3 w-3" /> Fever Reported
                            </Badge>
                          )}
                          {item.symptoms.purulentDischarge && (
                            <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                              <Droplets className="h-3 w-3" /> Purulent Discharge
                            </Badge>
                          )}
                          {item.symptoms.spreadingRedness && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 py-0 gap-1">
                              <Flame className="h-3 w-3" /> Spreading Redness
                            </Badge>
                          )}
                          {item.symptoms.increasingPain && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 py-0 gap-1">
                              <Activity className="h-3 w-3" /> Increasing Pain
                            </Badge>
                          )}
                        </div>

                        {/* Risk reasons / What is wrong summary */}
                        {item.riskReasons && item.riskReasons.length > 0 && (
                          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Priority factors: {item.riskReasons.join(' • ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Score & Action Buttons */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">MobileNetV2 Concern</div>
                        <div className="text-xl font-bold flex items-center justify-end gap-1.5">
                          <span
                            className={
                              score !== null && score !== undefined && score >= 0.5
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {score !== null && score !== undefined ? `${Math.round(score * 100)}%` : 'N/A'}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({item.mlOutput?.predictedClass || 'Analyzed'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {/* Dedicated Check Condition Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenReview(item)
                          }}
                          className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-sm"
                          title="Check patient condition and detailed symptoms"
                        >
                          <Stethoscope className="h-3.5 w-3.5" /> Check Condition
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setReportPatientId(item.patientId?._id)
                          }}
                          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          title="Export Clinical Summary PDF"
                        >
                          <FileText className="h-3.5 w-3.5 text-sky-600" /> Export PDF
                        </Button>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenReview(item)
                          }}
                          className="gap-1.5 font-semibold text-xs"
                          variant={item.isHighRisk ? 'destructive' : 'default'}
                          size="sm"
                        >
                          Triage Case <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Clinician Review & Comprehensive Patient Condition Modal */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-elevated space-y-6 my-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-border pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-2xl font-bold text-foreground">
                      Patient Condition &amp; Clinical Triage
                    </h2>
                    {selectedCase.isHighRisk ? (
                      <Badge variant="destructive" className="font-bold text-xs gap-1 py-0.5 animate-pulse">
                        <AlertTriangle className="h-3 w-3" /> HIGH RISK CASE
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                        Routine Check-In
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize font-medium">
                      Status: {selectedCase.reviewStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Patient: <strong className="text-foreground">{selectedCase.patientId?.name}</strong> &bull; MRN:{' '}
                    <span className="font-mono text-foreground font-semibold">{selectedCase.patientId?.mrn}</span> &bull; Procedure:{' '}
                    <strong className="text-foreground">{selectedCase.patientId?.surgeryType}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* What Is Wrong / Priority Findings Banner */}
              <div
                className={`rounded-xl border p-4 sm:p-5 space-y-3 ${
                  selectedCase.isHighRisk
                    ? 'border-rose-300 bg-rose-50/80 dark:bg-rose-950/40 dark:border-rose-900 text-rose-950 dark:text-rose-100'
                    : 'border-slate-200 bg-slate-50/80 dark:bg-slate-900/40 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-base">
                    {selectedCase.isHighRisk ? (
                      <>
                        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                        <span>Clinical Danger Signs &amp; What Is Wrong:</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Wound Condition Assessment:</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-background/80 border border-border">
                    Captured {formatDateTime(selectedCase.capturedAt)}
                  </span>
                </div>

                {/* Specific Findings Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Fever */}
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                      selectedCase.symptoms.fever
                        ? 'bg-rose-100/70 border-rose-300 text-rose-950 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-100 font-semibold'
                        : 'bg-background/80 border-border text-muted-foreground'
                    }`}
                  >
                    <Thermometer className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <div className="font-bold text-foreground">Fever Status</div>
                      {selectedCase.symptoms.fever
                        ? 'Active systemic fever reported (> 38.0°C / 100.4°F). Suggests acute surgical site infection (SSI) or inflammatory escalation.'
                        : 'Afebrile. Patient reports normal body temperature.'}
                    </div>
                  </div>

                  {/* Purulence */}
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                      selectedCase.symptoms.purulentDischarge
                        ? 'bg-rose-100/70 border-rose-300 text-rose-950 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-100 font-semibold'
                        : 'bg-background/80 border-border text-muted-foreground'
                    }`}
                  >
                    <Droplets className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <div className="font-bold text-foreground">Wound Exudate / Discharge</div>
                      {selectedCase.symptoms.purulentDischarge
                        ? 'Cloudy, purulent exudate detected. High hallmark indicator of localized bacterial colonization or abscess.'
                        : 'Clear, serosanguinous, or no active exudate reported.'}
                    </div>
                  </div>

                  {/* Redness */}
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                      selectedCase.symptoms.spreadingRedness
                        ? 'bg-amber-100/70 border-amber-300 text-amber-950 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100 font-semibold'
                        : 'bg-background/80 border-border text-muted-foreground'
                    }`}
                  >
                    <Flame className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="font-bold text-foreground">Periwound Erythema (Redness)</div>
                      {selectedCase.symptoms.spreadingRedness
                        ? 'Advancing redness expanding outward beyond incision margin. Monitor closely for surgical site cellulitis.'
                        : 'No advancing redness. Incision margins intact.'}
                    </div>
                  </div>

                  {/* Pain */}
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                      selectedCase.symptoms.increasingPain
                        ? 'bg-amber-100/70 border-amber-300 text-amber-950 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100 font-semibold'
                        : 'bg-background/80 border-border text-muted-foreground'
                    }`}
                  >
                    <Activity className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="font-bold text-foreground">Post-Operative Pain Level</div>
                      {selectedCase.symptoms.increasingPain
                        ? 'Escalating pain reported despite baseline analgesics. Check for hematoma or deep tissue tension.'
                        : 'Pain manageable or improving along expected trajectory.'}
                    </div>
                  </div>
                </div>

                {selectedCase.riskReasons && selectedCase.riskReasons.length > 0 && (
                  <div className="pt-1 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Summary Factors: {selectedCase.riskReasons.join(' • ')}</span>
                  </div>
                )}
              </div>

              {/* Main Clinical Inspection: Wound Photo & AI Diagnostics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left Column: Visual Wound Site Inspection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-primary" /> Visual Wound Photo Inspection
                    </span>
                    <Link
                      href={`/patient/timeline?patientId=${selectedCase.patientId?._id}`}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Calendar className="h-3.5 w-3.5" /> Compare In Timeline &gt;
                    </Link>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-border shadow-md aspect-square flex items-center justify-center group">
                    {selectedCase.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedCase.photoUrl.startsWith('http') ? selectedCase.photoUrl : `${BACKEND_BASE}${selectedCase.photoUrl}`}
                        alt="High-resolution clinical wound photo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-400 text-sm">No photo available</div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-[11px] font-mono">
                        {formatDateTime(selectedCase.capturedAt)}
                      </span>
                      <a
                        href={selectedCase.photoUrl.startsWith('http') ? selectedCase.photoUrl : `${BACKEND_BASE}${selectedCase.photoUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="pointer-events-auto px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-xs hover:bg-black/90 transition-colors flex items-center gap-1"
                      >
                        <Maximize2 className="h-3 w-3" /> Full Res
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Diagnostics & Quick Presets */}
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" /> AI MobileNetV2 Neural Analysis
                    </span>
                    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground">Automated Concern Score</div>
                          <div className="text-2xl font-bold flex items-center gap-2">
                            <span
                              className={
                                selectedCase.mlOutput?.concernScore !== null &&
                                selectedCase.mlOutput?.concernScore !== undefined &&
                                selectedCase.mlOutput.concernScore >= 0.5
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              {selectedCase.mlOutput?.concernScore !== null && selectedCase.mlOutput?.concernScore !== undefined
                                ? `${Math.round(selectedCase.mlOutput.concernScore * 100)}%`
                                : 'Pending'}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
                              {selectedCase.mlOutput?.predictedClass || 'Analyzed'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground font-mono">
                          v{selectedCase.mlOutput?.modelVersion || '1.0.0'}
                        </div>
                      </div>

                      {/* Visual Score Progress Bar */}
                      {selectedCase.mlOutput?.concernScore !== null && selectedCase.mlOutput?.concernScore !== undefined && (
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              selectedCase.mlOutput.concernScore >= 0.5 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, selectedCase.mlOutput.concernScore * 100))}%` }}
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Evaluates vascular erythema density, color variance, and incision boundary continuity. AI scores serve exclusively as clinical decision aids and never override patient symptoms.
                      </p>
                    </div>
                  </div>

                  {/* Quick Preset Note Suggestions */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Quick Clinician Note Presets
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          label: 'Routine Healing',
                          note: 'Incision healing appropriately. Continue standard post-op dressing changes and hygiene. Keep incision dry.',
                        },
                        {
                          label: 'Advise ER / Urgent Visit',
                          note: 'Urgent: Due to reported fever and cloudy exudate, please report immediately to the acute surgical clinic or nearest Emergency Room for in-person evaluation.',
                        },
                        {
                          label: 'Outline Redness',
                          note: 'Take a sterile ballpoint pen and outline the border of the redness now. If redness extends past the line in the next 12 hours, call clinic immediately.',
                        },
                        {
                          label: 'Request Retake Photo',
                          note: 'Photo was blurry or poorly lit. Please retake photo with bright direct lighting from 15-20cm distance.',
                        },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setReviewNote(preset.note)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors text-left"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Triage Decision / Form */}
              <div className="pt-2 border-t border-border space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Clinician Triage Determination
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'reviewed', label: 'Reviewed / Safe', color: 'border-emerald-500' },
                      { key: 'escalated', label: 'Escalate to Clinic', color: 'border-rose-500' },
                      { key: 'retake_requested', label: 'Request Retake', color: 'border-amber-500' },
                      { key: 'manual_review_required', label: 'Specialist Consult', color: 'border-sky-500' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setNewStatus(opt.key)}
                        className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                          newStatus === opt.key
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card text-foreground hover:bg-muted border-border'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="clinicianNote" className="text-sm font-semibold text-foreground block mb-1.5">
                    Clinician Instructions &amp; Patient Advice
                  </label>
                  <Textarea
                    id="clinicianNote"
                    rows={3}
                    placeholder="Provide specific instructions for patient (e.g. continue oral antibiotics, outline redness with pen, report to ER immediately)..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportPatientId(selectedCase.patientId?._id)}
                    className="gap-1.5 text-xs text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 w-full sm:w-auto"
                  >
                    <Printer className="h-3.5 w-3.5" /> Export Clinical Summary PDF
                  </Button>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCase(null)}
                    disabled={isSubmittingReview}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="gap-2 font-semibold"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Review...
                      </>
                    ) : (
                      'Save & Confirm Triage'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clinical PDF Report Modal */}
        <ClinicalReportModal
          patientId={reportPatientId}
          isOpen={!!reportPatientId}
          onClose={() => setReportPatientId(null)}
        />
      </div>
    </DashboardLayout>
  )
}
