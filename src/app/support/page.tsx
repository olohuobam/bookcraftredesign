import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Support – Bookcraft',
  description: 'Get help with Bookcraft – contact us for questions, feedback, or issues.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-bookcraft-blue hover:underline text-sm mb-8 inline-block">
          ← Back to Bookcraft
        </Link>

        <h1 className="text-3xl font-bold mb-2">Support</h1>
        <p className="text-muted-foreground mb-10">
          We&apos;re here to help. If you have questions, feedback, or run into any issues, don&apos;t hesitate to reach out.
        </p>

        <div className="space-y-8">
          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">📬 Contact Us</h2>
            <p className="text-muted-foreground mb-2">
              The fastest way to get help is via email:
            </p>
            <a
              href="mailto:support@bookcraft.dev"
              className="inline-flex items-center gap-2 px-5 py-3 bg-bookcraft-blue text-white rounded-xl font-medium hover:brightness-110 transition-colors"
            >
              support@bookcraft.dev
            </a>
            <p className="text-sm text-muted-foreground mt-2">
              We typically respond within 24 hours.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold mb-3">❓ Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">How do I create a book?</h3>
                <p className="text-sm text-muted-foreground">
                  After signing in, tap &quot;Create Book&quot; and choose your book type (text book, picture book, or photobook). Describe your idea and our AI will generate your book.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Is Bookcraft free?</h3>
                <p className="text-sm text-muted-foreground">
                  You can start for free! Basic book creation is included. For unlimited books and premium features, check out Bookcraft Pro.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Can I print my book?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes! You can export your book as PDF or order a professionally printed copy directly from the app.
                </p>
              </div>
              <div>
                <h3 className="font-medium">What languages are supported?</h3>
                <p className="text-sm text-muted-foreground">
                  Bookcraft supports book creation in 25+ languages including English, German, Spanish, French, and many more.
                </p>
              </div>
              <div>
                <h3 className="font-medium">How do I delete my account?</h3>
                <p className="text-sm text-muted-foreground">
                  Go to Settings → scroll to the bottom → &quot;Delete Account&quot;. This will permanently remove your account and all associated data.
                </p>
              </div>
            </div>
          </section>

          {/* Legal */}
          <section>
            <h2 className="text-xl font-semibold mb-3">📄 Legal</h2>
            <div className="flex gap-4">
              <Link href="/privacy" className="text-bookcraft-blue hover:underline text-sm">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-bookcraft-blue hover:underline text-sm">
                Terms of Service
              </Link>
            </div>
          </section>

          {/* Company */}
          <section className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Bookcraft is a product by Beyer Digital Management<br />
              Julien Beyer · Germany
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
