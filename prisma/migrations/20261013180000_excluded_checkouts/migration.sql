-- Tickets the owner has asked to leave out of every report. The mp_* views
-- (prisma/views.sql) skip these checkouts and the item lines on their receipts.
--
-- First 30: every H-8 ticket closed with NO payment row at all, Rs 11,550,
-- 5 Jan - 4 Feb 2026 (29 in January, 1 on 4 Feb). Checked before excluding:
-- one checkout per receipt, 63 item lines, no cancels, refunds or payments.

CREATE TABLE "excluded_checkout" (
    "kantinSlug" TEXT NOT NULL,
    "checkoutId" BIGINT NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excluded_checkout_pkey" PRIMARY KEY ("kantinSlug","checkoutId")
);

CREATE INDEX "excluded_checkout_kantinSlug_receiptId_idx" ON "excluded_checkout"("kantinSlug", "receiptId");

INSERT INTO "excluded_checkout" ("kantinSlug", "checkoutId", "receiptId", "reason") VALUES
  ('h8', 439, 740, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 1135, 1453, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 1471, 1785, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 1937, 2256, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2079, 2400, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2441, 2756, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2566, 2887, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2640, 2954, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2642, 2956, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2684, 2998, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2734, 3049, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 2927, 3249, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 3049, 3374, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 3079, 3404, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 3237, 3551, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 3250, 3564, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 3458, 3772, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 3617, 3932, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 4322, 4736, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 4512, 4932, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 4551, 4972, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 4600, 5024, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 5123, 5536, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 5162, 5577, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 6282, 6699, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 6740, 7164, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 6802, 7229, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 6814, 7242, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 8200, 8718, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.'),
  ('h8', 11317, 11947, 'Closed with no payment recorded during the opening weeks (5 Jan - 4 Feb 2026). Excluded from all reports on the owner's instruction, 13 Oct 2026.');
