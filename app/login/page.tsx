'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
        setError('Account created! You can now log in.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase().auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      
      {/* LEFT SIDE - Branding & Art (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 relative bg-black overflow-hidden">
        {/* Background Image */}
        <img 
          src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop" 
          alt="Debate background" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent" />
        
        {/* Text Content */}
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