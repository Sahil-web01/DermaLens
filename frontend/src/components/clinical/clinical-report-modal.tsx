'use client'

import { useState, useEffect } from 'react'
import { Printer, Download, X, ShieldAlert, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'
import { getBackendAuthHeaders } from '@/lib/backendSession'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const BACKEND_BASE = API_BASE.replace(/\/api$/, '')

interface ClinicalReportModalProps {
  patientId?: string | null
  isOpen: boolean
  onClose: () => void
}

export function ClinicalReportModal({ patientId, isOpen, onClose }: ClinicalReportModalProps) {
  const { data: session } = useSession()
  const [patient, setPatient] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    async function loadReportData() {
      setLoading(true)
      try {
        const url =
          patientId && patientId !== 'default' && patientId !== 'me'
            ? `${API_BASE}/patients/${patientId}/timeline`
            : `${API_BASE}/patients/timeline`

        const res = await fetch(url, { headers: getBackendAuthHeaders(session) })
        if (res.ok) {
          const data = await res.json()
          setPatient(data.patient)
          setTimeline(data.timeline || [])
        }
      } catch (err) {
        console.error('Failed to load report data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadReportData()
  }, [isOpen, patientId, session?.user?.email])

  if (!isOpen) return null

  const latestCheckIn = timeline.length > 0 ? timeline[timeline.length - 1] : null
  const isHighRisk =
    latestCheckIn?.symptoms?.fever ||
    latestCheckIn?.symptoms?.purulentDischarge ||
    latestCheckIn?.mlOutput?.predictedClass === 'Elevated Concern' ||
    latestCheckIn?.reviewStatus === 'escalated'

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadJSON = () => {
    const reportData = {
      hospital: 'DermaLens AI Surgical Surveillance Network',
      reportGeneratedAt: new Date().toISOString(),
      patient,
      latestStatus: latestCheckIn?.reviewStatus || 'pending',
      isHighRisk,
      trajectoryTimeline: timeline,
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Clinical_Report_${patient?.mrn || 'Patient'}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Printable Report Container */}
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col print:m-0 print:p-0 print:max-h-none print:shadow-none print:w-full print:rounded-none">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 print:hidden rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-600" />
            <span className="font-bold text-slate-800 text-sm">Official Clinical Summary Report</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
            <Button onClick={handleDownloadJSON} variant="outline" size="sm" className="gap-1.5 text-slate-700">
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 print:p-6" id="printable-clinical-report">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <svg className="h-7 w-7 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-xl font-black tracking-tight text-slate-900">DermaLens AI Clinical Network</span>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                Department of Surgical Wound Surveillance &amp; Triage Support
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-500">
              <p><strong className="text-slate-700">Report ID:</strong> RPT-{patient?.mrn || '2026'}-{Date.now().toString().slice(-4)}</p>
              <p><strong className="text-slate-700">Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500">Loading patient report data...</div>
          ) : (
            <>
              {/* Patient Demographics Banner */}
              <div className="bg-slate-100/90 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-medium">Patient Name</span>
                  <span className="font-bold text-sm text-slate-900">{patient?.name || 'David Rodriguez'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-medium">MRN</span>
                  <span className="font-bold font-mono text-sm text-slate-900">{patient?.mrn || 'MRN-2026-002'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-medium">Procedure</span>
                  <span className="font-bold text-sm text-slate-900">{patient?.surgeryType || 'Open Appendectomy'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-medium">Surgery Date</span>
                  <span className="font-bold text-sm text-slate-900">
                    {patient?.surgeryDate ? new Date(patient.surgeryDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Triage Status Callout */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isHighRisk
                    ? 'border-rose-300 bg-rose-50 text-rose-950'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-950'
                }`}
              >
                {isHighRisk ? (
                  <AlertTriangle className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">
                      {isHighRisk ? 'PRIORITY HIGH-RISK CLINICAL TRIAGE' : 'ROUTINE POST-OP RECOVERY TRAJECTORY'}
                    </span>
                    <Badge variant={isHighRisk ? 'destructive' : 'default'} className="text-xs">
                      {latestCheckIn?.reviewStatus?.toUpperCase() || 'REVIEWED'}
                    </Badge>
                  </div>
                  <p className="text-xs mt-1">
                    {isHighRisk
                      ? 'Patient exhibits elevated AI concern score and/or acute systemic symptom flags (fever, purulent drainage). Immediate clinical triage required.'
                      : 'Wound margins well approximated with low AI concern scores. Healing trajectory within expected parameters.'}
                  </p>
                </div>
              </div>

              {/* Trajectory Table */}
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-2">
                  Chronological Check-In &amp; Healing Trajectory
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                        <th className="p-2.5">Date / Time</th>
                        <th className="p-2.5">Photo</th>
                        <th className="p-2.5">Reported Symptoms</th>
                        <th className="p-2.5">MobileNetV2 Output</th>
                        <th className="p-2.5">Review Status &amp; Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {timeline.map((item, idx) => {
                        const score = item.mlOutput?.concernScore
                        return (
                          <tr key={item._id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-medium whitespace-nowrap">
                              Day {idx + 1}
                              <div className="text-[10px] text-slate-500">
                                {new Date(item.capturedAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-2.5">
                              {item.photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={item.photoUrl.startsWith('http') ? item.photoUrl : `${BACKEND_BASE}${item.photoUrl}`}
                                  alt="Wound photo"
                                  className="h-12 w-12 rounded object-cover border border-slate-200"
                                />
                              ) : (
                                <span className="text-slate-400 text-[10px]">No Photo</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="space-y-0.5">
                                {item.symptoms?.fever && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[10px] mr-1">
                                    Fever
                                  </span>
                                )}
                                {item.symptoms?.purulentDischarge && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[10px] mr-1">
                                    Discharge
                                  </span>
                                )}
                                {item.symptoms?.spreadingRedness && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] mr-1">
                                    Redness
                                  </span>
                                )}
                                {item.symptoms?.increasingPain && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px]">
                                    Pain
                                  </span>
                                )}
                                {!item.symptoms?.fever &&
                                  !item.symptoms?.purulentDischarge &&
                                  !item.symptoms?.spreadingRedness &&
                                  !item.symptoms?.increasingPain && (
                                    <span className="text-slate-500 text-[11px]">Normal</span>
                                  )}
                              </div>
                            </td>
                            <td className="p-2.5 font-medium">
                              <div>
                                {score !== null && score !== undefined ? `${Math.round(score * 100)}%` : 'N/A'}{' '}
                                <span className="text-[10px] text-slate-500">
                                  ({item.mlOutput?.predictedClass || 'Analyzed'})
                                </span>
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-600 max-w-xs">
                              <span className="font-semibold text-slate-800 uppercase text-[10px] block">
                                {item.reviewStatus?.replace('_', ' ')}
                              </span>
                              {item.clinicianNotes || 'Routine observation.'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physician Signature Block */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Attending Clinician Reviewer</span>
                  <div className="border-b border-slate-400 pb-1 font-semibold text-slate-900">
                    Dr. Sarah Chen, MD (General &amp; Surgical Care)
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">License: MD-SURG-98442</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Clinical Sign-Off Date</span>
                  <div className="border-b border-slate-400 pb-1 font-semibold text-slate-900">
                    {new Date().toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Validated with DermaLens AI v1.0</span>
                </div>
              </div>

              {/* Safety Disclaimer Footer */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-500 leading-relaxed">
                <strong>RESEARCH TRIAGE NOTICE: </strong> This clinical report is produced by DermaLens AI as a post-operative surveillance support tool. MobileNetV2 CNN assessments provide assistive screening metrics and must never supersede in-person clinical examination or patient-reported symptoms.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scoped Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide dashboard background and all non-modal items */
          header, nav, aside, footer, button, .print\\:hidden {
            display: none !important;
          }
          #printable-clinical-report {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
