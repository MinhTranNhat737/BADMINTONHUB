-- ═══════════════════════════════════════════════════════════════════════════════
-- BADMINTONHUB - DỮ LIỆU MẪU (SEED DATA)
-- Chạy sau khi đã tạo bảng (01_create_tables.sql)
-- Dữ liệu bám sát mock-data.ts trong dự án
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CHI NHÁNH
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO branches (id, name, address, lat, lng) VALUES
(1, 'BadmintonHub Cầu Giấy',   'Số 12 Trần Thái Tông, Dịch Vọng, Cầu Giấy, Hà Nội',          21.028500, 105.782300),
(2, 'BadmintonHub Thanh Xuân',  'Số 68 Nguyễn Trãi, Thanh Xuân Trung, Thanh Xuân, Hà Nội',     20.993500, 105.800000),
(3, 'BadmintonHub Long Biên',   'Số 25 Nguyễn Văn Cừ, Ngọc Lâm, Long Biên, Hà Nội',           21.046000, 105.864800);

-- Reset sequence
SELECT setval('branches_id_seq', (SELECT MAX(id) FROM branches));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. KHO
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO warehouses (id, name, branch_id, is_hub) VALUES
(1, 'Kho Cầu Giấy',   1, FALSE),
(2, 'Kho Thanh Xuân',  2, FALSE),
(3, 'Kho Long Biên',   3, FALSE),
(4, 'Kho Hub',         NULL, TRUE);

SELECT setval('warehouses_id_seq', (SELECT MAX(id) FROM warehouses));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NGƯỜI DÙNG (mật khẩu hash bcrypt của chuỗi tương ứng)
-- Trong thực tế dùng bcrypt hash, ở đây ghi placeholder
-- admin/admin123, nhanvien1/nhanvien123, ...
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, username, password_hash, full_name, email, phone, role, warehouse_id) VALUES
-- Admin
('a0000001-0000-0000-0000-000000000001', 'admin',      '$2a$10$HASH_ADMIN',   'Quản trị viên',        'admin@badmintonhub.vn',        '0901234567', 'admin',    NULL),
-- Nhân viên từng kho
('e0000001-0000-0000-0000-000000000001', 'nhanvien1',  '$2a$10$HASH_NV1',     'Nhân viên Cầu Giấy',   'nv.caugiay@badmintonhub.vn',   '0909876543', 'employee', 1),
('e0000002-0000-0000-0000-000000000002', 'nhanvien2',  '$2a$10$HASH_NV2',     'Nhân viên Thanh Xuân', 'nv.thanhxuan@badmintonhub.vn', '0909876544', 'employee', 2),
('e0000003-0000-0000-0000-000000000003', 'nhanvien3',  '$2a$10$HASH_NV3',     'Nhân viên Long Biên',  'nv.longbien@badmintonhub.vn',  '0909876545', 'employee', 3),
('e0000004-0000-0000-0000-000000000004', 'nvhub',      '$2a$10$HASH_NVHUB',   'Nhân viên Kho Hub',    'nv.hub@badmintonhub.vn',       '0909876500', 'employee', 4);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SÂN CẦU LÔNG (11 sân)
-- ─────────────────────────────────────────────────────────────────────────────

-- Chi nhánh Cầu Giấy (4 sân)
INSERT INTO courts (id, name, branch_id, type, indoor, price, rating, reviews_count, description, hours) VALUES
(1,  'Sân A1 - Premium',    1, 'premium',  TRUE,  160000, 4.9, 128, 'Sân cao cấp với hệ thống chiếu sáng LED tiêu chuẩn quốc tế, sàn gỗ chống trơn nhập khẩu và điều hòa hai chiều.', '06:00 - 22:00'),
(2,  'Sân A2 - Standard',   1, 'standard', TRUE,  120000, 4.7, 95,  'Sân tiêu chuẩn với đầy đủ tiện nghi cơ bản, phù hợp cho giải trí và luyện tập.',                                 '06:00 - 22:00'),
(7,  'Sân A3 - Standard',   1, 'standard', TRUE,  110000, 4.5, 62,  'Sân tiêu chuẩn giá hợp lý, phù hợp luyện tập hàng ngày tại Cầu Giấy.',                                          '06:00 - 22:00'),
(8,  'Sân A4 - Ngoài trời', 1, 'standard', FALSE, 80000,  4.4, 45,  'Sân ngoài trời thoáng mát, giá rẻ. Phụ thuộc thời tiết.',                                                        '06:00 - 20:00');

