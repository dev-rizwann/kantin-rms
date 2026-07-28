-- Derive the deep-fry oil charge from the recipe's own fried ingredients
-- instead of a hand-typed gram figure that silently goes stale when a portion
-- changes (Loaded Fries kept 333 g of oil after its fries dropped 250 g -> 150 g).
--
-- fryerGramsPerUnit = grams entering the fryer per ONE stock unit of the product.
-- Piece items get their piece weight from the 1 kg pack (pieces per kg -> g each).
-- Cooked Fries is a semi: 1000 g frozen yields 750 g cooked, so one cooked gram
-- carries 1.3333 raw grams into the oil.

ALTER TABLE "Product" ADD COLUMN "fryerGramsPerUnit" DECIMAL(14,6);

UPDATE "Product" SET "fryerGramsPerUnit" = 1000.0/750  WHERE id = 'cmrmkbg0w007qwczyim4whxxs'; -- Cooked Fries  1.3333 g raw / g cooked
UPDATE "Product" SET "fryerGramsPerUnit" = 1000.0/39   WHERE id = 'cmrmkbfj4003ywczy46v2mf19'; -- Nugget         39 pcs/kg -> 25.64 g
UPDATE "Product" SET "fryerGramsPerUnit" = 1000.0/55   WHERE id = 'cmrmkbfjo0042wczykt9psdl1'; -- Tender popcorn 55 pcs/kg -> 18.18 g
UPDATE "Product" SET "fryerGramsPerUnit" = 1000.0/8.5  WHERE id = 'cmrmkbfim003uwczy5c212mer'; -- Zinger fillet  8.5/kg    -> 117.65 g
UPDATE "Product" SET "fryerGramsPerUnit" = 1000.0/12   WHERE id = 'cmrmkbfi4003qwczycd1f5w1d'; -- Burger patty   12 pcs/kg -> 83.33 g
