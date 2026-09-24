'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Stethoscope, CheckCircle2, UserPlus, X, AlertCircle, ShieldCheck } from 'lucide-react'
import { getApiBase } from '@/lib/apiConfig'


interface ClinicianInfo {
  id: string
  _id: string
  name: string
  email: string
  specialty: string
  activeCount: number
  pendingCount: number
}

interface ChoosePhysicianModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDoctor: (clinicianId: string, doctorName: string) => Promise<void>
  currentDoctorId?: string | null
  pendingDoctorId?: string | null
}

const FALLBACK_CLINICIANS: ClinicianInfo[] = [
  {
    id: 'cmufb5i2u00034j6hemjj785r',
    _id: 'cmufb5i2u00034j6hemjj785r',
    name: 'Dr. Sarah Chen, MD',
    email: 'clinician@demo.com',
    specialty: 'Colorectal & Trauma Surgery Specialist',
    activeCount: 4,
    pendingCount: 0,
  },
  {
    id: 'cmufk6gcv0002jq2kwypgv3rl',
    _id: 'cmufk6gcv0002jq2kwypgv3rl',
    name: 'Dr. James Wong, MD',
    email: 'clinician2@demo.com',
    specialty: 'General Surgery Specialist',
    activeCount: 1,
    pendingCount: 0,
  },
]

export function ChoosePhysicianModal({
  isOpen,
  onClose,
  onSelectDoctor,
  currentDoctorId,
  pendingDoctorId,
}: ChoosePhysicianModalProps) {
  const [clinicians, setClinicians] = useState<ClinicianInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function loadDirectory() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${getApiBase()}/patients/clinicians`)

        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) {
            setClinicians(json.data)
          } else {
            setClinicians(FALLBACK_CLINICIANS)
          }
        } else {
          setClinicians(FALLBACK_CLINICIANS)
        }
      } catch (err: any) {
        console.warn('Could not reach remote clinician directory, displaying available cohort:', err)
        setClinicians(FALLBACK_CLINICIANS)
      } finally {
        setLoading(false)
      }
    }

    loadDirectory()
  }, [isOpen])

  if (!isOpen) return null

  const handleSelect = async (clinician: ClinicianInfo) => {
    setSubmittingId(clinician.id || clinician._id)
    try {
      await onSelectDoctor(clinician.id || clinician._id, clinician.name)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-sky-600/10 via-teal-600/10 to-transparent flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
                <Stethoscope className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-foreground">Choose Your Attending Physician</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Patient Autonomy &amp; Mutual Consent: Select your preferred surgeon. Your chosen doctor will review and consent to your care request.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-900 p-3.5 text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-sky-600 flex-shrink-0" />
            <span>
              Both the patient and the physician must mutually agree. Once you send a request, the doctor will review your case and confirm clinical consent.
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Loading available physicians...</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-60" />
              {error}
            </div>
          ) : clinicians.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No clinicians currently registered in the directory.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clinicians.map((c) => {
                const docId = c.id || c._id
                const isCurrent = currentDoctorId && String(currentDoctorId) === String(docId)
                const isPending = pendingDoctorId && String(pendingDoctorId) === String(docId)

                return (
                  <Card
                    key={docId}
                    className={`transition-all border ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                        : isPending
                        ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20'
                        : 'hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground text-base">{c.name}</h3>
                          {isCurrent && (
                            <Badge variant="default" className="bg-emerald-600 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Current
                            </Badge>
                          )}
                          {isPending && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                              Consent Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-primary font-medium mt-1">{c.specialty}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {c.activeCount} active {c.activeCount === 1 ? 'patient' : 'patients'}
                        </span>
                        <Button
                          size="sm"
                          disabled={isCurrent || isPending || submittingId === docId}
                          onClick={() => handleSelect(c)}
                          className="text-xs font-semibold gap-1.5"
                          variant={isCurrent ? 'outline' : 'default'}
                        >
                          {submittingId === docId ? (
                            'Sending Request...'
                          ) : isCurrent ? (
                            'Assigned'
                          ) : isPending ? (
                            'Awaiting Consent'
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" /> Request Care
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