-- Chi nhánh Thanh Xuân (4 sân)
INSERT INTO courts (id, name, branch_id, type, indoor, price, rating, reviews_count, description, hours) VALUES
(3,  'Sân B1 - Premium',    2, 'premium',  TRUE,  180000, 4.8, 156, 'Sân cao cấp nhất tại Thanh Xuân, trang bị đầy đủ tiện nghi.',                                                     '06:00 - 23:00'),
(4,  'Sân B2 - VIP',        2, 'vip',      TRUE,  250000, 5.0, 42,  'Sân VIP riêng tư với camera ghi hình, máy phát bóng tự động và dịch vụ cao cấp.',                                  '06:00 - 23:00'),
(9,  'Sân B3 - Standard',   2, 'standard', TRUE,  130000, 4.6, 88,  'Sân tiêu chuẩn tại Thanh Xuân, tiện nghi đầy đủ cho luyện tập.',                                                  '06:00 - 23:00'),
(10, 'Sân B4 - Ngoài trời', 2, 'standard', FALSE, 90000,  4.3, 37,  'Sân ngoài trời rộng rãi tại Thanh Xuân.',                                                                         '06:00 - 20:00');

-- Chi nhánh Long Biên (3 sân)
INSERT INTO courts (id, name, branch_id, type, indoor, price, rating, reviews_count, description, hours) VALUES
(5,  'Sân C1 - Standard',   3, 'standard', TRUE,  100000, 4.6, 78,  'Sân tiêu chuẩn giá tốt, vị trí thuận tiện ngay trung tâm Long Biên.',                                             '06:00 - 22:00'),
(6,  'Sân C2 - Premium',    3, 'premium',  TRUE,  150000, 4.8, 112, 'Sân cao cấp tại Long Biên với đầy đủ tiện nghi hiện đại.',                                                        '06:00 - 22:00'),
(11, 'Sân C3 - Ngoài trời', 3, 'standard', FALSE, 70000,  4.5, 54,  'Sân ngoài trời tại Long Biên với view thoáng đẹp.',                                                               '06:00 - 20:00');

SELECT setval('courts_id_seq', (SELECT MAX(id) FROM courts));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TIỆN ÍCH SÂN
-- ─────────────────────────────────────────────────────────────────────────────
-- Sân A1 Premium
INSERT INTO court_amenities (court_id, amenity) VALUES
(1, 'Điều hòa'), (1, 'Đèn LED'), (1, 'Sàn gỗ'), (1, 'Wi-Fi'), (1, 'Nước uống'), (1, 'Ghế nghỉ');
-- Sân A2
INSERT INTO court_amenities (court_id, amenity) VALUES
(2, 'Đèn LED'), (2, 'Sàn nhựa'), (2, 'Wi-Fi'), (2, 'Nước uống');
-- Sân A3
INSERT INTO court_amenities (court_id, amenity) VALUES
(7, 'Đèn LED'), (7, 'Sàn nhựa'), (7, 'Nước uống');
-- Sân A4 ngoài trời
INSERT INTO court_amenities (court_id, amenity) VALUES
(8, 'Đèn LED'), (8, 'Sàn bê tông'), (8, 'Nước uống'), (8, 'Ghế nghỉ');
-- Sân B1
INSERT INTO court_amenities (court_id, amenity) VALUES
(3, 'Điều hòa'), (3, 'Đèn LED'), (3, 'Sàn gỗ'), (3, 'Wi-Fi'), (3, 'Nước uống'), (3, 'Phòng thay đồ');
-- Sân B2 VIP
INSERT INTO court_amenities (court_id, amenity) VALUES
(4, 'Điều hòa'), (4, 'Đèn LED'), (4, 'Sàn gỗ'), (4, 'Wi-Fi'), (4, 'Nước uống'), (4, 'Phòng thay đồ'), (4, 'Camera'), (4, 'Máy phát bóng');
-- Sân B3
INSERT INTO court_amenities (court_id, amenity) VALUES
(9, 'Đèn LED'), (9, 'Sàn nhựa'), (9, 'Wi-Fi'), (9, 'Nước uống');
-- Sân B4 ngoài trời
INSERT INTO court_amenities (court_id, amenity) VALUES
(10, 'Đèn LED'), (10, 'Sàn bê tông'), (10, 'Nước uống');
-- Sân C1
INSERT INTO court_amenities (court_id, amenity) VALUES
(5, 'Đèn LED'), (5, 'Sàn nhựa'), (5, 'Nước uống');
-- Sân C2 Premium
INSERT INTO court_amenities (court_id, amenity) VALUES
(6, 'Điều hòa'), (6, 'Đèn LED'), (6, 'Sàn gỗ'), (6, 'Wi-Fi'), (6, 'Nước uống');
-- Sân C3 ngoài trời
INSERT INTO court_amenities (court_id, amenity) VALUES
(11, 'Đèn LED'), (11, 'Sàn bê tông'), (11, 'Nước uống'), (11, 'Ghế nghỉ');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. NHÀ CUNG CẤP
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO suppliers (id, name, contact_person, phone, email) VALUES
(1, 'Yonex Việt Nam',      'Nguyễn Thanh Sơn',  '028-3823-4567', 'son@yonex.vn'),
(2, 'Victor Sports VN',    'Trần Đại Nghĩa',    '028-3845-6789', 'nghia@victor.vn'),
(3, 'Li-Ning Việt Nam',    'Lê Minh Quân',       '028-3867-8901', 'quan@lining.vn');

