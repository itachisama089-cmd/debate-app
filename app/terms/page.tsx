import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-gold)] mb-8">
          <ArrowLeft size={16} className="mr-2" /> Back to Parley
        </Link>
        
        <h1 className="text-4xl font-serif font-bold text-[var(--color-gold)]">Terms of Service</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4 text-[var(--color-text-muted)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">1. Acceptance of Terms</h2>
          <p>By accessing and using Parley, you agree to be bound by these Terms. If you do not agree, please do not use the platform.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">2. User Conduct</h2>
          <p>Parley is a platform for civil debate. You agree not to use hate speech, harassment, or explicit content. We reserve the right to ban accounts that violate these rules.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">3. AI Judging</h2>
          <p>Debates are evaluated by a third-party AI model. You acknowledge that AI judgments are final and may occasionally be inaccurate. No monetary gambling or wagering is permitted on this platform.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">4. Account Responsibility</h2>
          <p>You are responsible for maintaining the security of your account and password.</p>
        </div>
      </div>
    </div>
  )
}