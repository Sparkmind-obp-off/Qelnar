import { StrictMode, useEffect, useState, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
import './styles.css'
import { AuthProvider, useAppAuth } from './lib/auth'
import { WorkspaceProvider } from './lib/workspace'
import { Spinner, Toaster } from './components/ui'
import { Landing, PricingPage, ServicesPage, SignInPage, LegalPage, NotFound } from './pages/public'

const AppShell = lazy(() => import('./pages/app/Shell'))

function FullLoader({ label = 'Memuat…' }: { label?: string }) {
  return <div className="flex min-h-screen items-center justify-center gap-3 text-slate-400"><Spinner /> {label}</div>
}

/** Protected route gate: unauthenticated users are redirected to sign-in. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAppAuth()
  const loc = useLocation()
  if (!isLoaded) return <FullLoader label="Memeriksa sesi…" />
  if (!isSignedIn) return <Navigate to={`/sign-in?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children}</>
}

function Root({ pk }: { pk: string }) {
  return (
    <AuthProvider publishableKey={pk}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<Navigate to="/sign-in" replace />} />
          <Route path="/sso-callback" element={<><AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app" /><FullLoader label="Menyelesaikan masuk dengan Google…" /></>} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/app/*" element={<RequireAuth><WorkspaceProvider><Suspense fallback={<FullLoader />}><AppShell /></Suspense></WorkspaceProvider></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

function Boot() {
  const [pk, setPk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((c: any) => (c.clerkPublishableKey ? setPk(c.clerkPublishableKey) : setErr('Authentication is not configured.'))).catch(() => setErr('Cannot reach QELNAR API.'))
  }, [])
  if (err) return <div className="flex min-h-screen items-center justify-center p-6 text-center text-rose-300">{err}</div>
  if (!pk) return <FullLoader />
  return <Root pk={pk} />
}

createRoot(document.getElementById('root')!).render(<StrictMode><Boot /></StrictMode>)
