# PASIYA OFC (Vercel)

yourdomain.com             -> portfolio
yourdomain.com/api         -> PASIYA API   (theme eka match karala)
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
- AI_MODEL         text/code model (default gemini-2.5-flash) - latest model nama meka danna
- IMAGE_MODEL      default gemini-2.5-flash-image
- VIDEO_MODEL      default veo-3.0-generate-001  (Google billing oni wenna puluwan)
- AI_MAX_TOKENS    optional (default 24000)
- AI_PASSCODE      optional access code (key eka anunta use karanna nowena widiyata)
Env wenas kalama Redeploy karanna.
