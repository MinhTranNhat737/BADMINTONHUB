const { query } = require('../config/database');

async function main() {
  try {
    const r = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' ORDER BY ordinal_position"
    );
    console.log('sales_orders columns:', r.rows.map(x => x.column_name).join(', '));

    const r2 = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='sales_order_items' ORDER BY ordinal_position"
    );
    console.log('sales_order_items columns:', r2.rows.map(x => x.column_name).join(', '));

    // Try inserting a test order
    const testBody = {
      branch_id: 1,
      customer_name: 'Test',
      customer_phone: null,
      total: 100000,
      discount: 0,
      final_total: 100000,
      payment_method: 'Tiền mặt',
      note: null,
      items: [{ product_id: 1, product_name: 'Test', qty: 1, price: 100000 }],
      created_by: 1,
    };
    const SalesOrder = require('../models/sales-order.model');
    const order = await SalesOrder.create(testBody);
    console.log('Created order:', order);
  } catch (e) {
    console.error('Error:', e.message, e.detail || '');
  }
  process.exit(0);
}
main();
