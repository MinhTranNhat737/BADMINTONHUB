-- ─────────────────────────────────────────────────────────────────────────────
-- 05. BỔ SUNG SẢN PHẨM NƯỚC UỐNG (REVIVE, DASANI)
-- Chạy file này cho DB đang hoạt động để thêm/cập nhật sản phẩm nước uống.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Upsert sản phẩm
INSERT INTO products (
    sku,
    name,
    brand,
    category,
    price,
    original_price,
    rating,
    reviews_count,
    in_stock,
    gender,
    description,
    specs,
    features
)
VALUES
(
    'RVE-500ML',
    'Nước thể thao Revive 500ml',
    'Revive',
    'Nước uống',
    15000,
    NULL,
    4.5,
    64,
    TRUE,
    NULL,
    'Nước thể thao bổ sung điện giải, phù hợp trước và sau khi vận động.',
    '{"volume":"500ml","type":"Nước thể thao","packaging":"Chai nhựa PET"}',
    '["Bổ sung điện giải","Vị dễ uống","Phù hợp chơi thể thao","Dùng lạnh ngon hơn"]'
),
(
    'DSN-500ML',
    'Nước khoáng Dasani 500ml',
    'Dasani',
    'Nước uống',
    10000,
    NULL,
    4.6,
    82,
    TRUE,
    NULL,
    'Nước khoáng đóng chai tinh khiết, tiện lợi cho người chơi tại sân.',
    '{"volume":"500ml","type":"Nước khoáng","packaging":"Chai nhựa PET"}',
    '["Tinh khiết","Dễ mang theo","Phù hợp sử dụng hàng ngày","Dùng lạnh ngon hơn"]'
)
ON CONFLICT (sku) DO UPDATE
SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    in_stock = EXCLUDED.in_stock,
    gender = EXCLUDED.gender,
    description = EXCLUDED.description,
    specs = EXCLUDED.specs,
    features = EXCLUDED.features,
    updated_at = NOW();

-- 2) Gắn badge "Mới" nếu chưa có
INSERT INTO product_badges (product_id, badge)
SELECT p.id, 'Mới'
FROM products p
WHERE p.sku IN ('RVE-500ML', 'DSN-500ML')
  AND NOT EXISTS (
      SELECT 1
      FROM product_badges pb
      WHERE pb.product_id = p.id
        AND pb.badge = 'Mới'
  );

-- 3) Upsert tồn kho theo từng kho
INSERT INTO inventory (
    sku,
    product_id,
    warehouse_id,
    name,
    category,
    on_hand,
    reserved,
    available,
    reorder_point,
    unit_cost
)
VALUES
-- Revive
('RVE-500ML', (SELECT id FROM products WHERE sku = 'RVE-500ML'), 1, 'Nước thể thao Revive 500ml', 'Nước uống', 120, 10, 110, 50, 10000),
('RVE-500ML', (SELECT id FROM products WHERE sku = 'RVE-500ML'), 2, 'Nước thể thao Revive 500ml', 'Nước uống', 100, 8, 92, 45, 10000),
('RVE-500ML', (SELECT id FROM products WHERE sku = 'RVE-500ML'), 3, 'Nước thể thao Revive 500ml', 'Nước uống', 80, 5, 75, 40, 10000),
('RVE-500ML', (SELECT id FROM products WHERE sku = 'RVE-500ML'), 4, 'Nước thể thao Revive 500ml', 'Nước uống', 400, 0, 400, 150, 10000),
-- Dasani
('DSN-500ML', (SELECT id FROM products WHERE sku = 'DSN-500ML'), 1, 'Nước khoáng Dasani 500ml', 'Nước uống', 150, 12, 138, 60, 7000),
('DSN-500ML', (SELECT id FROM products WHERE sku = 'DSN-500ML'), 2, 'Nước khoáng Dasani 500ml', 'Nước uống', 130, 10, 120, 55, 7000),
('DSN-500ML', (SELECT id FROM products WHERE sku = 'DSN-500ML'), 3, 'Nước khoáng Dasani 500ml', 'Nước uống', 110, 6, 104, 50, 7000),
('DSN-500ML', (SELECT id FROM products WHERE sku = 'DSN-500ML'), 4, 'Nước khoáng Dasani 500ml', 'Nước uống', 500, 0, 500, 200, 7000)
ON CONFLICT (sku, warehouse_id) DO UPDATE
SET
    product_id = EXCLUDED.product_id,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    on_hand = EXCLUDED.on_hand,
    reserved = EXCLUDED.reserved,
    available = EXCLUDED.available,
    reorder_point = EXCLUDED.reorder_point,
    unit_cost = EXCLUDED.unit_cost,
    updated_at = NOW();
