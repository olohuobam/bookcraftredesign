// This route has been consolidated into /dashboard/create/live-stream
// Redirect all traffic to the canonical text book creation page
import { redirect } from 'next/navigation'

export default function CreateTextBookRedirect() {
 redirect('/dashboard/create/live-stream')
}
