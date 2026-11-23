'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase().auth.signUp({ email, password })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Account created! You can now log in.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase().auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-black">
      <h1 className="text-2xl font-bold mb-4">
        {isSignUp ? 'Create an Account' : 'Login to Debate App'}
      </h1>
      
      <form onSubmit={handleAuth} className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded text-black w-full"
          required
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded text-black w-full"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded disabled:opacity-50 w-full mt-2"
        >
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      {message && <p className="mt-4 text-red-600 font-bold">{message}</p>}

      <button
        type="button"
        onClick={() => {
          console.log("Toggling sign up mode!");
          setIsSignUp(!isSignUp);
        }}
        className="mt-6 text-blue-600 underline"
      >
        {isSignUp ? 'Already have an account? Log in' : 'Need an account? Sign up'}
      </button>
    </div>
  )
}