SELECT setval('suppliers_id_seq', (SELECT MAX(id) FROM suppliers));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SẢN PHẨM (34 sản phẩm)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (id, sku, name, brand, category, price, original_price, rating, reviews_count, in_stock, gender, description, specs, features) VALUES
-- VỢT CẦU LÔNG
(1,  'YNX-AX88D',  'Vợt Yonex Astrox 88D Pro',     'Yonex',   'Vợt cầu lông', 4590000, 5200000, 4.9, 234, TRUE, NULL,
    'Vợt tấn công đỉnh cao dành cho người chơi chuyên nghiệp. Công nghệ Namd graphite.',
    '{"weight":"83g (4U)","balance":"Nặng đầu","shaft":"Cứng","maxTension":"28 lbs","madeIn":"Nhật Bản"}',
    '["Công nghệ Namd graphite tăng lực đập","Khung Aero+Box","Rotational Generator","Energy Boost Cap Plus"]'),

(3,  'VCT-TK99',   'Vợt Victor Thruster K 9900',    'Victor',  'Vợt cầu lông', 3890000, 4500000, 4.7, 189, TRUE, NULL,
    'Dòng vợt công thủ toàn diện với khung Free Core.',
    '{"weight":"84g (3U)","balance":"Hơi nặng đầu","shaft":"Cứng vừa","maxTension":"30 lbs","madeIn":"Đài Loan"}',
    '["Khung Free Core giảm lực xoắn","Nano Fortify TR","Pyrofil carbon","Tri-formation khí động"]'),

(8,  'LN-AXF80',   'Vợt Lining Axforce 80',         'Li-Ning', 'Vợt cầu lông', 3690000, 4200000, 4.8, 134, FALSE, NULL,
    'Vợt tấn công cao cấp với Air Stream giảm sức cản gió.',
    '{"weight":"84g (4U)","balance":"Nặng đầu","shaft":"Cứng","maxTension":"30 lbs","madeIn":"Trung Quốc"}',
    '["Air Stream System giảm 10% sức cản","Wing Stabilizer","TB Nano tăng độ bền","Dynamic Optimum Frame"]'),

(14, 'LN-N99',     'Vợt Li-Ning N99',               'Li-Ning', 'Vợt cầu lông', 3590000, 4100000, 4.7, 145, TRUE, NULL,
    'Phiên bản huyền thoại, thiết kế tấn công mạnh mẽ.',
    '{"weight":"84g (4U)","balance":"Nặng đầu","shaft":"Cứng","maxTension":"32 lbs","madeIn":"Trung Quốc"}',
    '["3D Calibar tăng lực smash","TB Nano siêu bền","Cú đánh chính xác","Phiên bản huyền thoại"]'),

(15, 'YNX-AX99P',  'Vợt Yonex Astrox 99 Pro',      'Yonex',   'Vợt cầu lông', 4990000, 5800000, 4.9, 198, TRUE, NULL,
    'Đỉnh cao công nghệ tấn công, Rotational Generator System Flow.',
    '{"weight":"83g (4U)","balance":"Nặng đầu","shaft":"Cứng","maxTension":"29 lbs","madeIn":"Nhật Bản"}',
    '["Rotational Generator System Flow","Namd đàn hồi cực cao","Volume Cut Resin","Power-Assist Bumper"]'),

(16, 'YNX-NF700',  'Vợt Yonex Nanoflare 700',      'Yonex',   'Vợt cầu lông', 4190000, 4800000, 4.8, 167, TRUE, NULL,
    'Dòng vợt nhẹ đầu tốc độ cao, Sonic Flare System.',
    '{"weight":"78g (5U)","balance":"Nhẹ đầu","shaft":"Cứng vừa","maxTension":"27 lbs","madeIn":"Nhật Bản"}',
    '["Sonic Flare System tốc độ cao","Torayca M40X siêu nhẹ","Aero Frame giảm sức cản","Phong cách tốc độ"]'),

(17, 'VCT-ARS90K', 'Vợt Victor Auraspeed 90K',     'Victor',  'Vợt cầu lông', 3790000, NULL,    4.6, 112, TRUE, NULL,
    'Dòng vợt tốc độ đỉnh cao, Aero-Sword khí động học.',
    '{"weight":"83g (4U)","balance":"Cân bằng","shaft":"Cứng vừa","maxTension":"30 lbs","madeIn":"Đài Loan"}',
    '["Aero-Sword giảm 6% sức cản","Rebound Shield tăng lực bật","Nano Fortify TR+","Swing tốc độ cực nhanh"]'),

