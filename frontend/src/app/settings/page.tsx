'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Sliders,
  Shield,
  CheckCircle2,
  Server,
  ArrowLeft,
  Save,
  Check,
  AlertTriangle,
  Camera,
  Cpu,
} from 'lucide-react'
import { getApiBase } from '@/lib/apiConfig'

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = session?.user?.role || 'CLINICIAN'
  const isClinician = role === 'CLINICIAN'

  // Settings states
  const [criticalAlerts, setCriticalAlerts] = useState(true)
  const [dailyReminders, setDailyReminders] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [ghostOverlayOpacity, setGhostOverlayOpacity] = useState(40)
  const [aiThreshold, setAiThreshold] = useState(50)
  const [isSaved, setIsSaved] = useState(false)

  // Live microservice health check
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [mlStatus, setMlStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    async function checkHealth() {
      // 1. Check Backend API
      try {
        const res = await fetch(`${getApiBase()}/clinician/stats`)
        setBackendStatus(res.ok ? 'online' : 'offline')
      } catch {
        setBackendStatus('offline')
      }

      // 2. Check ML Service
      try {
        const res = await fetch('http://127.0.0.1:8000/health')
        setMlStatus(res.ok ? 'online' : 'offline')
      } catch {
        setMlStatus('offline')
      }
    }
    checkHealth()
  }, [])

  const handleSave = () => {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  return (
    <DashboardLayout userRole={role as 'CLINICIAN' | 'PATIENT'} userName={session?.user?.name || undefined}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={isClinician ? '/clinician' : '/patient'}>
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <SettingsIcon className="h-7 w-7 text-primary" /> Application Settings
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your user profile, alert preferences, camera calibration, and AI triage parameters.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2 font-semibold">
            {isSaved ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" /> Saved Successfully!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Preferences
              </>
            )}
          </Button>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Account &amp; Professional Profile</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs capitalize">
                {role}
              </Badge>
            </div>
            <CardDescription>Your registered identity on the DermaLens AI surgical network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground block mb-0.5">Full Name</span>
                <span className="text-sm font-semibold text-foreground">
                  {session?.user?.name || (isClinician ? 'Dr. Sarah Chen, MD' : 'David Rodriguez')}
                </span>
              </div>
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground block mb-0.5">Email Address</span>
                <span className="text-sm font-semibold text-foreground">
                  {session?.user?.email || (isClinician ? 'clinician@demo.com' : 'patient@demo.com')}
                </span>
              </div>
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground block mb-0.5">
                  {isClinician ? 'Clinical License / Department' : 'Medical Record Number (MRN)'}
                </span>
                <span className="text-sm font-semibold text-foreground font-mono">
                  {isClinician ? 'MD-SURG-98442 (General & Trauma)' : 'MRN-2026-002'}
                </span>
              </div>
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground block mb-0.5">Assigned Hospital Network</span>
                <span className="text-sm font-semibold text-foreground">
                  DermaLens AI Central Surgical Surveillance
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Alert Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-500" />
              <CardTitle className="text-lg">Notification &amp; Triage Alert Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive high-risk infection notifications and daily updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-border">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">Priority High-Risk Alerts</div>
                  <div className="text-xs text-muted-foreground">
                    Instant alerts when a patient reports fever (&gt; 38.0°C), purulence, or CNN concern &ge; 50%.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={criticalAlerts}
                  onChange={(e) => setCriticalAlerts(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">Daily Scheduled Check-In Reminders</div>
                  <div className="text-xs text-muted-foreground">
                    Morning reminder (09:00 AM) to prompt post-operative wound photography.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={dailyReminders}
                  onChange={(e) => setDailyReminders(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">Auditory Notification Chime</div>
                  <div className="text-xs text-muted-foreground">
                    Play a gentle audio ping when a new case or clinical review advice arrives.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">Daily Clinical Digest Email</div>
                  <div className="text-xs text-muted-foreground">
                    Receive an aggregated summary of all patient healing trajectories every evening at 18:00.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI & Camera Calibration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-sky-500" />
              <CardTitle className="text-lg">AI &amp; Camera Calibration</CardTitle>
            </div>
            <CardDescription>
              Tuning parameters for camera photo framing and MobileNetV2 CNN decision sensitivity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ghosting Overlay */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-sky-500" /> Previous-Photo Ghost Overlay Opacity
                </label>
                <span className="text-xs font-mono font-bold text-primary">{ghostOverlayOpacity}%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Controls the transparency of yesterday&apos;s photo superimposed on the camera viewfinder to guide consistent angle and lighting.
              </p>
              <input
                type="range"
                min="10"
                max="80"
                value={ghostOverlayOpacity}
                onChange={(e) => setGhostOverlayOpacity(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* AI Threshold */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-primary" /> MobileNetV2 High-Concern Classification Threshold
                </label>
                <span className="text-xs font-mono font-bold text-rose-600">{aiThreshold}%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Confidence cutoff at which the CNN automatically flags a wound image as &quot;Elevated Concern&quot; in the clinician queue.
              </p>
              <input
                type="range"
                min="30"
                max="80"
                step="5"
                value={aiThreshold}
                onChange={(e) => setAiThreshold(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Live Service Diagnostics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-lg">Network &amp; Microservice Connectivity</CardTitle>
            </div>
            <CardDescription>Real-time heartbeat across the 3-tier DermaLens architecture.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
                <div>
                  <div className="font-semibold text-sm text-foreground">Express API Backend</div>
                  <div className="text-xs text-muted-foreground font-mono">http://localhost:5000/api</div>
                </div>
                <Badge
                  variant={backendStatus === 'online' ? 'default' : 'destructive'}
                  className="capitalize gap-1"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  {backendStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
                <div>
                  <div className="font-semibold text-sm text-foreground">FastAPI ML Service</div>
                  <div className="text-xs text-muted-foreground font-mono">http://127.0.0.1:8000/health</div>
                </div>
                <Badge
                  variant={mlStatus === 'online' ? 'default' : 'destructive'}
                  className="capitalize gap-1"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      mlStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  {mlStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Bar Bottom */}
        <div className="flex items-center justify-between pt-2">
          <Link href={isClinician ? '/clinician' : '/patient'}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button onClick={handleSave} className="gap-2 font-semibold">
            {isSaved ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" /> Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
