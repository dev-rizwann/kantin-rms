-- Display name only. Keep the existing slug, sync identity and trading policy.
UPDATE "Kantin"
SET "name" = 'MUZAFARABAD (AJK)',
    "fullAddress" = 'Muzafarabad, Azad Jammu & Kashmir'
WHERE "slug" = 'kashmir';
