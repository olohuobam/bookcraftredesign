/* eslint-disable @typescript-eslint/no-require-imports */
// Reset purchased field for all books to false
// Now uses Supabase instead of Prisma

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetPurchasedField() {
  try {
    console.log('Starting reset of purchased field...')
    
    // Get current state
    const { data: beforeBooks, error: beforeError } = await supabase
      .from('books')
      .select('id, title, purchased')
      .eq('purchased', true)
    
    if (beforeError) throw beforeError

    console.log(`Found ${beforeBooks?.length || 0} books with purchased=true`)
    
    if (beforeBooks && beforeBooks.length > 0) {
      console.log('Books that will be reset:')
      beforeBooks.forEach(book => {
        console.log(`- ${book.title} (${book.id})`)
      })
    }

    // Update all books to set purchased = false
    const { data: updateResult, error: updateError } = await supabase
      .from('books')
      .update({ purchased: false })
      .neq('purchased', false)  // Only update books where purchased is not already false
      .select('id')
    
    if (updateError) throw updateError

    console.log(`\nSuccessfully reset ${updateResult?.length || 0} books`)

    // Verify the reset
    const { data: afterBooks, error: afterError } = await supabase
      .from('books')
      .select('id, title, purchased')
      .eq('purchased', true)
    
    if (afterError) throw afterError

    console.log(`\nVerification: ${afterBooks?.length || 0} books still have purchased=true`)
    
    if (afterBooks && afterBooks.length > 0) {
      console.log('Books that still have purchased=true:')
      afterBooks.forEach(book => {
        console.log(`- ${book.title} (${book.id})`)
      })
    } else {
      console.log('✅ All books successfully reset to purchased=false')
    }

  } catch (error) {
    console.error('Error resetting purchased field:', error)
  }
}

resetPurchasedField()
