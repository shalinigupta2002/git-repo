-- =============================================================
-- Catalog module - sample data
-- Safe to re-run: data is cleared first, sequences reset.
-- =============================================================

TRUNCATE TABLE catalog.products   RESTART IDENTITY CASCADE;
TRUNCATE TABLE catalog.categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE catalog.brands     RESTART IDENTITY CASCADE;

-- Categories
INSERT INTO catalog.categories (name, slug) VALUES
  ('Electronics',    'electronics'),
  ('Mobiles',        'mobiles'),
  ('Laptops',        'laptops'),
  ('Audio',          'audio'),
  ('Home Appliances','home-appliances'),
  ('Fashion',        'fashion'),
  ('Footwear',       'footwear');

-- Brands
INSERT INTO catalog.brands (name, slug) VALUES
  ('Apple',   'apple'),
  ('Samsung', 'samsung'),
  ('Sony',    'sony'),
  ('Dell',    'dell'),
  ('HP',      'hp'),
  ('Lenovo',  'lenovo'),
  ('Boat',    'boat'),
  ('Nike',    'nike'),
  ('Adidas',  'adidas'),
  ('LG',      'lg');

-- Products
-- Staggered created_at so cursor pagination has deterministic order.
INSERT INTO catalog.products (title, description, price, image_url, category_id, brand_id, created_at) VALUES
  ('iPhone 15 Pro',        'Apple flagship smartphone with A17 chip and titanium body.',        129900.00, 'https://picsum.photos/seed/iphone15pro/600/600',   (SELECT id FROM catalog.categories WHERE slug='mobiles'),     (SELECT id FROM catalog.brands WHERE slug='apple'),   NOW() - INTERVAL '0 minutes'),
  ('iPhone 14',            'Last-gen iPhone with great camera and all-day battery.',           69999.00,  'https://picsum.photos/seed/iphone14/600/600',      (SELECT id FROM catalog.categories WHERE slug='mobiles'),     (SELECT id FROM catalog.brands WHERE slug='apple'),   NOW() - INTERVAL '5 minutes'),
  ('MacBook Air M3',       '13-inch laptop with M3 chip, 8GB RAM, 256GB SSD.',                  114900.00, 'https://picsum.photos/seed/mba-m3/600/600',        (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='apple'),   NOW() - INTERVAL '10 minutes'),
  ('MacBook Pro 14',       'Pro laptop with M3 Pro chip for creators.',                        199900.00, 'https://picsum.photos/seed/mbp-14/600/600',        (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='apple'),   NOW() - INTERVAL '15 minutes'),
  ('AirPods Pro 2',        'Active noise-cancelling wireless earbuds.',                         24900.00,  'https://picsum.photos/seed/airpods-pro2/600/600',  (SELECT id FROM catalog.categories WHERE slug='audio'),       (SELECT id FROM catalog.brands WHERE slug='apple'),   NOW() - INTERVAL '20 minutes'),

  ('Galaxy S24 Ultra',     'Samsung flagship with AI features and 200MP camera.',              129999.00, 'https://picsum.photos/seed/s24-ultra/600/600',     (SELECT id FROM catalog.categories WHERE slug='mobiles'),     (SELECT id FROM catalog.brands WHERE slug='samsung'), NOW() - INTERVAL '25 minutes'),
  ('Galaxy S23',           'Compact Samsung flagship with Snapdragon 8 Gen 2.',                 74999.00,  'https://picsum.photos/seed/s23/600/600',           (SELECT id FROM catalog.categories WHERE slug='mobiles'),     (SELECT id FROM catalog.brands WHERE slug='samsung'), NOW() - INTERVAL '30 minutes'),
  ('Galaxy Buds 2 Pro',    'Premium wireless earbuds with Hi-Fi sound.',                        17999.00,  'https://picsum.photos/seed/buds2pro/600/600',      (SELECT id FROM catalog.categories WHERE slug='audio'),       (SELECT id FROM catalog.brands WHERE slug='samsung'), NOW() - INTERVAL '35 minutes'),
  ('Samsung 55" QLED TV',  '4K Ultra HD Smart QLED TV with Quantum HDR.',                       89999.00,  'https://picsum.photos/seed/qled-55/600/600',       (SELECT id FROM catalog.categories WHERE slug='home-appliances'), (SELECT id FROM catalog.brands WHERE slug='samsung'), NOW() - INTERVAL '40 minutes'),

  ('Sony WH-1000XM5',      'Industry-leading noise cancelling over-ear headphones.',            29990.00,  'https://picsum.photos/seed/wh1000xm5/600/600',     (SELECT id FROM catalog.categories WHERE slug='audio'),       (SELECT id FROM catalog.brands WHERE slug='sony'),    NOW() - INTERVAL '45 minutes'),
  ('Sony Bravia 50"',      '4K HDR Smart LED TV with Google TV.',                               64999.00,  'https://picsum.photos/seed/bravia50/600/600',      (SELECT id FROM catalog.categories WHERE slug='home-appliances'), (SELECT id FROM catalog.brands WHERE slug='sony'),    NOW() - INTERVAL '50 minutes'),

  ('Dell XPS 13',          'Premium ultrabook with Intel Core Ultra 7.',                       139999.00, 'https://picsum.photos/seed/xps13/600/600',         (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='dell'),    NOW() - INTERVAL '55 minutes'),
  ('Dell Inspiron 15',     'Everyday laptop with Ryzen 5 and 16GB RAM.',                        54999.00,  'https://picsum.photos/seed/inspiron15/600/600',    (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='dell'),    NOW() - INTERVAL '60 minutes'),

  ('HP Pavilion 14',       'Slim laptop with Intel i5, 512GB SSD.',                             59990.00,  'https://picsum.photos/seed/pav14/600/600',         (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='hp'),      NOW() - INTERVAL '65 minutes'),
  ('HP Omen 16',           'Gaming laptop with RTX 4060 and 165Hz display.',                   129990.00, 'https://picsum.photos/seed/omen16/600/600',        (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='hp'),      NOW() - INTERVAL '70 minutes'),

  ('Lenovo ThinkPad X1',   'Business ultrabook with carbon fiber chassis.',                   179999.00, 'https://picsum.photos/seed/thinkpad-x1/600/600',   (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='lenovo'),  NOW() - INTERVAL '75 minutes'),
  ('Lenovo IdeaPad Slim 3','Budget laptop with Ryzen 5 5500U.',                                 42999.00,  'https://picsum.photos/seed/ideapad3/600/600',      (SELECT id FROM catalog.categories WHERE slug='laptops'),     (SELECT id FROM catalog.brands WHERE slug='lenovo'),  NOW() - INTERVAL '80 minutes'),

  ('Boat Rockerz 550',     'Wireless over-ear headphones with 20h playback.',                    1999.00,  'https://picsum.photos/seed/rockerz550/600/600',    (SELECT id FROM catalog.categories WHERE slug='audio'),       (SELECT id FROM catalog.brands WHERE slug='boat'),    NOW() - INTERVAL '85 minutes'),
  ('Boat Airdopes 141',    'Wireless earbuds with 42h total playtime.',                          1299.00,  'https://picsum.photos/seed/airdopes141/600/600',   (SELECT id FROM catalog.categories WHERE slug='audio'),       (SELECT id FROM catalog.brands WHERE slug='boat'),    NOW() - INTERVAL '90 minutes'),

  ('Nike Air Max 270',     'Iconic running shoes with Max Air cushioning.',                     12995.00,  'https://picsum.photos/seed/airmax270/600/600',     (SELECT id FROM catalog.categories WHERE slug='footwear'),    (SELECT id FROM catalog.brands WHERE slug='nike'),    NOW() - INTERVAL '95 minutes'),
  ('Nike Revolution 6',    'Lightweight everyday running shoes.',                                3495.00,  'https://picsum.photos/seed/revolution6/600/600',   (SELECT id FROM catalog.categories WHERE slug='footwear'),    (SELECT id FROM catalog.brands WHERE slug='nike'),    NOW() - INTERVAL '100 minutes'),

  ('Adidas Ultraboost 22', 'Premium running shoes with Boost midsole.',                         17999.00,  'https://picsum.photos/seed/ultraboost22/600/600',  (SELECT id FROM catalog.categories WHERE slug='footwear'),    (SELECT id FROM catalog.brands WHERE slug='adidas'),  NOW() - INTERVAL '105 minutes'),
  ('Adidas Runfalcon 3',   'Entry level running shoes for daily training.',                      3999.00,  'https://picsum.photos/seed/runfalcon3/600/600',    (SELECT id FROM catalog.categories WHERE slug='footwear'),    (SELECT id FROM catalog.brands WHERE slug='adidas'),  NOW() - INTERVAL '110 minutes'),

  ('LG 1.5 Ton AC',        '5-star inverter split air conditioner.',                            44999.00,  'https://picsum.photos/seed/lg-ac/600/600',         (SELECT id FROM catalog.categories WHERE slug='home-appliances'), (SELECT id FROM catalog.brands WHERE slug='lg'),      NOW() - INTERVAL '115 minutes'),
  ('LG 260L Fridge',       'Double-door frost-free refrigerator.',                              28990.00,  'https://picsum.photos/seed/lg-fridge/600/600',     (SELECT id FROM catalog.categories WHERE slug='home-appliances'), (SELECT id FROM catalog.brands WHERE slug='lg'),      NOW() - INTERVAL '120 minutes'),
  ('LG 7kg Washing Machine','Fully automatic front load washing machine.',                      32990.00,  'https://picsum.photos/seed/lg-wash/600/600',       (SELECT id FROM catalog.categories WHERE slug='home-appliances'), (SELECT id FROM catalog.brands WHERE slug='lg'),      NOW() - INTERVAL '125 minutes');
