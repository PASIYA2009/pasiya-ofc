# PASIYA (one site, one Vercel project)

```
yourdomain.com             -> portfolio                (public/index.html)
yourdomain.com/api         -> PASIYA API dashboard     (public/api-site/index.html)
yourdomain.com/api/login   -> API login                (public/api-site/login.html)
yourdomain.com/api/register-> API register
yourdomain.com/api/*       -> API endpoints            (api/index.js -> system/router.js -> scrapers/*)
yourdomain.com/qr  /ai  /bot  /music-admin             (own pages in public/)
yourdomain.com/pastpapers  -> redirects to https://pastpaper-pro.vercel.app
```

The old separate API server (Cloudflare Worker) and the proxy (`api/pasiya-proxy.js`) are gone: the API now runs as a Vercel Function inside this project, so login, theme, music and the shell are on one origin with no proxying.

## Layout
- `system/`   platform (auth, coins, gateway, registry, status)   - `scrapers/` one file per service
- `api/index.js` the API function, `api/ai-chat.js` + `api/qr-upload.js` edge functions
- `public/_pasiya/` shared shell/theme used by every page, `public/api-site/` API dashboard pages
- `firebase/firestore.rules`, `test/` (`npm test`, offline)

## Deploy
1. Push this folder to GitHub, Vercel > Add New Project (Framework Preset = Other, Output Directory = public).
2. Vercel > Settings > Environment Variables: everything in `.env.example` you need. Required: `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_EMAIL`. Redeploy after changes.
3. Firebase Console > Authentication > Settings > Authorized domains: add your Vercel + custom domain.
4. Check `https://yourdomain.com/api/health`.

## Add a new scraper
1. `scrapers/mysite.js` -> `export default [{ path, category, name, cost, desc, params, run }]`
2. one `import` + add to `ALL` in `system/registry.js`. Docs, test forms, coin charging, rate limits are automatic.

Notes: cache / rate limit are per function instance memory. YouTube etc. may block datacenter IPs (see API notes below). `maxDuration` for the API function is 60s (`vercel.json`).

