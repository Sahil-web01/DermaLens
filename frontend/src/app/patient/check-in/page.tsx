'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { getApiBase } from '@/lib/apiConfig'
import { getBackendAuthHeaders } from '@/lib/backendSession'

async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1600
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export default function CheckInPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Symptoms
  const [fever, setFever] = useState(false)
  const [increasingPain, setIncreasingPain] = useState(false)
  const [purulentDischarge, setPurulentDischarge] = useState(false)
  const [spreadingRedness, setSpreadingRedness] = useState(false)
  const [notes, setNotes] = useState('')

  // State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
      setErrorMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setErrorMessage('Please capture or upload a surgical wound photo.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSubmitResult(null)

    try {
      // 1. Optimize image (compress if larger than 1.5MB to avoid payload limits / timeouts)
      const uploadFile = await compressImageIfNeeded(file)

      const formData = new FormData()
      formData.append('photo', uploadFile)

      const userEmail =
        (session?.user?.email ||
        (typeof window !== 'undefined' ? localStorage.getItem('dermalens_user_email') : '') ||
        'patient@demo.com').trim().toLowerCase()

      const patientName = (session?.user?.name || 'Patient').trim()

      formData.append('email', userEmail)
      formData.append('patientName', patientName)
      formData.append('fever', String(fever))
      formData.append('increasingPain', String(increasingPain))
      formData.append('purulentDischarge', String(purulentDischarge))
      formData.append('spreadingRedness', String(spreadingRedness))
      if (notes.trim()) {
        formData.append('clinicianNotes', notes.trim())
      }

      const authHeaders = getBackendAuthHeaders(session)

      // First attempt: Primary API endpoint
      let res: Response | null = null
      let data: any = null
      const primaryUrl = `${getApiBase()}/patients/checkins`

      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        })
        if (res.ok) {
          data = await res.json()
        } else {
          data = await res.json().catch(() => null)
        }
      } catch (primaryErr) {
        console.warn('Primary checkin submission network error, trying fallback:', primaryErr)
      }

      // Second attempt: If primary failed or returned an error, fallback to same-origin /api/patients/checkins
      if (!data || !data.success) {
        if (primaryUrl !== '/api/patients/checkins') {
          try {
            const fallbackRes = await fetch('/api/patients/checkins', {
              method: 'POST',
              headers: authHeaders,
              body: formData,
            })
            if (fallbackRes.ok) {
              data = await fallbackRes.json()
            } else {
              const fallbackErrJson = await fallbackRes.json().catch(() => null)
              if (fallbackErrJson) data = fallbackErrJson
            }
          } catch (fallbackErr) {
            console.warn('Fallback checkin submission error:', fallbackErr)
          }
        }
      }

      if (!data || (!data.success && !data.checkIn)) {
        const errorMsg =
          data?.message ||
          data?.error ||
          (data?.errors && data.errors[0]?.msg) ||
          (res && !res.ok ? `Server returned status ${res.status}: Failed to submit check-in.` : 'Failed to submit check-in.')
        throw new Error(errorMsg)
      }

      setSubmitResult(data.data || data.checkIn || data)
    } catch (err: any) {
      console.error('Submission error:', err)
      setErrorMessage(err.message || 'Network error submitting check-in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout userRole="PATIENT" userName={session?.user?.name || 'Patient'}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/patient">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Post-Op Wound Check-In</h1>
            <p className="text-sm text-muted-foreground">Standardized photo capture & structured symptom questionnaire</p>
          </div>
        </div>

        {/* Clinical Safety Banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="font-semibold">Safety Notice: </strong>
            Experimental triage tool. MobileNetV2 assessment never overrides patient symptoms. If you experience high fever, severe spreading erythema, or uncontrollable pain, contact your doctor or hospital immediately.
          </div>
        </div>

        {submitResult ? (
          /* Result Card after successful submission */
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-elevated">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-950">
                Check-In Submitted Successfully!
              </CardTitle>
              <CardDescription className="text-emerald-800">
                Your surgical wound photo and symptoms have been recorded in MongoDB and analyzed via MobileNetV2 CNN.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ML Result Box */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    AI CNN Triage Output (Research Support)
                  </span>
                  <Badge
                    variant={
                      submitResult.mlOutput?.predictedClass === 'Elevated Concern'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs px-2.5 py-1"
                  >
                    {submitResult.mlOutput?.predictedClass || 'Analyzed'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <div className="text-xs text-muted-foreground">CNN Concern Score</div>
                    <div className="text-xl font-bold text-foreground">
                      {submitResult.mlOutput?.concernScore !== null && submitResult.mlOutput?.concernScore !== undefined
                        ? `${Math.round(submitResult.mlOutput.concernScore * 100)}%`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Triage Status</div>
                    <div className="text-xl font-bold capitalize text-foreground">
                      {submitResult.reviewStatus?.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Model Version</div>
                    <div className="text-xl font-bold text-foreground">
                      {submitResult.mlOutput?.modelVersion || 'v1.0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/patient/timeline">
                  <Button size="lg" className="w-full sm:w-auto font-semibold">
                    View in Timeline Scrubber
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setSubmitResult(null)
                    setFile(null)
                    setPreviewUrl(null)
                    setFever(false)
                    setIncreasingPain(false)
                    setPurulentDischarge(false)
                    setSpreadingRedness(false)
                    setNotes('')
                  }}
                >
                  Submit Another Check-In
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Check-In Submission Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Wound Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" /> Step 1: Capture or Upload Surgical Wound Photo
                </CardTitle>
                <CardDescription>
                  Ensure direct daylight or well-lit room, avoid flash reflection, and center the incision in focus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewUrl ? (
                  <div className="relative rounded-xl border border-border overflow-hidden bg-muted flex flex-col items-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-72 w-auto object-contain rounded-lg shadow-sm"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFile(null)
                          setPreviewUrl(null)
                        }}
                      >
                        Change Photo
                      </Button>
                      <span className="text-xs text-muted-foreground">{file?.name}</span>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-8 cursor-pointer transition-colors">
                    <UploadCloud className="h-12 w-12 text-primary/70 mb-3" />
                    <span className="font-semibold text-foreground">Click to select photo or drag & drop</span>
                    <span className="text-xs text-muted-foreground mt-1">JPEG, PNG or WebP up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Symptom Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" /> Step 2: Symptom Checklist
                </CardTitle>
                <CardDescription>
                  Please answer honestly. Positive severe symptoms will immediately flag your check-in for clinician priority.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fever */}
                  <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={fever}
                      onChange={(e) => setFever(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-sm text-foreground">Fever or Chills</div>
                      <div className="text-xs text-muted-foreground">Body temperature &gt; 38°C (100.4°F)</div>
                    </div>
                  </label>

                  {/* Increasing Pain */}
                  <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={increasingPain}
                      onChange={(e) => setIncreasingPain(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-sm text-foreground">Increasing Wound Pain</div>
                      <div className="text-xs text-muted-foreground">Pain intensifying despite prescribed medication</div>
                    </div>
                  </label>

                  {/* Purulent Discharge */}
                  <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={purulentDischarge}
                      onChange={(e) => setPurulentDischarge(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-sm text-foreground">Cloudy / Pus-like Drainage</div>
                      <div className="text-xs text-muted-foreground">Yellow, white, or foul-smelling wound fluid</div>
                    </div>
                  </label>

                  {/* Spreading Redness */}
                  <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={spreadingRedness}
                      onChange={(e) => setSpreadingRedness(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-sm text-foreground">Spreading Redness / Warmth</div>
                      <div className="text-xs text-muted-foreground">Erythema expanding beyond incision border</div>
                    </div>
                  </label>
                </div>

                <div className="pt-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Additional Patient Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Describe any dressing changes, sensations, or questions for your clinician..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1.5 resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Link href="/patient">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="gap-2 px-8 font-semibold shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing Photo & Submitting...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-5 w-5" /> Submit Check-In
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
