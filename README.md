# PASIYA OFC (Vercel)

yourdomain.com             -> portfolio
yourdomain.com/api         -> PASIYA API   (own theme + shared login)
yourdomain.com/pastpapers  -> Past Papers
yourdomain.com/bot         -> WhatsApp Bot
yourdomain.com/qr          -> QR Editor (site eka athule hadapu page eka: public/qr, uploads -> catbox.moe via api/qr-upload.js)

## Deploy
1. GitHub ekata push karanna (ho `npm i -g vercel && vercel --prod`)
2. Vercel > Add New Project > repo eka select karanna
   Framework Preset = Other, Build Command = (hari), Output Directory = public
3. Deploy. Custom domain: Project > Settings > Domains

## Aluth project ekak danna
1. api/pasiya-proxy.js eke APPS walata line ekak (prefix + origin)
2. public/index.html eke Projects section eke card ekak: href="/ee-nama"
3. Redeploy

## Google login (API site)
Google OAuth settings walata aluth domain eka authorized origin / redirect URI widiyata add karanna.

## PASIYA AI (/ai)
Chat & Code (projects + ZIP + bug fix), Image (generate/edit), Video (Veo)
Backend: api/ai-chat.js, api/ai-image.js, api/ai-video.js

Vercel > Settings > Environment Variables:
- GEMINI_API_KEY   (required)
- AI_MODEL         text/code model (default gemini-flash-lite-latest)
- IMAGE_MODEL      default gemini-2.5-flash-image
- VIDEO_MODEL      default veo-3.0-generate-001  (Google billing oni wenna puluwan)
- AI_MAX_TOKENS    optional (default 24000)
- AI_PASSCODE      optional access code (key eka anunta use karanna nowena widiyata)
Env wenas kalama Redeploy karanna.

## One login, one theme (API site + OFC site)
- Both sites use the SAME Firebase project (pasiya-api). The portfolio (`/`) and the API (`/api`) run on the same origin (the proxy), so a login on one is a login on the other.
  The portfolio menu has Log in / Register -> `/api/login?next=/` (proxy alias) and comes back to the portfolio after login.
- Opened the API directly on its workers.dev address? That is another origin (separate browser storage). Set `OFC_ORIGIN=https://yourdomain.com` in the Cloudflare worker variables:
  the menu/footer links then carry the login to the OFC site with a 5-minute Firebase custom token (`POST /api/auth/handoff`, needs FIREBASE_SERVICE_ACCOUNT_JSON).
- Profile photo (`.profile-photo`) and the tab icon follow the colour: `--logo-hue` per accent in palette.css (tune the degrees if the photo looks off), favicon is rebuilt in shell.js `updateFavicon()`.
- Theme: `public/_pasiya/palette.css` (8 accents: blue, purple, green, amber, red, pink, cyan, lime; the admin picks the DEFAULT one in Admin Panel > Default theme colour, stored in Firestore settings/theme, served by GET /api/theme; a visitor's own choice always wins). Chosen from the menu, saved as `pasiya_accent` in localStorage, shared by the portfolio, /api, /ai, /qr, /pastpapers, /bot.
- Shared menu/footer/login chip: `public/_pasiya/shell.js` + `shell.css` (same file is in the API repo as `public/shell.js`). Add social icons in the `SOCIAL` array at the top of shell.js.
- Firebase > Authentication > Settings > Authorized domains: add your Vercel domain (and the custom domain).

## Shared look on every site (shell v2)
`public/_pasiya/shell.js` + `shell.css` (same files are in the API repo: `public/shell.js`, `public/shell.css`) build, on EVERY site (OFC, API, QR, AI, Past Papers, Bot):
- animated background, top bar (P logo + site name + site tabs + Sri Lanka live time + music button + account), left menu (account, admin panel for admins, sites, music player, colour dots), footer (P logo + PASIYA OFC)
- the chosen colour (`pasiya_accent`), the song + position (`pasiya_mpos`) and the login are shared because everything runs on one domain
- Past Papers / Bot get it injected by `api/pasiya-proxy.js` (`inject()`); the API, QR, AI and portfolio pages load it themselves
- A change in `shell.js` / `shell.css` must be copied to BOTH repos (they are identical files)
