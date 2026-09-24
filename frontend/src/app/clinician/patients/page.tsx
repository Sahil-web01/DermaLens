'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Calendar,
  ArrowRight,
  Printer,
  Trash2,
  UserPlus,
  UserCheck,
  Lock,
  Stethoscope,
  HeartHandshake,
  Check,
  X,
  Clock,
  Undo2,
} from 'lucide-react'
import { ClinicalReportModal } from '@/components/clinical/clinical-report-modal'
import { getBackendAuthHeaders } from '@/lib/backendSession'
import { getApiBase } from '@/lib/apiConfig'


interface Patient {
  _id: string
  name: string
  email?: string
  mrn: string
  surgeryType: string
  surgeryDate: string
  assignedClinicianId?: any
  pendingClinicianId?: any
  assignmentStatus?: 'unassigned' | 'pending_patient_consent' | 'pending_doctor_consent' | 'assigned'
  consentNotes?: string
  createdAt: string
}

type TabType = 'my_cohort' | 'incoming_requests' | 'unassigned'

export default function PatientsListPage() {
  const { data: session } = useSession()
  const [patients, setPatients] = useState<Patient[]>([])
  const [tab, setTab] = useState<TabType>('my_cohort')
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [reportPatientId, setReportPatientId] = useState<string | null>(null)

  const [assignedCount, setAssignedCount] = useState(0)
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0)
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [pendingOffersCount, setPendingOffersCount] = useState(0)

  const loadPatients = useCallback(
    async (currentTab = tab) => {
      setLoading(true)
      try {
        const scope =
          currentTab === 'incoming_requests'
            ? 'incoming_requests'
            : currentTab === 'unassigned'
            ? 'unassigned'
            : 'assigned'

        const res = await fetch(`${getApiBase()}/patients?scope=${scope}`, {
          headers: getBackendAuthHeaders(session),
        })
        if (res.ok) {
          const data = await res.json()
          setPatients(data.data || [])
          if (typeof data.assignedCount === 'number') setAssignedCount(data.assignedCount)
          if (typeof data.incomingRequestsCount === 'number') setIncomingRequestsCount(data.incomingRequestsCount)
          if (typeof data.unassignedCount === 'number') setUnassignedCount(data.unassignedCount)
          if (typeof data.pendingOffersCount === 'number') setPendingOffersCount(data.pendingOffersCount)
        }
      } catch (err) {
        console.error('Error fetching patients:', err)
      } finally {
        setLoading(false)
      }
    },
    [session, tab]
  )

  useEffect(() => {
    if (session?.user) {
      loadPatients(tab)
    }
  }, [session?.user?.email, tab, loadPatients])

  // Doctor grants or declines consent for a patient who requested them
  const handleDoctorConsent = async (id: string, action: 'accept' | 'decline', patientName: string) => {
    setActionLoadingId(id)
    try {
      const res = await fetch(`${getApiBase()}/patients/${id}/doctor-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getBackendAuthHeaders(session),
        },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) {
        if (action === 'accept') {
          alert(`Consent granted! Patient ${patientName} is now in your active care cohort.`)
          setTab('my_cohort')
          await loadPatients('my_cohort')
        } else {
          alert(`Care request from ${patientName} declined.`)
          await loadPatients(tab)
        }
      } else {
        alert(data.message || 'Failed to update consent status')
      }
    } catch (e: any) {
      alert(`Network error: ${e.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Doctor sends a care offer to an unassigned patient
  const handleOfferCare = async (id: string, name: string) => {
    setActionLoadingId(id)
    try {
      const res = await fetch(`${getApiBase()}/patients/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getBackendAuthHeaders(session),
        },
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Care offer sent to ${name}! Awaiting patient consent.`)
        await loadPatients(tab)
      } else {
        alert(data?.message || 'Failed to send care offer')
      }
    } catch (e: any) {
      alert(`Network error: ${e.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Doctor withdraws a pending care offer
  const handleCancelOffer = async (id: string, name: string) => {
    if (!window.confirm(`Withdraw care offer to ${name}?`)) return
    setActionLoadingId(id)
    try {
      const res = await fetch(`${getApiBase()}/patients/${id}/cancel-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getBackendAuthHeaders(session),
        },
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Care offer to ${name} withdrawn.`)
        await loadPatients(tab)
      } else {
        alert(data?.message || 'Failed to withdraw offer')
      }
    } catch (e: any) {
      alert(`Network error: ${e.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeletePatient = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove patient "${name}"?`)) return
    try {
      const res = await fetch(`${getApiBase()}/patients/${id}`, {

        method: 'DELETE',
        headers: getBackendAuthHeaders(session),
      })
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p._id !== id))
        await loadPatients(tab)
      } else {
        const data = await res.json()
        alert(data.message || 'Failed to remove patient')
      }
    } catch (err) {
      console.error('Error deleting patient:', err)
      alert('Network error while deleting patient')
    }
  }

  return (
    <DashboardLayout userRole="CLINICIAN" userName={session?.user?.name || 'Dr. Sarah Chen, MD'}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Surgical Patient Cohort</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Physician-patient segregation: Patients choose their surgeon with mutual clinical consent.
            </p>
          </div>

          {/* Three-Way Tab Selector */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setTab('my_cohort')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                tab === 'my_cohort'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              My Care Cohort ({assignedCount})
            </button>

            <button
              type="button"
              onClick={() => setTab('incoming_requests')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 relative ${
                tab === 'incoming_requests'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5 text-sky-600" />
              Patient Requests
              {incomingRequestsCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white animate-pulse">
                  {incomingRequestsCount}
                </span>
              ) : (
                <span className="text-muted-foreground text-[11px]">(0)</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('unassigned')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                tab === 'unassigned'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5 text-amber-500" />
              Unassigned Intake ({unassignedCount})
            </button>
          </div>
        </div>

        {/* Doctor Isolation Privacy Disclaimer */}
        <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-900 p-4 text-xs text-sky-950 dark:text-sky-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-sky-600 flex-shrink-0" />
            <span>
              <strong>HIPAA &amp; Physician Isolation Active:</strong> Logged in as{' '}
              <strong>{session?.user?.name || session?.user?.email}</strong>. Only patients with active mutual consent appear in your primary review queues.
            </span>
          </div>
          <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300 font-mono text-[10px]">
            Protected
          </Badge>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading patient cohort...</div>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-40" />
              <h3 className="text-lg font-semibold text-foreground">
                {tab === 'my_cohort'
                  ? 'No Patients in Your Care Cohort'
                  : tab === 'incoming_requests'
                  ? 'No Incoming Patient Choice Requests'
                  : 'No Unassigned Intake Patients'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {tab === 'my_cohort'
                  ? 'You currently have no surgical patients assigned. Switch to "Patient Requests" or "Unassigned Intake" to review incoming requests.'
                  : tab === 'incoming_requests'
                  ? 'No patients are currently awaiting your clinical consent. Patients can select you from their patient portal.'
                  : 'All registered patients are currently assigned to their respective attending physicians.'}
              </p>
              {tab === 'my_cohort' && incomingRequestsCount > 0 && (
                <Button onClick={() => setTab('incoming_requests')} className="mt-4 gap-2">
                  <HeartHandshake className="h-4 w-4" /> Review {incomingRequestsCount} Patient Requests
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((p) => {
              const surgeryDate = new Date(p.surgeryDate)
              const daysPostOp = Math.round((Date.now() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24))
              const isAssigned = tab === 'my_cohort'
              const isIncomingRequest = tab === 'incoming_requests'
              const isOfferPending = p.assignmentStatus === 'pending_patient_consent'

              return (
                <Card
                  key={p._id}
                  onClick={() => {
                    if (isAssigned) {
                      window.location.href = `/patient/timeline?patientId=${p._id}`
                    }
                  }}
                  className={`transition-all flex flex-col justify-between ${
                    isAssigned
                      ? 'hover:shadow-lg hover:border-primary/50 cursor-pointer group'
                      : isIncomingRequest
                      ? 'border-2 border-sky-400/80 bg-sky-50/20 dark:bg-sky-950/20 shadow-md'
                      : isOfferPending
                      ? 'border-dashed border-amber-400 bg-amber-50/20'
                      : 'border-dashed border-amber-300/80 bg-amber-50/20'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.mrn}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          isAssigned
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : isIncomingRequest
                            ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300'
                            : isOfferPending
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                        }
                      >
                        {isAssigned
                          ? 'Mutual Consent Active'
                          : isIncomingRequest
                          ? 'Consent Requested'
                          : isOfferPending
                          ? 'Offer Sent (Awaiting Patient)'
                          : 'Awaiting Clinician'}
                      </Badge>
                    </div>

                    <CardTitle className="text-xl font-bold mt-2 group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{p.name}</span>
                      {isAssigned && (
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                      )}
                    </CardTitle>
                    <CardDescription>{p.surgeryType}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Surgery Date: {surgeryDate.toLocaleDateString()} (Day {daysPostOp} Post-Op)
                    </div>

                    {isIncomingRequest && (
                      <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200">
                        <p className="font-semibold flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5 text-sky-600" /> Patient Choice Request:
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {p.consentNotes || 'This patient selected you as their preferred attending doctor.'}
                        </p>
                      </div>
                    )}

                    {isOfferPending && tab === 'unassigned' && (
                      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
                        <p className="font-semibold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-600" /> Care Offer Pending:
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Offer sent to patient. DermaLens requires the patient&apos;s confirmation before activation.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      {isAssigned ? (
                        <>
                          <Button
                            variant="secondary"
                            className="flex-1 justify-between text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/patient/timeline?patientId=${p._id}`
                            }}
                          >
                            Wound Scrubber <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setReportPatientId(p._id)
                            }}
                            className="gap-1 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                            title="Export Official Clinical PDF Report"
                          >
                            <Printer className="h-3.5 w-3.5" /> Report
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePatient(p._id, p.name)
                            }}
                            className="text-xs text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900/50 dark:hover:bg-rose-950/40 px-2.5"
                            title="Remove Patient"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : isIncomingRequest ? (
                        <div className="flex gap-2 w-full">
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                            disabled={actionLoadingId === p._id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDoctorConsent(p._id, 'accept', p.name)
                            }}
                          >
                            <Check className="h-4 w-4" /> Consent &amp; Accept
                          </Button>
                          <Button
                            variant="outline"
                            className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold gap-1"
                            disabled={actionLoadingId === p._id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDoctorConsent(p._id, 'decline', p.name)
                            }}
                          >
                            <X className="h-4 w-4" /> Decline
                          </Button>
                        </div>
                      ) : isOfferPending ? (
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                          disabled={actionLoadingId === p._id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelOffer(p._id, p.name)
                          }}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {actionLoadingId === p._id ? 'Processing...' : 'Withdraw Care Offer'}
                        </Button>
                      ) : (
                        <Button
                          className="w-full gap-2 text-xs font-semibold"
                          disabled={actionLoadingId === p._id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOfferCare(p._id, p.name)
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {actionLoadingId === p._id ? 'Sending...' : 'Offer Care (Request Patient Consent)'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
