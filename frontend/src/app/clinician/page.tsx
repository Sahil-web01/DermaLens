'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import { ClinicalReportModal } from '@/components/clinical/clinical-report-modal'

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

  const fetchQueueAndStats = async () => {
    try {
      // 1. Fetch queue prioritized by high risk
      const qRes = await fetch(`${API_BASE}/clinician/queue`)
      if (qRes.ok) {
        const qData = await qRes.json()
        setQueue(qData.data || [])
      }

      // 2. Fetch stats
      const sRes = await fetch(`${API_BASE}/clinician/stats`)
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
    fetchQueueAndStats()
  }, [])

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
        headers: { 'Content-Type': 'application/json' },
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
    <DashboardLayout userRole="CLINICIAN" userName="Dr. Sarah Chen, MD">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Clinician Surgical Triage Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prioritized by AI MobileNetV2 concern scores and positive severe symptom flags.
            </p>
          </div>
          <Button onClick={fetchQueueAndStats} variant="outline" size="sm" className="gap-2">
            <Clock className="h-4 w-4" /> Refresh Queue
          </Button>
        </div>

        {/* Safety Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
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
                  className={`transition-all hover:shadow-card ${
                    item.isHighRisk
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                      : 'border-border'
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
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0">
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground">{patient.name}</h3>
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
                          {new Date(item.capturedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        {/* Symptoms tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.symptoms.fever && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Fever Reported
                            </Badge>
                          )}
                          {item.symptoms.purulentDischarge && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Purulent Discharge
                            </Badge>
                          )}
                          {item.symptoms.spreadingRedness && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 py-0">
                              Spreading Redness
                            </Badge>
                          )}
                          {item.symptoms.increasingPain && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 py-0">
                              Increasing Pain
                            </Badge>
                          )}
                        </div>

                        {/* Risk reasons */}
                        {item.riskReasons && item.riskReasons.length > 0 && (
                          <div className="text-xs text-rose-600 font-medium mt-1.5">
                            Priority factors: {item.riskReasons.join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Score & Action Button */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">MobileNetV2 Concern</div>
                        <div className="text-xl font-bold flex items-center justify-end gap-1.5">
                          <span
                            className={
                              score !== null && score !== undefined && score >= 0.5
                                ? 'text-rose-600'
                                : 'text-emerald-600'
                            }
                          >
                            {score !== null && score !== undefined ? `${Math.round(score * 100)}%` : 'N/A'}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({item.mlOutput?.predictedClass || 'Analyzed'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReportPatientId(item.patientId?._id)}
                          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          title="Export Clinical Summary PDF"
                        >
                          <FileText className="h-3.5 w-3.5 text-sky-600" /> Export PDF
                        </Button>
                        <Button
                          onClick={() => handleOpenReview(item)}
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

        {/* Clinician Review Modal / Dialog */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-elevated space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Review Patient Case: {selectedCase.patientId?.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    MRN: {selectedCase.patientId?.mrn} &bull; Procedure:{' '}
                    {selectedCase.patientId?.surgeryType}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Case Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border">
                <div>
                  <div className="text-xs text-muted-foreground">AI Research Concern Score</div>
                  <div className="text-lg font-bold text-foreground">
                    {selectedCase.mlOutput?.concernScore !== null && selectedCase.mlOutput?.concernScore !== undefined
                      ? `${Math.round(selectedCase.mlOutput.concernScore * 100)}% (${selectedCase.mlOutput.predictedClass})`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Reported Symptoms</div>
                  <div className="text-sm font-semibold text-foreground">
                    {[
                      selectedCase.symptoms.fever && 'Fever',
                      selectedCase.symptoms.purulentDischarge && 'Cloudy Discharge',
                      selectedCase.symptoms.spreadingRedness && 'Spreading Redness',
                      selectedCase.symptoms.increasingPain && 'Increasing Pain',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No positive symptoms reported'}
                  </div>
                </div>
              </div>

              {/* Triage Decision */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Triage Decision / Status
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
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          newStatus === opt.key
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
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
                    Follow-Up Advice & Clinician Notes
                  </label>
                  <Textarea
                    id="clinicianNote"
                    rows={4}
                    placeholder="Provide specific instructions for patient (e.g. continue oral antibiotics, outline redness with pen, report to ER immediately)..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReportPatientId(selectedCase.patientId?._id)}
                  className="gap-1.5 text-xs text-sky-600 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                >
                  <Printer className="h-3.5 w-3.5" /> Clinical Report (PDF)
                </Button>
                <div className="flex items-center gap-3">
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
                      'Confirm Triage & Save'
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
