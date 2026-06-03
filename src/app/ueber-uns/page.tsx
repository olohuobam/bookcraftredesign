import { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'About Us - Bookcraft',
 description: 'Learn more about Bookcraft and our team',
}

export default function UeberUnsPage() {
 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20">
 <div className="container mx-auto px-6 py-12">
 <div className="max-w-4xl mx-auto">
 <h1 className="text-4xl font-bold text-foreground mb-8 text-center">About Us</h1>

 <div className="bg-card rounded-lg shadow-lg p-8 mb-12">
 <h2 className="text-2xl font-semibold text-foreground mb-6">Our Mission</h2>
 <p className="text-muted-foreground leading-relaxed mb-6">
 At Bookcraft, we believe that everyone has a story to tell. Our mission is to harness the
 power of artificial intelligence to help people transform their ideas into professional
 books - quickly, easily, and accessible to everyone.
 </p>
 <p className="text-muted-foreground leading-relaxed">
 We developed Bookcraft to break down the barriers between your creative ideas and a
 finished book. With cutting-edge AI technology, we make it possible for anyone -
 regardless of writing experience - to create high-quality books.
 </p>
 </div>

 <div className="bg-card rounded-lg shadow-lg p-8 mb-12">
 <h2 className="text-2xl font-semibold text-foreground mb-6">Our Vision</h2>
 <p className="text-muted-foreground leading-relaxed">
 We envision a world where writing and publishing books is accessible to everyone.
 Through the use of advanced AI technology, we want to democratize the book industry
 and enable people to share their unique stories and ideas with the world.
 </p>
 </div>

 <div className="bg-card rounded-lg shadow-lg p-8 mb-12">
 <h2 className="text-2xl font-semibold text-foreground mb-6">Why Bookcraft?</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h3 className="font-semibold text-foreground mb-3"> Innovation</h3>
 <p className="text-muted-foreground">
 We leverage the latest advances in AI technology to provide you with the best
 possible book generation experience.
 </p>
 </div>
 <div>
 <h3 className="font-semibold text-foreground mb-3"> Quality</h3>
 <p className="text-muted-foreground">
 Our AI is trained to create high-quality, coherent, and engaging content.
 </p>
 </div>
 <div>
 <h3 className="font-semibold text-foreground mb-3"> User-Friendly</h3>
 <p className="text-muted-foreground">
 We've developed an intuitive platform that even beginners can use with ease.
 </p>
 </div>
 <div>
 <h3 className="font-semibold text-foreground mb-3"> Security</h3>
 <p className="text-muted-foreground">
 Your data and ideas are safe with us and are treated confidentially.
 </p>
 </div>
 </div>
 </div>

 <div className="bg-card rounded-lg shadow-lg p-8">
 <h2 className="text-2xl font-semibold text-foreground mb-6">Our Commitment</h2>
 <p className="text-muted-foreground leading-relaxed mb-4">
 We are committed to providing you with the best possible service. Our team continuously
 works to improve the platform, add new features, and ensure that you are completely
 satisfied with your generated books.
 </p>
 <p className="text-muted-foreground leading-relaxed">
 For questions, suggestions, or feedback, we are always available. Contact us - we look
 forward to hearing from you!
 </p>
 </div>
 </div>
 </div>
 </div>
 )
}