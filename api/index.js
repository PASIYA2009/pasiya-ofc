// PASIYA API router - the single Vercel Function for every /api/* endpoint.
// vercel.json rewrites /api/:path* here (the original URL is kept). Files in api/ with their own name
// (ai-chat.js, qr-upload.js) are matched first by Vercel, so they keep working.
import router from '../system/router.js';

export default {
  fetch(request) {
    return router.fetch(request, process.env);
  }
};
