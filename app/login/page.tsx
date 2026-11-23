"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Redirect to dashboard on success
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: any) {
      setMessage(error.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-surface border border-border rounded-xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {isSignUp ? "Create an Account" : "Login to Debate-App"}
          </h1>
          <p className="text-sm text-text-muted mt-2">
            {isSignUp
              ? "Join the debate and make your voice heard."
              : "Welcome back. Enter your details to continue."}
          </p>
        </div>

        {/* Error / Success Message */}
        {message && (
          <div
            className={`p-3 rounded text-sm text-center border ${
              message.includes("Check your email")
                ? "bg-green-900/30 border-green-700 text-green-200"
                : "bg-red-900/30 border-red-700 text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="text-center pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage("");
            }}
            className="text-sm text-gold hover:underline"
          >
            {isSignUp
              ? "Already have an account? Log in"
              : "Need an account? Sign up"}
          </button>
        </div>

      </div>
    </div>
  );
}