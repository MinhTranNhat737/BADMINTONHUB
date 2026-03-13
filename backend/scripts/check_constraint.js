const { query } = require('../config/database');
const fs = require('fs');
query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'purchase_orders_status_check'")
    .then(r => { fs.writeFileSync('/tmp/constraint_result.txt', JSON.stringify(r.rows, null, 2)); console.log('Done - check /tmp/constraint_result.txt'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
