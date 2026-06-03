import { supabaseAdmin } from '@/lib/supabase-admin'
export { FREE_BOOK_LIMIT } from '@/lib/constants'

/**
 * Check if a user has an active Pro subscription.
 * Server-side check via the `subscriptions` table.
 */
export async function checkIsPro(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return false
    }

    const notExpired = !data.current_period_end || new Date(data.current_period_end) > new Date()
    return data.plan === 'pro' && data.status === 'active' && notExpired
  } catch {
    return false
  }
}
