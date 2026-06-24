-- Kantin RMS — derived views over the raw sync_batch JSON blobs
-- These are the "live" tables the H-8 dashboard pages query.
-- DISTINCT ON (kantin_slug, id) keeps the most-recently-pushed copy of each row.
-- Re-run this script after deploys / schema changes (idempotent — uses CREATE OR REPLACE).

-- =========================================================================
-- Base mirror views — one per synced MutfakPos table
-- =========================================================================

CREATE OR REPLACE VIEW mp_checkout AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'receiptid')::bigint     AS receipt_id,
    (row->>'staffid')::bigint       AS staff_id,
    (row->>'total')::float          AS total,
    (row->>'rounding')::float       AS rounding,
    (row->>'void')::boolean         AS void,
    (row->>'created')::timestamp    AS created,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'CHECKOUT'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, receipt_id, staff_id, total, rounding, void, created, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_receipt AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'sessionid')::bigint     AS session_id,
    (row->>'tableid')::bigint       AS table_id,
    (row->>'staffid')::bigint       AS staff_id,
    (row->>'opentime')::timestamp   AS open_time,
    (row->>'customerid')::bigint    AS customer_id,
    (row->>'source')::int           AS source,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'RECEIPT'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, session_id, table_id, staff_id, open_time, customer_id, source, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_itemsale AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'receiptid')::bigint     AS receipt_id,
    (row->>'itemid')::bigint        AS item_id,
    (row->>'staffid')::bigint       AS staff_id,
    (row->>'price')::float          AS price,
    (row->>'saletime')::timestamp   AS sale_time,
    (row->>'mode')::int             AS mode,
    (row->>'orderstatus')::int      AS order_status,
    (row->>'plate')::int            AS plate,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'ITEMSALE'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, receipt_id, item_id, staff_id, price, sale_time, mode, order_status, plate, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_payment AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'checkoutid')::bigint    AS checkout_id,
    (row->>'staffid')::bigint       AS staff_id,
    (row->>'paid')::float           AS paid,
    (row->>'balance')::float        AS balance,
    (row->>'paymenttime')::timestamp AS payment_time,
    (row->>'typeid')::bigint        AS type_id,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'PAYMENT'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, checkout_id, staff_id, paid, balance, payment_time, type_id, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_session AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint              AS id,
    (row->>'staffstartid')::bigint    AS staff_start_id,
    (row->>'staffcloseid')::bigint    AS staff_close_id,
    (row->>'starttime')::timestamp    AS start_time,
    (row->>'closetime')::timestamp    AS close_time,
    (row->>'pettycash')::float        AS petty_cash,
    sb."kantinSlug"                   AS kantin_slug,
    sb."receivedAt"                   AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'SESSION'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, staff_start_id, staff_close_id, start_time, close_time, petty_cash, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_cancel AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'itemsaleid')::bigint    AS itemsale_id,
    (row->>'staffid')::bigint       AS staff_id,
    (row->>'reason')::int           AS reason,
    (row->>'canceltime')::timestamp AS cancel_time,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'CANCEL'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, itemsale_id, staff_id, reason, cancel_time, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_refund AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'receiptid')::bigint     AS receipt_id,
    (row->>'staffid')::bigint       AS staff_id,
    (row->>'refundon')::timestamp   AS refund_on,
    (row->>'itemsaleid')::bigint    AS itemsale_id,
    (row->>'reason')::int           AS reason,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'REFUND'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, receipt_id, staff_id, refund_on, itemsale_id, reason, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_item AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'categoryid')::bigint    AS category_id,
    (row->>'title')::text           AS title,
    (row->>'price')::float          AS price,
    (row->>'pricetakeaway')::float  AS price_takeaway,
    (row->>'pricedelivery')::float  AS price_delivery,
    (row->>'tax')::float            AS tax,
    (row->>'status')::int           AS status,
    (row->>'onsale')::boolean       AS on_sale,
    (row->>'itemtype')::int         AS item_type,
    (row->>'barcode')::text         AS barcode,
    (row->>'description')::text     AS description,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'ITEM'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, category_id, title, price, price_takeaway, price_delivery, tax,
  status, on_sale, item_type, barcode, description, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_category AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'title')::text           AS title,
    (row->>'status')::int           AS status,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'CATEGORY'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, title, status, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_staff AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'fname')::text           AS fname,
    (row->>'sname')::text           AS sname,
    (row->>'workpos')::int          AS work_pos,
    (row->>'status')::int           AS status,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'STAFF'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, fname, sname, work_pos, status, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_customer AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'title')::text           AS title,
    (row->>'status')::int           AS status,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'CUSTOMER'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, title, status, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;

CREATE OR REPLACE VIEW mp_paymenttype AS
WITH expanded AS (
  SELECT
    (row->>'id')::bigint            AS id,
    (row->>'title')::text           AS title,
    (row->>'status')::int           AS status,
    sb."kantinSlug"                 AS kantin_slug,
    sb."receivedAt"                 AS received_at
  FROM "sync_batch" sb, jsonb_array_elements(sb.rows) row
  WHERE sb."table" = 'PAYMENTTYPE'
)
SELECT DISTINCT ON (kantin_slug, id)
  id, title, status, kantin_slug
FROM expanded
ORDER BY kantin_slug, id, received_at DESC;
