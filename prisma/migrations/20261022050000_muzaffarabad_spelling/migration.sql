-- Portal display spelling only: do not alter sync identity, sales or live status.
UPDATE "Kantin"
SET "name" = 'Muzaffarabad (AJK)',
    "fullAddress" = 'Muzaffarabad, Azad Jammu & Kashmir'
WHERE "slug" = 'kashmir';
