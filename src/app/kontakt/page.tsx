import { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Contact - Bookcraft',
 description: 'Contact us with questions or suggestions about Bookcraft',
}

export default function KontaktPage() {
 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20">
 <div className="container mx-auto px-6 py-12">
 <div className="max-w-4xl mx-auto">
 <h1 className="text-4xl font-bold text-foreground mb-8 text-center">Contact</h1>
 <p className="text-xl text-muted-foreground mb-12 text-center">
 We look forward to hearing from you!
 </p>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
 {/* Contact Form */}
 <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
 <h2 className="text-2xl font-semibold text-foreground mb-6">Write to Us</h2>
 <form className="space-y-6">
 <div>
 <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
 Name *
 </label>
 <input
 type="text"
 id="name"
 name="name"
 required
 className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-bookcraft-blue focus:border-transparent bg-background text-foreground"
 placeholder="Your name"
 />
 </div>
 <div>
 <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
 Email *
 </label>
 <input
 type="email"
 id="email"
 name="email"
 required
 className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-bookcraft-blue focus:border-transparent bg-background text-foreground"
 placeholder="your.email@example.com"
 />
 </div>
 <div>
 <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
 Subject *
 </label>
 <input
 type="text"
 id="subject"
 name="subject"
 required
 className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-bookcraft-blue focus:border-transparent bg-background text-foreground"
 placeholder="What is this about?"
 />
 </div>
 <div>
 <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
 Message *
 </label>
 <textarea
 id="message"
 name="message"
 rows={6}
 required
 className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-bookcraft-blue focus:border-transparent bg-background text-foreground"
 placeholder="Your message..."
 />
 </div>
 <button
 type="submit"
 className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
 >
 Send Message
 </button>
 </form>
 </div>

 {/* Contact Information */}
 <div className="space-y-8">
 <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
 <h2 className="text-2xl font-semibold text-foreground mb-6">Contact Information</h2>
 <div className="space-y-4">
 <div className="flex items-center">
 <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
 </svg>
 </div>
 <div>
 <p className="font-medium text-foreground">Email</p>
 <p className="text-muted-foreground">contact@bookcraft.de</p>
 </div>
 </div>
 <div className="flex items-center">
 <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-4">
 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
 </svg>
 </div>
 <div>
 <p className="font-medium text-foreground">Phone</p>
 <p className="text-muted-foreground">+49 (0) 123 456 7890</p>
 </div>
 </div>
 <div className="flex items-center">
 <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 </div>
 <div>
 <p className="font-medium text-foreground">Address</p>
 <p className="text-muted-foreground">
 Sample Street 123<br />
 12345 Sample City<br />
 Germany
 </p>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
 <h3 className="text-xl font-semibold text-foreground mb-4">Support Hours</h3>
 <div className="space-y-2 text-muted-foreground">
 <p><span className="font-medium text-foreground">Monday - Friday:</span> 9:00 AM - 6:00 PM</p>
 <p><span className="font-medium text-foreground">Saturday:</span> 10:00 AM - 4:00 PM</p>
 <p><span className="font-medium text-foreground">Sunday:</span> Closed</p>
 </div>
 <p className="text-sm text-muted-foreground mt-4">
 We typically respond within 24 hours.
 </p>
 </div>

 <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
 <h3 className="text-lg font-semibold text-foreground mb-3">Frequently Asked Questions</h3>
 <p className="text-muted-foreground mb-4">
 Before contacting us, take a look at our FAQ section.
 You'll find answers to the most common questions there.
 </p>
 <a
 href="/faq"
 className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
 >
 Go to FAQ
 </a>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}