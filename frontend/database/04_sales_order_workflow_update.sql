-- ═══════════════════════════════════════════════════════════════════════════════
-- BADMINTONHUB - MIGRATION 04
-- Mở rộng luồng đơn bán tại quầy: COD / thanh toán tại shop / điều chuyển
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Tạm thời drop view phụ thuộc vào cột status
DROP VIEW IF EXISTS v_sales_summary;

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS fulfillment_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS fulfill_warehouse_id INT REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS transfer_source_warehouse_id INT REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS transfer_request_id UUID,
  ADD COLUMN IF NOT EXISTS expected_pickup_date DATE,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10),
  ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP;

UPDATE sales_orders
SET order_type = COALESCE(order_type, 'pay_at_shop'),
    fulfillment_mode = COALESCE(fulfillment_mode, 'shop_direct'),
    payment_status = COALESCE(payment_status, 'unpaid');

ALTER TABLE sales_orders
  ALTER COLUMN order_type SET DEFAULT 'pay_at_shop',
  ALTER COLUMN order_type SET NOT NULL,
  ALTER COLUMN fulfillment_mode SET DEFAULT 'shop_direct',
  ALTER COLUMN fulfillment_mode SET NOT NULL,
  ALTER COLUMN payment_status SET DEFAULT 'unpaid',
  ALTER COLUMN payment_status SET NOT NULL,
  ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR(20);

ALTER TABLE sales_orders
  DROP CONSTRAINT IF EXISTS sales_orders_status_check,
  DROP CONSTRAINT IF EXISTS sales_orders_order_type_check,
  DROP CONSTRAINT IF EXISTS sales_orders_fulfillment_mode_check,
  DROP CONSTRAINT IF EXISTS sales_orders_payment_status_check;

ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_status_check
    CHECK (status IN ('pending','approved','waiting_transfer','waiting_payment','rejected','exported')),
  ADD CONSTRAINT sales_orders_order_type_check
    CHECK (order_type IN ('delivery_cod','pay_at_shop')),
  ADD CONSTRAINT sales_orders_fulfillment_mode_check
    CHECK (fulfillment_mode IN ('warehouse_delivery','shop_direct','shop_transfer')),
  ADD CONSTRAINT sales_orders_payment_status_check
    CHECK (payment_status IN ('unpaid','paid'));

COMMIT;

-- Recreate view sau khi migration xong
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT
  so.id,
  so.id::TEXT          AS order_code,
  u.full_name          AS employee_name,
  br.name              AS branch_name,
  so.customer_name,
  so.customer_phone,
  so.final_total,
  so.status,
  so.created_at
FROM sales_orders so
JOIN users    u  ON u.id  = so.created_by
LEFT JOIN branches br ON br.id = so.branch_id
ORDER BY so.created_at DESC;