(18, 'YNX-AX77',   'Vợt Yonex Astrox 77 Pro',      'Yonex',   'Vợt cầu lông', 4290000, 4900000, 4.8, 203, TRUE, NULL,
    'Dòng công thủ toàn diện, Rotational Generator System.',
    '{"weight":"83g (4U)","balance":"Hơi nặng đầu","shaft":"Cứng vừa","maxTension":"28 lbs","madeIn":"Nhật Bản"}',
    '["Rotational Generator System","Pocketing Booster tăng lực đẩy","Công thủ toàn diện","Cân bằng sức mạnh & tốc độ"]'),

-- GIÀY
(2,  'YNX-PC65Z',  'Giày Yonex Power Cushion 65Z3 Nam', 'Yonex', 'Giày', 3290000, NULL,    4.8, 156, TRUE, 'nam',
    'Thế hệ mới với Power Cushion+ giảm chấn, Radial Blade Sole bám sân.',
    '{"weight":"310g (Size 42)","sole":"Radial Blade Sole","cushion":"Power Cushion+","madeIn":"Việt Nam"}',
    '["Power Cushion+ giảm chấn 28%","Radial Blade Sole siêu bám","Double Russel Mesh thoáng khí","Nhẹ, linh hoạt"]'),

(9,  'YNX-PCAZ',   'Giày Yonex Aerus Z2 Nữ',       'Yonex',   'Giày', 3490000, 3900000, 4.9, 98,  TRUE, 'nu',
    'Siêu nhẹ chỉ 260g, form giày thiết kế riêng cho nữ.',
    '{"weight":"260g (Size 38)","sole":"Radial Blade Sole","cushion":"Power Cushion+","madeIn":"Việt Nam"}',
    '["Siêu nhẹ 260g","Form chuyên biệt cho nữ","Power Cushion+ vượt trội","Radial Blade Sole bám sân"]'),

(10, 'VCT-A922',   'Giày Victor A922F Nữ',          'Victor',  'Giày', 2690000, 3100000, 4.7, 73,  TRUE, 'nu',
    'Thiết kế thanh lịch, Energy Max đệm êm, VSR chống trơn.',
    '{"weight":"275g (Size 38)","sole":"VSR Rubber","cushion":"Energy Max","madeIn":"Indonesia"}',
    '["Thanh lịch cho nữ","Energy Max êm ái","VSR chống trơn","Ôm chân nữ"]'),

(11, 'VCT-A970',   'Giày Victor A970ACE Nam',       'Victor',  'Giày', 2890000, NULL,    4.6, 112, TRUE, 'nam',
    'Light Resilient EVA siêu nhẹ, ENERGYMAX III hấp thụ chấn động.',
    '{"weight":"320g (Size 42)","sole":"VSR Rubber","cushion":"ENERGYMAX III","madeIn":"Indonesia"}',
    '["Light Resilient EVA siêu nhẹ","ENERGYMAX III hấp thụ","V-Durable+ bền bỉ","Nam tính, mạnh mẽ"]'),

(19, 'LN-AYAR009', 'Giày Li-Ning Saga Pro',         'Li-Ning', 'Giày', 3190000, 3600000, 4.7, 88,  TRUE, NULL,
    'Đệm Bounse+ siêu êm, Tuff Tip chống mài mòn.',
    '{"weight":"305g (Size 42)","sole":"Tuff Tip","cushion":"Bounse+","madeIn":"Trung Quốc"}',
    '["Bounse+ siêu êm","Tuff Tip chống mài mòn","Carbon Plate ổn định","Ôm chân tối ưu"]'),

-- PHỤ KIỆN
(4,  'YNX-BG65',   'Cước Yonex BG65',               'Yonex',   'Phụ kiện', 150000,  NULL, 4.6, 512, TRUE, NULL,
    'Cước phổ biến nhất thế giới, bền bỉ, cảm giác đánh tốt.', '{"gauge":"0.70mm","tension":"18-28 lbs"}', '["Độ bền cao","Mềm, dễ chịu","Âm thanh trong","Mọi cấp độ"]'),
(6,  'YNX-AC102',  'Quấn cán Yonex AC102EX',        'Yonex',   'Phụ kiện', 45000,   NULL, 4.4, 890, TRUE, NULL,
    'Quấn cán overgrip bám tay, thấm mồ hôi nhanh.', '{"type":"Overgrip","thickness":"0.6mm"}', '["Bám tay cực tốt","Thấm mồ hôi","0.6mm vừa phải","Dễ quấn"]'),
(23, 'YNX-BG80',   'Cước Yonex BG80',               'Yonex',   'Phụ kiện', 170000,  NULL, 4.7, 389, TRUE, NULL,
    'Cước repulsion (bật) cực tốt, lõi Vectran.', '{"gauge":"0.68mm","tension":"20-28 lbs"}', '["Lực bật cực cao","Vectran tăng sức mạnh","Âm đanh giòn","Lối đánh tấn công"]'),
(24, 'VCT-GR262',  'Quấn cán Victor GR262',         'Victor',  'Phụ kiện', 35000,   NULL, 4.3, 678, TRUE, NULL,
    'Overgrip chất lượng cao, bám tay, giá phải chăng.', '{"type":"Overgrip","thickness":"0.65mm"}', '["Bám tay tốt","Thấm mồ hôi","Giá phải chăng","Bền bỉ"]'),
