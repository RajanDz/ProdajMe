# Supabase Storage Setup

Run these steps in the Supabase Dashboard → Storage:

1. Create bucket: `listing-images`
   - Public: YES
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

2. Create bucket: `avatars`
   - Public: YES
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

3. Storage Policies (via Supabase Dashboard → Storage → Policies):

For `listing-images`:
- SELECT (public): true
- INSERT: auth.uid()::text = (storage.foldername(name))[1]
- DELETE: auth.uid()::text = (storage.foldername(name))[1]

For `avatars`:
- SELECT (public): true
- INSERT: auth.uid()::text = (storage.foldername(name))[1]
- DELETE: auth.uid()::text = (storage.foldername(name))[1]