---
# API notes / changelog (from the old API README)
## Runtime notes (written for Cloudflare, still valid; hosting is now Vercel)
- The API runs as a Cloudflare Worker and serves the dashboard with Workers Static Assets.
- Cloudflare Workers AI binding → REST (`CF_ACCOUNT_ID` + `CF_API_TOKEN`, free). Without it, set any of Gemini / OpenRouter / Groq / DeepSeek keys.
- Cache and rate-limit are per server instance memory (Cloudflare Cache API doesn't exist on Cloudflare Workers). Fine for this size; use Upstash/Cloudflare Workers KV later if you need global limits.
- **No keys needed now:** AI falls back to the free public Pollinations service; video downloads (YouTube / TikTok / Facebook / Instagram) return direct links from the platforms' public data. Real keys, when set, are tried first.
- Downloads are best effort (sites change; YouTube may refuse Cloudflare Workers's datacenter IPs). For maximum reliability host the separate yt-dlp service (`pasiya-scraper-api`) and set `SCRAPER_URL` + `SCRAPER_SHARED_SECRET`: it then answers the download endpoints instead.
- `maxDuration` is 30s in `vercel.json` (Hobby allows up to 60).

## v4.3
- **Redeploy no longer wipes your variables:** `wrangler.jsonc` now has `"keep_vars": true` and no placeholder values (a name listed in `vars` overrides the dashboard). Add keys in the dashboard as **Secret** type and they always survive.
- **YouTube MP4 / MP3 / HD:** when YouTube blocks the Cloudflare IP, the API now tries public Piped / Invidious mirrors, then your `COBALT_API_URL`, then an Apify downloader actor (needs `APIFY_TOKEN`, override with `YT_APIFY_ACTOR`) before giving up.
- **Apify:** with `APIFY_TOKEN` set, Instagram (profile / posts / reels / hashtag), TikTok profile / comments, Facebook posts and X use Apify FIRST (free sources are the backup). Apify wait time raised from 22 s to 55 s.
- Test: `node test/fallback.mjs`.

## v4.2
- **Social APIs work with no key:** YouTube search + comments, Reddit search, TikTok profile, Instagram profile / posts / reels, X profile tweets and Facebook page now use free public data first (Apify is only a backup when `APIFY_TOKEN` is set). TikTok search / hashtag / comments now use the free tikwm.com public API, and X search, Instagram hashtag and Facebook posts use Bing / DuckDuckGo (`site:` search, public indexed posts only). Instagram Comments was removed (no free source exists). YouTube and Reddit also fall back to public Piped / Invidious / PullPush mirrors when blocked. Instagram / X / TikTok sometimes refuse datacenter IPs; the admin *Run health check* shows which ones work on your Cloudflare Workers.
- **Music:** the 5 built-in songs are removed. The default is now one song (`https://youtu.be/-LDyd-Cba0A`). **Admin Panel > Background music**: paste any YouTube link + *Add song*, or *Remove* a song. Saved in Firestore `settings/music`; public list at `GET /api/music`; visitors pick up changes within ~30 s.

- **Removed (feeds were dead):** Tech (SL) TecRoom, Roar, TechKatha, Android Wedakarayo and News: Live @ SL.
- **Social fallbacks:** when Reddit / X / Instagram / TikTok refuse the Cloudflare Workers server (403 / 429), every Social API now falls back to a Bing / DuckDuckGo `site:` search (title + link + snippet of public posts) instead of failing.
- **Real test links:** the example links in the API docs / health check are now real public ones (TikTok `@scout2015`, Instagram `/p/fA9uwTtkSN/`, Facebook video, Pinterest pin, X `jack/status/20`) instead of fake ids. APIs that need your own file link or mailbox id (MediaFire, Google Drive, Pixeldrain, Tempmail mailbox / message) show *Not tested* in the health check.
- Reddit and X Profile also try public relay services (allorigins / r.jina.ai) when the server is blocked.
- **Status:** two new cards, **RAM** (memory used out of the function's limit) and **CPU** (% used + cores + load) of the server instance answering the request. They refresh with the other status cards.

## v4.1
- **Tempmail:** Guerrilla Mail is now tried first (mail.tm / mail.gw as backup). Same 3 endpoints, same `id` flow; an expired Guerrilla session is rebuilt automatically.
- **Switched-off APIs vanish for users:** the catalog is no longer cached, the server flag cache is 8 s, and the dashboard re-reads the API list every 30 s (and when the tab opens), so users no longer need to reload. A failed refresh keeps the current list.
- **Fix:** Admin > API manager: switching an API on/off no longer scrolls the page to the bottom (the list is no longer rebuilt on a toggle; scroll positions are kept when it is).
- **AI:** 9 more providers from free-ai-apis (Hugging Face, SambaNova, Together, Fireworks, DeepInfra, Hyperbolic, Novita, Cohere, AIML) join every model chain when their key is set. New: `/api/ai/translate` (keyless), `/api/ai/search` (Tavily key).
- **Social:** 16 `/api/social/*` endpoints (TikTok, Instagram, X, YouTube, Facebook, Reddit) powered by Apify actors from social-media-apis. Appear only when `APIFY_TOKEN` is set.

## v4.0 (fix release)
- **AI:** official-provider chain now also has Cerebras, Mistral, GitHub Models and Anthropic; Pollinations is last and its 45 s limit is remembered (no more 14 s timeouts). Set free keys (see `.env.example`). chatgpt.com / claude.ai themselves have no public API, so they are NOT scraped: official free APIs are the reliable way.
- **News:** each site tries its own feed + common alternate paths, then Google News (Sinhala + English, 7 days), then Bing News.
- **Web Search:** Brave (key) -> Bing RSS -> DuckDuckGo. **Tempmail:** mail.tm with mail.gw fallback. **YouTube DL:** 3 app clients + optional cobalt (`COBALT_API_URL`).
- Health check timeout 25 s. Tests: `node test/run.mjs` and `node test/fixes.mjs`.
- "NEEDS REAL INPUT" is normal: the example link in the test is fake, so that API is not proven broken.

## v3.9
- **Admin Panel > Feature switches:** turn the Daily claim and the Lucky Spin on/off for everyone (stored in Firestore `settings/features`). They are shown ONLY to signed-in normal users: guests and admins never see them (the server blocks them too).
- **Admin Panel > API manager:** *Run health check* tests every API from the live server (Cloudflare Workers) in small batches; *Switch off failed* hides the broken ones from the catalog (they answer 503). Every API also has its own on/off switch. Admins can still test switched-off APIs.
- **Removed:** `/api/thenux-ai`, `/api/twitter_v2`.
- **New:** `/api/video/hd` (best-quality links + every quality, with the "send as Document, not as Status" WhatsApp tip), `/api/tools/qr`, `/api/tools/ip`.
- **Mobile:** the menu is now a hamburger button (top right) that slides a drawer in from the right. Smaller logo + name in the bar.
- **Music:** 5 background songs with Play/Pause, Next and Previous in the menu. Browsers only allow sound after the first tap or click, so autoplay starts on the first touch. Pausing is remembered on that device.
- Not built on purpose: sinhalasub.lk (full movies / episodes = piracy), same rule as the other pirated sites below.

## v3.4: 14 more AI endpoints (ChatGPT, DeepSeek, Gemma, Kimi, GLM, MiniMax, Coder, BlackBox, Answer Engine, Quick Answers, NoteGPT, Sinhala Assistant, Flux image, Nano Banana). Model ids can be overridden with MODEL_* env vars.

## v3.5: scrapers/more_dl.js adds YouTube MP4/MP3/Thumbnail DL, TikTok/Facebook/Instagram/Pinterest DL, Twitter (X) video, Pixeldrain, Spotify info.

## v3.3 changes
- **Key system stays:** every API needs the user's PASIYA key (dashboard shows it). "Keyless" now only means the APIs use public sources and need **no third-party keys**. `ALLOW_KEYLESS=1` (optional) lets anonymous callers use free APIs.
- **Admin fix:** `ADMIN_EMAIL` is trimmed, case-insensitive, accepts a comma list, ignores Gmail dots/+tags. Admin also needs a *verified* e-mail (Google login is always verified). `/api/config` shows `adminConfigured`.
- **Pages:** `/login` (username or e-mail, Google) and `/register` (username, e-mail, confirm password, `SIGNUP_COINS` bonus). No GitHub, no Cloudflare check.
- **Endpoints:** `scrapers/newsfeeds.js` (36 news sites + all-in-one), `search.js`, `utility.js`, `extras.js` (F-Droid APK, Internet Archive music, TikTok public avatar, Wikimedia live wallpapers, Web2Zip).
- **Status:** the dashboard now has a **USERS** card (registered accounts, cached 60 s).
- Not built on purpose: WhatsApp channel reacts (spam / engagement faking), WhatsApp DP saver (privacy), pirated APK / MP3 sites.

## One login with the OFC site (Vercel)
- `public/shell.js` + `shell.css` + `palette.css` give the same menu, footer and 4-colour theme as the OFC site.
- Set `OFC_ORIGIN` (Cloudflare > Settings > Variables) to the OFC site address so a user who opened this worker directly is carried to the OFC site already logged in (`POST /api/auth/handoff`).
- `/login?next=/path` returns to a same-site path after login.


---
# OFC notes
## PASIYA AI (/ai)
Chat & Code (projects + ZIP + bug fix)

Vercel > Settings > Environment Variables:
- GEMINI_API_KEY   (required)
- AI_MODEL         text/code model (default gemini-flash-lite-latest)
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
- every page (portfolio, /api, QR, AI, Bot) loads it itself; Past Papers opens directly
- A change in `shell.js` / `shell.css` must be copied to BOTH repos (they are identical files)


## WhatsApp Bot / Pair web (/bot)
- Pair web eka dan site eka athule: `public/bot/index.html` (proxy ekak nathuwa).
- `public/bot/config.js` eke `PASIYA_API_BASES` walata bot servers deke public URL dekama danna (Hostless first, Altare second).
- Bot servers dekema `WEB_ORIGINS` walata me site eke origin eka (https://yourdomain.com) add karanna.

## Background music (/music)
mp3 files -> `public/music/`, then list them in `public/music/tracks.json` (see README.txt there). They play through a normal <audio> element, so they keep playing in the background. Empty list = YouTube playlist from /api/music (YouTube embeds are paused by phones in the background).

## Music admin (/music-admin)
Admin-only page: upload mp3 to GitHub (`public/music`), switch songs ON/OFF, reorder, delete. Needs a GitHub fine-grained token (Contents: Read and write) typed once on that page (kept only in that browser). The site updates after Vercel redeploys.


---
# v6 changes (design + SEO)
- **One brand colour, Dark / Light only.** Colour dots removed; toggle in the top bar + menu (`localStorage pasiya_theme`). Admin "default theme colour" no longer has any effect.
- **Shared design layer:** `public/_pasiya/pro.css` + `pro.js` load on every page (tokens for light mode, dot grid, spotlight cards, tilt via `data-tilt`).
- **Home:** React 18 (cdnjs UMD, no build) *API Explorer* section: `public/home-react.js` reads `/api/catalog`. Static fallback if React/API is unavailable.
- **Past Papers:** `/pastpapers` is now an in-site page that links to https://pastpaper-pro.vercel.app (redirect removed).
- **SEO restored:** `robots.txt`, full `sitemap.xml`, canonical/og/twitter/keywords + JSON-LD on `/`, per-page meta on all pages, `noindex` on login/register/music-admin.