(25, 'YNX-EXBQ',   'Bao vợt Yonex Expert BAG',      'Yonex',   'Phụ kiện', 590000,  690000, 4.4, 134, TRUE, NULL,
    'Bao vợt 3 ngăn, chứa 2-3 vợt, nylon chống nước.', '{"capacity":"2-3 vợt","material":"Nylon chống nước"}', '["Gọn nhẹ","Chống nước","3 ngăn riêng","Quai xách & đeo"]'),
(26, 'YNX-SK155',  'Tất Yonex 19155 (3 đôi)',       'Yonex',   'Phụ kiện', 199000,  NULL, 4.5, 234, TRUE, NULL,
    'Bộ 3 đôi tất thể thao, đệm gót, thấm mồ hôi.', '{"qty":"3 đôi","material":"75% Cotton, 20% Polyester"}', '["Đệm gót giảm chấn","Thấm hút","Co giãn","3 đôi tiết kiệm"]'),
(27, 'YNX-WB01',   'Băng mồ hôi tay Yonex AC490',   'Yonex',   'Phụ kiện', 129000,  NULL, 4.4, 178, TRUE, NULL,
    'Thấm hút cực tốt, cotton terry dệt dày.', '{"material":"Cotton Terry","qty":"1 đôi"}', '["Thấm cực tốt","Cotton terry dày","Ôm cổ tay","Thoải mái"]'),
(28, 'YNX-HB02',   'Băng đầu Yonex AC258',          'Yonex',   'Phụ kiện', 159000,  NULL, 4.3, 96,  TRUE, NULL,
    'Giữ mồ hôi không chảy xuống mắt, co giãn tốt.', '{"material":"Cotton Terry","qty":"1 cái"}', '["Giữ mồ hôi","Thoáng khí","Co giãn","Nhẹ"]'),
(29, 'YNX-BTL01',  'Bình nước Yonex Sport 750ml',    'Yonex',   'Phụ kiện', 299000,  NULL, 4.6, 145, TRUE, NULL,
    'Nhựa Tritan BPA-free, nắp bật, giữ mát.', '{"capacity":"750ml","material":"Tritan BPA-free"}', '["Tritan an toàn","Nắp bật","Giữ mát","Thể thao"]'),
(30, 'GNR-GRIP5',  'Keo dán grip (5 cuộn)',          'Generic', 'Phụ kiện', 79000,   NULL, 4.2, 312, TRUE, NULL,
    'Keo dán grip 5 cuộn, cố định quấn cán.', '{"qty":"5 cuộn","width":"2.5cm"}', '["Độ dính tốt","Không để lại keo","5 cuộn","Bền bỉ"]'),

-- QUẢ CẦU
(20, 'YNX-AS50',   'Cầu lông Yonex Aerosensa 50',   'Yonex',   'Quả cầu', 690000,  NULL, 4.8, 324, TRUE, NULL,
    'Cầu thi đấu chính thức BWF, lông ngỗng chất lượng cao. Hộp 12 quả.', '{"type":"Lông ngỗng","qty":"12 quả/hộp","grade":"Chuyên nghiệp"}', '["BWF chính thức","Lông ngỗng cao cấp","Bay ổn định","Bền vượt trội"]'),
(21, 'YNX-AS30',   'Cầu lông Yonex Aerosensa 30',   'Yonex',   'Quả cầu', 520000,  NULL, 4.6, 456, TRUE, NULL,
    'Cầu tập luyện cao cấp, lông ngỗng, bền bỉ. Hộp 12 quả.', '{"type":"Lông ngỗng","qty":"12 quả/hộp","grade":"Tập luyện"}', '["Lông ngỗng","Bay ổn định","Bền cao cho tập","Giá hợp lý"]'),
(22, 'VCT-GD',     'Cầu lông Victor Gold',           'Victor',  'Quả cầu', 560000,  NULL, 4.5, 267, TRUE, NULL,
    'Cầu thi đấu CLB chất lượng cao, lông ngỗng tuyển chọn. Hộp 12 quả.', '{"type":"Lông ngỗng tuyển chọn","qty":"12 quả/hộp","grade":"CLB"}', '["Lông ngỗng tuyển chọn","Bay chính xác","Bền bỉ","Giá cạnh tranh"]'),

-- TÚI VỢT
(5,  'LNI-AB59',   'Túi vợt Lining ABJT059',        'Li-Ning', 'Túi vợt', 890000,  1100000, 4.5, 87, TRUE, NULL,
    'Túi 6 ngăn, chứa 4-6 vợt, polyester chống nước.', '{"capacity":"6 vợt","material":"Polyester 600D"}', '["6 ngăn tiện dụng","Ngăn giày riêng","Chống nước","Quai đeo êm"]'),
