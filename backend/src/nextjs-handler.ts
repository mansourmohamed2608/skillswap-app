import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import express from 'express';

setGlobalOptions({ region: 'europe-west3' });

const app = express();

// Serve Next.js app - return base HTML for all non-API routes
// Firebase Hosting will serve static files first, then rewrite to this function for routes
app.use((req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found' });
  }

  // Return minimal HTML that can be served as the app
  // This HTML should load the Next.js client-side app
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="SkillSwap - Share your skills, learn new ones" />
    <title>SkillSwap</title>
</head>
<body>
    <div id="__next"></div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(html);
});

export const nextjs = onRequest({ timeoutSeconds: 60 }, app);
