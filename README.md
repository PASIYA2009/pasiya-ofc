# PASIYA OFC (Cloudflare Worker)

yourdomain.com             -> portfolio
yourdomain.com/api         -> PASIYA API   (theme eka match karala)
yourdomain.com/pastpapers  -> Past Papers
yourdomain.com/bot         -> WhatsApp Bot
yourdomain.com/qr          -> QR Editor

## Deploy
1. npm i -g wrangler && wrangler login
2. wrangler deploy
3. Custom domain: Cloudflare > Workers > pasiya-ofc > Settings > Domains

## Aluth project ekak danna
1. src/worker.js eke APPS walata line ekak (prefix + origin)
2. public/index.html eke Projects section eke card ekak: href="/ee-nama"
3. wrangler deploy

## Origin link eka hariyata hide karanna
wrangler.jsonc eke `services` uncomment karanna. Ee workers walata "workers_dev": false dala deploy karanna.
(Railway / lumi.ing wage ewa Cloudflare walin eliyen thiyena nisa eke link eka off karanna bari.)

## Google login (API site)
Google OAuth settings walata aluth domain eka authorized origin / redirect URI widiyata add karanna.
