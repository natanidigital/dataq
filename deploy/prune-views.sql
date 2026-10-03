WITH d AS (
  DELETE FROM "ImageView"
  WHERE "viewedAt" < (now() AT TIME ZONE 'UTC') - interval '2 days'
  RETURNING 1
)
SELECT 'pruned ' || count(*) || ' ImageView rows older than 2 days' FROM d;
