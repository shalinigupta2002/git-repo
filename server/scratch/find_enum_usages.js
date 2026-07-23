'use strict'

const { prisma } = require('../src/config/database.js')

async function run() {
  try {
    console.log('Searching for legacy enum value "BOTH_STANDARD_MONTH" in the database...')

    // Search users table
    const users = await prisma.$queryRawUnsafe(
      `SELECT id, email, buyer_subscription_plan, seller_subscription_plan FROM "users" 
       WHERE "buyer_subscription_plan"::text = 'BOTH_STANDARD_MONTH' 
          OR "seller_subscription_plan"::text = 'BOTH_STANDARD_MONTH'`
    )
    console.log(`Found in users: ${users.length} rows.`, users)

    // Search subscriptions table
    const subscriptions = await prisma.$queryRawUnsafe(
      `SELECT id, user_id, plan FROM "subscriptions" WHERE "plan"::text = 'BOTH_STANDARD_MONTH'`
    )
    console.log(`Found in subscriptions: ${subscriptions.length} rows.`, subscriptions)

    // Search payments table
    const payments = await prisma.$queryRawUnsafe(
      `SELECT id, user_id, plan FROM "payments" WHERE "plan"::text = 'BOTH_STANDARD_MONTH'`
    )
    console.log(`Found in payments: ${payments.length} rows.`, payments)

  } catch (err) {
    console.error('Search failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
