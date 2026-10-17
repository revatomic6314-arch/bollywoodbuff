# Bollywood Buff

## Files
- `index.html`: page layout
- `style.css`: design
- `app.js`: quiz and host controls
- `questions.json`: question list for reference/editing
- `schema.sql`: database setup and secure scoring
- `bollywood-buff-logo.png`: logo

## Publish on GitHub Pages
1. Upload all these files to the root of a GitHub repository.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. Wait for the published URL.

## Supabase setup
1. Open your Supabase project's SQL Editor.
2. Paste and run `schema.sql`.
3. In Supabase Authentication, create a host user.
4. Copy the host user's UUID, then run this SQL after replacing `PASTE-HOST-USER-UUID`:

   `insert into public.host_users(user_id) values ('PASTE-HOST-USER-UUID');`

5. Confirm the URL and publishable key at the top of `app.js` match your Supabase project.

Participant page: the published URL.
Host page: add `?host=1` to the published URL.

The frontend uses Supabase's publishable key. Never put a service-role key in `app.js`.
