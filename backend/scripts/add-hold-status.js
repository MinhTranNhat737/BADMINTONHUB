/**
 * Migration: Add 'hold' status to bookings table CHECK constraint
 * 
 * Run: node backend/scripts/add-hold-status.js
 */

const { getClient } = require('../config/database')

async function migrate() {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    // Drop existing constraint
    await client.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check
    `)

    // Add updated constraint with 'hold'
    await client.query(`
      ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
      CHECK (status IN ('pending','confirmed','hold','playing','completed','cancelled'))
    `)

    await client.query('COMMIT')
    console.log('✅ Migration successful: Added "hold" status to bookings table')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err.message)
  } finally {
    client.release()
    process.exit(0)
  }
}

migrate()
