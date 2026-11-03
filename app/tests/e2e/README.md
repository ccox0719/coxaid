# Mocked end-to-end checks

These drive the real built UI in headless Chrome against an in-memory fake of the
Supabase REST API (no real project, no real credentials). They do **not** exercise
real Row Level Security, database triggers, or auth — only the app's own behaviour.

```bash
npm i --no-save playwright-core
VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=mock npx vite build --outDir tests/e2e/dist-mock --emptyOutDir
node tests/e2e/workflow.mjs   # parent workflow, 24 checks
node tests/e2e/extra.mjs      # student role, load failure, empty states, mobile, keyboard
```
