// Utility to handle payment success state
export const PaymentSuccess = {
  // Store payment success data in localStorage
 store: (data: {
 type: 'coins' | 'subscription',
 amount: number,
 coins?: number,
 planName?: string,
 sessionId: string
 }) => {
 localStorage.setItem('bookifly_payment_success', JSON.stringify(data))
 },

  // Get and clear payment success data
 getAndClear: () => {
 const data = localStorage.getItem('bookifly_payment_success')
 if (data) {
 localStorage.removeItem('bookifly_payment_success')
 return JSON.parse(data)
 }
 return null
 },

  // Check if there's pending payment success
 hasPending: () => {
 return localStorage.getItem('bookifly_payment_success') !== null
 }
}
