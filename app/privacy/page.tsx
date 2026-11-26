import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-gold)] mb-8">
          <ArrowLeft size={16} className="mr-2" /> Back to Parley
        </Link>
        
        <h1 className="text-4xl font-serif font-bold text-[var(--color-gold)]">Privacy Policy</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4 text-[var(--color-text-muted)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">1. Information We Collect</h2>
          <p>When you use Parley, we collect information you provide directly to us, including your email address, username, profile picture, and the content of the debates you participate in.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">2. How We Use Your Information</h2>
          <p>We use your information to operate the platform, match you with opponents, display your profile on the leaderboard, and process your debates through third-party AI providers to generate verdicts.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">3. Third-Party Services</h2>
          <p>We use Supabase for authentication and data storage. We may also use third-party AI providers (such as OpenAI or Groq) to judge your debates. These providers only receive the text of your arguments, not your personal account information.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">4. Data Deletion</h2>
          <p>You have the right to request the deletion of your account and all associated data at any time. Please contact us to initiate this process.</p>

          <h2 className="text-xl font-bold text-[var(--color-text)]">5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@parleyapp.com.</p>
        </div>
      </div>
    </div>
  )
}