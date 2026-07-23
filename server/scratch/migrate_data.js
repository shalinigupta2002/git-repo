'use strict'

const { prisma } = require('../src/config/database.js')

const LEGACY_MAP = {
  BUYER_STANDARD: 'BUYER_ANNUAL',
  SELLER_MONTH: 'SELLER_MONTHLY',
  BOTH_STANDARD_MONTH: 'BOTH_MONTHLY',
  BOTH_LIFETIME_LIFETIME: 'BOTH_LIFETIME',
  BOTH_LIFETIME_MONTH: 'BOTH_MONTHLY',
  BOTH_STANDARD_LIFETIME: 'BOTH_ANNUAL',
}

async function run() {
  try {
    console.log('Starting schema update and data migration...')

    // 1. Add new values to the enum type (PostgreSQL ALTER TYPE ... ADD VALUE cannot run inside a transaction)
    const newEnumValues = [
      'BUYER_MONTHLY',
      'BUYER_ANNUAL',
      'SELLER_MONTHLY',
      'SELLER_ANNUAL',
      'BOTH_MONTHLY',
      'BOTH_ANNUAL',
      'BOTH_LIFETIME'
    ]

    for (const val of newEnumValues) {
      try {
        console.log(`Adding ${val} to SubscriptionPlan enum type...`)
        await prisma.$executeRawUnsafe(`ALTER TYPE "SubscriptionPlan" ADD VALUE '${val}'`)
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('already exists')) {
          console.log(`Value ${val} already exists in enum.`)
        } else {
          throw err;
        }
      }
    }

    console.log('Enum values added. Starting data updates (without transaction)...')

    // Update users for basic plan names
    console.log('Updating users table for basic plan names...')
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "buyer_subscription_plan" = 'BUYER_ANNUAL'::"SubscriptionPlan" WHERE "buyer_subscription_plan" = 'BUYER_STANDARD'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "buyer_subscription_plan" = 'BUYER_LIFETIME'::"SubscriptionPlan" WHERE "buyer_subscription_plan" = 'BUYER_LIFETIME'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "seller_subscription_plan" = 'SELLER_MONTHLY'::"SubscriptionPlan" WHERE "seller_subscription_plan" = 'SELLER_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "seller_subscription_plan" = 'SELLER_LIFETIME'::"SubscriptionPlan" WHERE "seller_subscription_plan" = 'SELLER_LIFETIME'::"SubscriptionPlan"`
    )

    // Clean up any bundle plans written directly to user table columns
    console.log('Cleaning up bundle plan keys from user table columns...')
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "buyer_subscription_plan" = 'BUYER_MONTHLY'::"SubscriptionPlan" WHERE "buyer_subscription_plan" = 'BOTH_STANDARD_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "seller_subscription_plan" = 'SELLER_MONTHLY'::"SubscriptionPlan" WHERE "seller_subscription_plan" = 'BOTH_STANDARD_MONTH'::"SubscriptionPlan"`
    )

    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "buyer_subscription_plan" = 'BUYER_LIFETIME'::"SubscriptionPlan" WHERE "buyer_subscription_plan" = 'BOTH_LIFETIME_LIFETIME'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "seller_subscription_plan" = 'SELLER_LIFETIME'::"SubscriptionPlan" WHERE "seller_subscription_plan" = 'BOTH_LIFETIME_LIFETIME'::"SubscriptionPlan"`
    )

    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "buyer_subscription_plan" = 'BUYER_LIFETIME'::"SubscriptionPlan" WHERE "buyer_subscription_plan" = 'BOTH_LIFETIME_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "seller_subscription_plan" = 'SELLER_MONTHLY'::"SubscriptionPlan" WHERE "seller_subscription_plan" = 'BOTH_LIFETIME_MONTH'::"SubscriptionPlan"`
    )

    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "buyer_subscription_plan" = 'BUYER_ANNUAL'::"SubscriptionPlan" WHERE "buyer_subscription_plan" = 'BOTH_STANDARD_LIFETIME'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "seller_subscription_plan" = 'SELLER_LIFETIME'::"SubscriptionPlan" WHERE "seller_subscription_plan" = 'BOTH_STANDARD_LIFETIME'::"SubscriptionPlan"`
    )

    // Update subscriptions
    console.log('Updating subscriptions table...')
    await prisma.$executeRawUnsafe(
      `UPDATE "subscriptions" SET "plan" = 'BUYER_ANNUAL'::"SubscriptionPlan" WHERE "plan" = 'BUYER_STANDARD'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "subscriptions" SET "plan" = 'SELLER_MONTHLY'::"SubscriptionPlan" WHERE "plan" = 'SELLER_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "subscriptions" SET "plan" = 'BUYER_MONTHLY'::"SubscriptionPlan" WHERE "plan" = 'BOTH_STANDARD_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "subscriptions" SET "plan" = 'BUYER_LIFETIME'::"SubscriptionPlan" WHERE "plan" = 'BOTH_LIFETIME_LIFETIME'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "subscriptions" SET "plan" = 'BUYER_LIFETIME'::"SubscriptionPlan" WHERE "plan" = 'BOTH_LIFETIME_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "subscriptions" SET "plan" = 'BUYER_ANNUAL'::"SubscriptionPlan" WHERE "plan" = 'BOTH_STANDARD_LIFETIME'::"SubscriptionPlan"`
    )

    // Update payments
    console.log('Updating payments table...')
    await prisma.$executeRawUnsafe(
      `UPDATE "payments" SET "plan" = 'BUYER_ANNUAL'::"SubscriptionPlan" WHERE "plan" = 'BUYER_STANDARD'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "payments" SET "plan" = 'SELLER_MONTHLY'::"SubscriptionPlan" WHERE "plan" = 'SELLER_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "payments" SET "plan" = 'BOTH_MONTHLY'::"SubscriptionPlan" WHERE "plan" = 'BOTH_STANDARD_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "payments" SET "plan" = 'BOTH_LIFETIME'::"SubscriptionPlan" WHERE "plan" = 'BOTH_LIFETIME_LIFETIME'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "payments" SET "plan" = 'BOTH_MONTHLY'::"SubscriptionPlan" WHERE "plan" = 'BOTH_LIFETIME_MONTH'::"SubscriptionPlan"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "payments" SET "plan" = 'BOTH_ANNUAL'::"SubscriptionPlan" WHERE "plan" = 'BOTH_STANDARD_LIFETIME'::"SubscriptionPlan"`
    )

    // Update deal_charge_configs safely to avoid unique key conflicts
    console.log('Safely updating deal_charge_configs table...')
    for (const [legacyKey, targetKey] of Object.entries(LEGACY_MAP)) {
      const legacyConfigs = await prisma.dealChargeConfig.findMany({
        where: { planKey: legacyKey }
      })

      for (const legacyConf of legacyConfigs) {
        const targetConf = await prisma.dealChargeConfig.findFirst({
          where: {
            planKey: targetKey,
            audience: legacyConf.audience
          }
        })

        if (targetConf) {
          console.log(`Re-mapping deals from config ${legacyConf.planKey} (${legacyConf.id}) to ${targetConf.planKey} (${targetConf.id})`)
          if (legacyConf.audience === 'BUYER') {
            await prisma.deal.updateMany({
              where: { buyerChargeConfigId: legacyConf.id },
              data: { buyerChargeConfigId: targetConf.id }
            })
          } else {
            await prisma.deal.updateMany({
              where: { sellerChargeConfigId: legacyConf.id },
              data: { sellerChargeConfigId: targetConf.id }
            })
          }
          await prisma.dealChargeConfig.delete({
            where: { id: legacyConf.id }
          })
        } else {
          console.log(`Renaming config ${legacyConf.planKey} to ${targetKey}`)
          await prisma.dealChargeConfig.update({
            where: { id: legacyConf.id },
            data: { planKey: targetKey }
          })
        }
      }
    }

    console.log('Data migration completed successfully.')
  } catch (err) {
    console.error('Data migration failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
