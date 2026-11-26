'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await supabase().auth.signUp({ email, password })
      if (error) setError(error.message)
      else {
        setError('Account created! Check your email (and spam folder) for the confirmation link, then log in.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase().auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  const handleResend = async () => {
    if (!email) { setError('Enter your email below first.'); return }
    const { error } = await supabase().auth.resend({ type: 'signup', email })
    setError(error ? error.message : 'Account created! A new confirmation email was sent. Check your inbox and spam folder.')
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      
      {/* LEFT SIDE - Branding & Art (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 relative bg-black overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop" 
          alt="Debate background" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-end p-16 w-full h-full pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 border-2 border-[var(--color-gold)] rounded-full flex items-center justify-center">
              <span className="text-[var(--color-gold)] font-serif font-bold text-xl">P</span>
            </div>
            <span className="text-[var(--color-text)] font-serif text-2xl font-bold tracking-wide">Parley</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-serif text-[var(--color-text)] leading-tight mb-4">
            Two sides.<br />
            <span className="text-[var(--color-gold)]">One table.</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-lg max-w-md">
            Debate. Discuss. Decide. Step up to the table and let your arguments speak.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Branding */}
          <div className="md:hidden flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 border-2 border-[var(--color-gold)] rounded-full flex items-center justify-center mb-4">
              <span className="text-[var(--color-gold)] font-serif font-bold text-2xl">P</span>
            </div>
            <h1 className="text-3xl font-serif text-[var(--color-text)]">
              Welcome to <span className="text-[var(--color-gold)]">Parley</span>
            </h1>
          </div>

          {/* Form Header */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-serif font-bold text-[var(--color-text)] mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-[var(--color-text-muted)]">
              {isSignUp ? 'Sign up to start debating.' : 'Sign in to continue your parley.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5 mt-8">
            
            {error && (
              <div className={`p-3 rounded-lg text-sm font-medium border ${error.includes('created') ? 'bg-[var(--color-pro)]/10 text-[var(--color-pro)] border-[var(--color-pro)]/20' : 'bg-[var(--color-con)]/10 text-[var(--color-con)] border-[var(--color-con)]/20'}`}>
                {error}
                {error.toLowerCase().includes('not confirmed') && (
                  <button type="button" onClick={handleResend} className="block mt-2 underline text-[var(--color-gold)]">
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-muted)] block mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-[var(--color-text-muted)]" size={20} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-muted)] block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-[var(--color-text-muted)]" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg py-2.5 pl-10 pr-10 focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 mt-6" 
              size="lg"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 text-[var(--color-text-muted)] text-sm my-6">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            or
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-gold)] transition-colors font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Toggle Sign Up / Log In */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}