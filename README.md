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