(31, 'YNX-BA26',   'Túi vợt Yonex BA26 Pro',        'Yonex',   'Túi vợt', 1790000, 2100000, 4.8, 76, TRUE, NULL,
    'Tournament 6-9 vợt, ngăn bảo vệ nhiệt cho cước.', '{"capacity":"6-9 vợt","material":"Polyester 900D"}', '["6-9 vợt","Bảo vệ nhiệt cước","Ngăn giày riêng","BackPack"]'),
(32, 'VCT-BR9213', 'Túi vợt Victor BR9213',          'Victor',  'Túi vợt', 1390000, NULL,    4.6, 98, TRUE, NULL,
    'Thiết kế hiện đại, chứa 6 vợt, chống nước nhẹ.', '{"capacity":"6 vợt","material":"Polyester 600D"}', '["6 ngăn rộng","Chống nước nhẹ","Ngăn giày riêng","Hiện đại"]'),

-- QUẦN ÁO
(7,  'YNX-10512',  'Áo Yonex 10512 Japan Nam',      'Yonex',   'Quần áo', 1290000, NULL,    4.7, 67, TRUE, 'nam',
    'Phiên bản Japan, Very Cool Dry, cắt may 3D.', '{"material":"Very Cool Dry","madeIn":"Nhật Bản","fit":"Regular"}', '["Very Cool Dry siêu nhanh","Chống UV","Cắt may 3D","Japan limited"]'),
(12, 'YNX-20640',  'Áo Yonex 20640 Nữ Japan',       'Yonex',   'Quần áo', 1190000, 1400000, 4.8, 54, TRUE, 'nu',
    'Phiên bản nữ Japan, form Slim Fit nữ tính.', '{"material":"Very Cool Dry","madeIn":"Nhật Bản","fit":"Slim Fit"}', '["Very Cool Dry","Slim Fit nữ tính","Chống UV","Japan limited"]'),
(13, 'VCT-T40010', 'Áo Victor T-40010 Nam',          'Victor',  'Quần áo', 890000,  NULL,    4.5, 89, TRUE, 'nam',
    'Eco Fiber thân thiện môi trường, co giãn 4 chiều.', '{"material":"Eco Fiber","madeIn":"Đài Loan","fit":"Regular"}', '["Eco Fiber thân thiện","Co giãn 4 chiều","Khô nhanh","Nam tính"]'),
(33, 'YNX-QN501',  'Quần Yonex 501 Woven',           'Yonex',   'Quần áo', 590000,  NULL,    4.5, 134, TRUE, NULL,
    'Polyester nhẹ, cạp chun co giãn, túi khóa kéo.', '{"material":"100% Polyester","fit":"Regular","technology":"Quick Dry"}', '["Woven nhẹ thoáng","Cạp chun co giãn","Túi khóa kéo","Quick Dry"]'),
(34, 'LN-AAYT011', 'Áo Li-Ning All England Open',    'Li-Ning', 'Quần áo', 890000,  1050000, 4.7, 67, TRUE, NULL,
    'Limited edition All England, AT DRY + Cool Shell.', '{"material":"AT DRY","madeIn":"Trung Quốc","fit":"Regular"}', '["Limited Edition","AT DRY siêu nhanh","Cool Shell thoáng","Họa tiết giải đấu"]');

SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NHÃN SẢN PHẨM
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO product_badges (product_id, badge) VALUES
(1, 'Bán chạy'), (2, 'Mới'), (3, 'Sale'), (4, 'Bán chạy'),
(5, 'Sale'), (8, 'Sale'), (9, 'Mới'), (10, 'Sale'),
(12, 'Sale'), (14, 'Bán chạy'), (15, 'Mới'), (15, 'Bán chạy'),
(16, 'Sale'), (18, 'Sale'), (19, 'Sale'), (20, 'Bán chạy'),
(23, 'Bán chạy'), (25, 'Sale'), (29, 'Mới'), (31, 'Sale'),
(34, 'Sale'), (34, 'Mới'), (7, 'Mới');

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TỒN KHO (inventory) — các kho chi nhánh + Kho Hub
-- warehouse_id: 1=Cầu Giấy, 2=Thanh Xuân, 3=Long Biên, 4=Hub
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO inventory (sku, product_id, warehouse_id, name, category, on_hand, reserved, available, reorder_point, unit_cost) VALUES
-- VỢT — Kho chi nhánh
('YNX-AX88D',  1,  1, 'Vợt Yonex Astrox 88D Pro',   'Vợt cầu lông', 15, 3,  12, 10, 3200000),
('YNX-AX88D',  1,  2, 'Vợt Yonex Astrox 88D Pro',   'Vợt cầu lông', 8,  1,  7,  5,  3200000),
('YNX-AX88D',  1,  3, 'Vợt Yonex Astrox 88D Pro',   'Vợt cầu lông', 5,  0,  5,  5,  3200000),
('VCT-TK99',   3,  1, 'Vợt Victor Thruster K 9900',  'Vợt cầu lông', 3,  1,  2,  5,  2700000),
('VCT-TK99',   3,  2, 'Vợt Victor Thruster K 9900',  'Vợt cầu lông', 6,  2,  4,  5,  2700000),
('VCT-TK99',   3,  3, 'Vợt Victor Thruster K 9900',  'Vợt cầu lông', 4,  0,  4,  5,  2700000),
('LN-N99',     14, 1, 'Vợt Li-Ning N99',             'Vợt cầu lông', 10, 2,  8,  5,  2500000),
('LN-N99',     14, 2, 'Vợt Li-Ning N99',             'Vợt cầu lông', 7,  1,  6,  5,  2500000),
('LN-N99',     14, 3, 'Vợt Li-Ning N99',             'Vợt cầu lông', 4,  0,  4,  5,  2500000),
('YNX-AX99P',  15, 1, 'Vợt Yonex Astrox 99 Pro',    'Vợt cầu lông', 12, 4,  8,  6,  3500000),
('YNX-AX99P',  15, 2, 'Vợt Yonex Astrox 99 Pro',    'Vợt cầu lông', 5,  1,  4,  4,  3500000),
('YNX-AX99P',  15, 3, 'Vợt Yonex Astrox 99 Pro',    'Vợt cầu lông', 3,  0,  3,  4,  3500000),
('YNX-NF700',  16, 1, 'Vợt Yonex Nanoflare 700',    'Vợt cầu lông', 9,  2,  7,  5,  2900000),
('YNX-NF700',  16, 2, 'Vợt Yonex Nanoflare 700',    'Vợt cầu lông', 6,  0,  6,  5,  2900000),
('VCT-ARS90K', 17, 3, 'Vợt Victor Auraspeed 90K',   'Vợt cầu lông', 7,  1,  6,  4,  2600000),
('VCT-ARS90K', 17, 1, 'Vợt Victor Auraspeed 90K',   'Vợt cầu lông', 4,  0,  4,  4,  2600000),
('YNX-AX77',   18, 1, 'Vợt Yonex Astrox 77 Pro',    'Vợt cầu lông', 11, 3,  8,  5,  3000000),
('YNX-AX77',   18, 3, 'Vợt Yonex Astrox 77 Pro',    'Vợt cầu lông', 2,  1,  1,  5,  3000000),

-- GIÀY — Kho chi nhánh
('YNX-PC65Z',  2,  2, 'Giày Yonex Power Cushion 65Z3', 'Giày', 8,  2,  6,  8,  2300000),
('YNX-PC65Z',  2,  1, 'Giày Yonex Power Cushion 65Z3', 'Giày', 10, 1,  9,  5,  2300000),
('YNX-PC65Z',  2,  3, 'Giày Yonex Power Cushion 65Z3', 'Giày', 6,  0,  6,  5,  2300000),
('YNX-PCAZ',   9,  1, 'Giày Yonex Aerus Z2',           'Giày', 12, 3,  9,  6,  2800000),
('YNX-PCAZ',   9,  2, 'Giày Yonex Aerus Z2',           'Giày', 7,  1,  6,  5,  2800000),
('YNX-PCAZ',   9,  3, 'Giày Yonex Aerus Z2',           'Giày', 4,  0,  4,  4,  2800000),
('VCT-A922',   10, 1, 'Giày Victor A922',               'Giày', 15, 2,  13, 8,  1800000),
('VCT-A922',   10, 2, 'Giày Victor A922',               'Giày', 10, 0,  10, 6,  1800000),
('VCT-A922',   10, 3, 'Giày Victor A922',               'Giày', 8,  1,  7,  6,  1800000),
('LN-AYAR009', 19, 2, 'Giày Li-Ning Saga Pro',          'Giày', 6,  0,  6,  4,  2200000),
('LN-AYAR009', 19, 3, 'Giày Li-Ning Saga Pro',          'Giày', 5,  1,  4,  4,  2200000),

-- PHỤ KIỆN — Kho chi nhánh
('YNX-BG65',   4,  3, 'Cước Yonex BG65',         'Phụ kiện', 120, 10, 110, 50,  85000),
('YNX-BG65',   4,  1, 'Cước Yonex BG65',         'Phụ kiện', 90,  8,  82,  40,  85000),
('YNX-BG65',   4,  2, 'Cước Yonex BG65',         'Phụ kiện', 70,  5,  65,  40,  85000),
('YNX-BG80',   23, 1, 'Cước Yonex BG80',         'Phụ kiện', 60,  5,  55,  30,  95000),
('YNX-BG80',   23, 2, 'Cước Yonex BG80',         'Phụ kiện', 45,  3,  42,  30,  95000),
('YNX-BG80',   23, 3, 'Cước Yonex BG80',         'Phụ kiện', 35,  0,  35,  30,  95000),
('YNX-AC102',  6,  1, 'Quấn cán Yonex AC102EX',  'Phụ kiện', 200, 15, 185, 100, 25000),
('YNX-AC102',  6,  2, 'Quấn cán Yonex AC102EX',  'Phụ kiện', 150, 10, 140, 80,  25000),
('YNX-AC102',  6,  3, 'Quấn cán Yonex AC102EX',  'Phụ kiện', 100, 5,  95,  60,  25000),
('VCT-GR262',  24, 1, 'Quấn cán Victor GR262',   'Phụ kiện', 180, 20, 160, 80,  20000),
('VCT-GR262',  24, 3, 'Quấn cán Victor GR262',   'Phụ kiện', 120, 0,  120, 60,  20000),

