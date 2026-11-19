-- Gate 2E.7 creation-only proposal. NOT EXECUTED.
-- Requires a separate explicit production approval after reviewing the inspection query.
-- Aborts without changes if the bucket or either policy name already exists, or if RLS is off.

BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'storage.objects RLS must already be enabled; no changes made';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'payment_receipts'
  ) THEN
    RAISE EXCEPTION 'payment_receipts bucket already exists; inspect its settings before proceeding';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'payment_receipts_super_admin_only',
        'payment_receipts_restrict_non_admin'
      )
  ) THEN
    RAISE EXCEPTION 'A target policy name already exists; inspect its definition before proceeding';
  END IF;
END
$preflight$;

INSERT INTO storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'payment_receipts',
    'payment_receipts',
    FALSE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  );

CREATE POLICY payment_receipts_super_admin_only
  ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'payment_receipts'
    AND public.is_super_admin()
    AND (auth.jwt() ->> 'aal') = 'aal2'
  )
  WITH CHECK (
    bucket_id = 'payment_receipts'
    AND public.is_super_admin()
    AND (auth.jwt() ->> 'aal') = 'aal2'
  );

CREATE POLICY payment_receipts_restrict_non_admin
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (
    bucket_id <> 'payment_receipts'
    OR (
      public.is_super_admin()
      AND (auth.jwt() ->> 'aal') = 'aal2'
    )
  )
  WITH CHECK (
    bucket_id <> 'payment_receipts'
    OR (
      public.is_super_admin()
      AND (auth.jwt() ->> 'aal') = 'aal2'
    )
  );

COMMIT;
