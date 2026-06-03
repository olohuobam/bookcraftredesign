import { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'FAQ - Bookcraft',
 description: 'Frequently asked questions about Bookcraft',
}

export default function FAQPage() {
 const faqs = [
 {
 question: "How does AI-powered book generation work?",
 answer: "Our AI uses cutting-edge OpenAI technology to create a unique book based on your inputs such as genre, topic, and target audience. Simply enter your ideas, and the AI develops a coherent story or non-fiction text from them."
 },
 {
 question: "How long does it take for my book to be ready?",
 answer: "Book generation takes between 5-15 minutes depending on length. Short books (up to 50 pages) are usually ready in 5-8 minutes, while longer books can take up to 15 minutes."
 },
 {
 question: "In what formats can I download my book?",
 answer: "Depending on your chosen plan, you can download your book as PDF (all plans), EPUB (Professional and Premium), or additionally as MOBI (Premium only)."
 },
 {
 question: "Can I use the generated book commercially?",
 answer: "Yes, you receive full usage rights to the generated content. Our Premium plan explicitly includes and supports commercial use."
 },
 {
 question: "Are the generated books copyright-free?",
 answer: "The AI creates unique content based on your specifications. However, we recommend conducting a legal review, especially for commercial use. We do not guarantee complete copyright freedom."
 },
 {
 question: "Can I make changes to my book?",
 answer: "Yes, after generation you can edit the book, add or remove chapters, and adjust text. Our editor offers various editing options."
 },
 {
 question: "Which genres are supported?",
 answer: "We support all common genres: Fantasy, Science Fiction, Romance, Thriller, Mystery, Children's Books, Non-fiction, Biographies, and many more. The AI automatically adapts style and content to the selected genre."
 },
 {
 question: "Is there a money-back guarantee?",
 answer: "Yes, if you are not satisfied with your generated book, we offer a 14-day money-back guarantee. Simply contact our support."
 },
 {
 question: "How secure are my data and ideas?",
 answer: "Your data is transmitted and stored encrypted. We use your inputs exclusively for book generation and do not share them with third parties. Detailed information can be found in our privacy policy."
 },
 {
 question: "Can I order multiple books at once?",
 answer: "Currently, one book per order is possible. However, you can place as many separate orders as you like. For bulk orders, please contact our support for individual offers."
 }
 ]

 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20">
 <div className="container mx-auto px-6 py-12">
 <div className="max-w-4xl mx-auto">
 <h1 className="text-4xl font-bold text-foreground mb-8 text-center">
 Frequently Asked Questions (FAQ)
 </h1>
 <p className="text-xl text-muted-foreground mb-12 text-center">
 Here you'll find answers to the most common questions about Bookcraft
 </p>

 <div className="space-y-6">
 {faqs.map((faq, index) => (
 <div key={index} className="bg-card rounded-lg shadow-lg p-6 border border-border">
 <h3 className="text-lg font-semibold text-foreground mb-3">
 {faq.question}
 </h3>
 <p className="text-muted-foreground leading-relaxed">
 {faq.answer}
 </p>
 </div>
 ))}
 </div>

 <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center border border-blue-200 dark:border-blue-800">
 <h3 className="text-xl font-semibold text-foreground mb-4">
 Can't find your question?
 </h3>
 <p className="text-muted-foreground mb-6">
 Don't hesitate to contact us. Our support team will be happy to help you.
 </p>
 <a
 href="/kontakt"
 className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
 >
 Contact Us
 </a>
 </div>
 </div>
 </div>
 </div>
 )
}