-- QUẢ CẦU — Kho chi nhánh
('YNX-AS50',   20, 1, 'Cầu lông Yonex Aerosensa 50', 'Quả cầu', 80,  10, 70, 30, 450000),
('YNX-AS50',   20, 2, 'Cầu lông Yonex Aerosensa 50', 'Quả cầu', 60,  5,  55, 30, 450000),
('YNX-AS50',   20, 3, 'Cầu lông Yonex Aerosensa 50', 'Quả cầu', 45,  8,  37, 30, 450000),
('YNX-AS30',   21, 1, 'Cầu lông Yonex Aerosensa 30', 'Quả cầu', 100, 15, 85, 40, 350000),
('YNX-AS30',   21, 2, 'Cầu lông Yonex Aerosensa 30', 'Quả cầu', 75,  10, 65, 40, 350000),
('YNX-AS30',   21, 3, 'Cầu lông Yonex Aerosensa 30', 'Quả cầu', 50,  5,  45, 40, 350000),
('VCT-GD',     22, 1, 'Cầu lông Victor Gold',         'Quả cầu', 40,  5,  35, 20, 380000),
('VCT-GD',     22, 3, 'Cầu lông Victor Gold',         'Quả cầu', 30,  0,  30, 20, 380000),

-- KHO HUB — Tồn kho lớn, không bán trực tiếp (warehouse_id = 4)
('YNX-AX88D',  1,  4, 'Vợt Yonex Astrox 88D Pro',       'Vợt cầu lông', 50,  0, 50,  20, 3200000),
('VCT-TK99',   3,  4, 'Vợt Victor Thruster K 9900',      'Vợt cầu lông', 40,  0, 40,  15, 2700000),
('LN-N99',     14, 4, 'Vợt Li-Ning N99',                 'Vợt cầu lông', 35,  0, 35,  15, 2500000),
('YNX-AX99P',  15, 4, 'Vợt Yonex Astrox 99 Pro',        'Vợt cầu lông', 45,  0, 45,  20, 3500000),
('YNX-NF700',  16, 4, 'Vợt Yonex Nanoflare 700',        'Vợt cầu lông', 30,  0, 30,  15, 2900000),
('VCT-ARS90K', 17, 4, 'Vợt Victor Auraspeed 90K',       'Vợt cầu lông', 30,  0, 30,  12, 2600000),
('YNX-AX77',   18, 4, 'Vợt Yonex Astrox 77 Pro',        'Vợt cầu lông', 40,  0, 40,  15, 3000000),
('YNX-PC65Z',  2,  4, 'Giày Yonex Power Cushion 65Z3',   'Giày', 40, 0, 40, 20, 2300000),
('YNX-PCAZ',   9,  4, 'Giày Yonex Aerus Z2',             'Giày', 35, 0, 35, 15, 2800000),
('VCT-A922',   10, 4, 'Giày Victor A922',                 'Giày', 45, 0, 45, 20, 1800000),
('LN-AYAR009', 19, 4, 'Giày Li-Ning Saga Pro',            'Giày', 30, 0, 30, 12, 2200000),
('YNX-AS50',   20, 4, 'Cầu lông Yonex Aerosensa 50',    'Quả cầu', 200, 0, 200, 80,  450000),
('YNX-AS30',   21, 4, 'Cầu lông Yonex Aerosensa 30',    'Quả cầu', 250, 0, 250, 100, 350000),
('VCT-GD',     22, 4, 'Cầu lông Victor Gold',             'Quả cầu', 150, 0, 150, 60,  380000),
('YNX-BG65',   4,  4, 'Cước Yonex BG65',                  'Phụ kiện', 300, 0, 300, 120, 85000),
('YNX-BG80',   23, 4, 'Cước Yonex BG80',                  'Phụ kiện', 200, 0, 200, 80,  95000),
('YNX-AC102',  6,  4, 'Quấn cán Yonex AC102EX',           'Phụ kiện', 500, 0, 500, 200, 25000),
('VCT-GR262',  24, 4, 'Quấn cán Victor GR262',            'Phụ kiện', 400, 0, 400, 150, 20000);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ĐÁNH GIÁ MẪU
-- ─────────────────────────────────────────────────────────────────────────────
-- (Cần user_id thực tế, bỏ qua nếu chưa có user đăng ký)
