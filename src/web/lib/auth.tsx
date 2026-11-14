/**
 * Frontend AuthProvider abstraction. The app depends on useAppAuth(), not on Clerk directly,
 * so the identity vendor can be swapped (e.g. Better Auth) without touching business UI.
 * Policy: Google OAuth is the ONLY sign-in method.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/react'

export interface AppAuth {
  isLoaded: boolean
  isSignedIn: boolean
  user: { id: string; name: string | null; email: string | null; imageUrl: string | null } | null
  getToken: () => Promise<string | null>
  signInWithGoogle: (returnTo?: string) => Promise<void>
  signOut: () => Promise<void>
  openAccount: () => void
}

const Ctx = createContext<AppAuth | null>(null)

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user } = useUser()
  const clerk = useClerk()
  const value = useMemo<AppAuth>(() => ({
    isLoaded: !!isLoaded,
    isSignedIn: !!isSignedIn,
    user: user ? { id: user.id, name: user.fullName, email: user.primaryEmailAddress?.emailAddress ?? null, imageUrl: user.imageUrl } : null,
    getToken: async () => (await getToken()) ?? null,
    signInWithGoogle: async (returnTo = '/app') => {
      const signIn = clerk.client?.signIn
      if (!signIn) throw new Error('Auth client not ready')
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}${returnTo}`,
      })
    },
    signOut: async () => { await signOut({ redirectUrl: '/' }) },
    openAccount: () => clerk.openUserProfile(),
  }), [isLoaded, isSignedIn, user, getToken, signOut, clerk])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function AuthProvider({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      appearance={{ variables: { colorPrimary: '#7c5cff', colorBackground: '#11111d', colorForeground: '#e2e8f0', colorInput: '#161626', colorInputForeground: '#e2e8f0' } }}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  )
}

export function useAppAuth(): AppAuth {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppAuth outside AuthProvider')
  return v
}
