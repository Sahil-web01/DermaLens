'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, ArrowRight, ShieldAlert, FileText, Printer } from 'lucide-react'
import { ClinicalReportModal } from '@/components/clinical/clinical-report-modal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Patient {
  _id: string
  name: string
  mrn: string
  surgeryType: string
  surgeryDate: string
  createdAt: string
}

export default function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [reportPatientId, setReportPatientId] = useState<string | null>(null)

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch(`${API_BASE}/patients`)
        if (res.ok) {
          const data = await res.json()
          setPatients(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching patients:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPatients()
  }, [])

  return (
    <DashboardLayout userRole="CLINICIAN" userName="Dr. Sarah Chen, MD">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Surgical Patient Cohort</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registered patients enrolled in remote post-operative wound surveillance.
          </p>
        </div>

        {/* Safety Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            DermaLens AI cohort registry. Patient-reported symptoms and high-resolution photo check-ins are synced with MongoDB and MobileNetV2 CNN inference engine.
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading patient records...</div>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-40" />
              <h3 className="text-lg font-semibold text-foreground">No Patients Found</h3>
              <p className="text-sm text-muted-foreground mt-1">Run the database seeder to create demo patients.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((p) => {
              const surgeryDate = new Date(p.surgeryDate)
              const daysPostOp = Math.round((Date.now() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <Card key={p._id} className="hover:shadow-card transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.mrn}
                      </Badge>
                      <span className="text-xs font-semibold text-primary">Day {daysPostOp} Post-Op</span>
                    </div>
                    <CardTitle className="text-xl font-bold mt-2">{p.name}</CardTitle>
                    <CardDescription>{p.surgeryType}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Surgery Date: {surgeryDate.toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/patient/timeline?patientId=${p._id}`} className="flex-1">
                        <Button variant="secondary" className="w-full justify-between text-xs font-semibold">
                          Wound Scrubber <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportPatientId(p._id)}
                        className="gap-1 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        title="Export Official Clinical PDF Report"
                      >
                        <Printer className="h-3.5 w-3.5" /> Report
                      </Button>
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
