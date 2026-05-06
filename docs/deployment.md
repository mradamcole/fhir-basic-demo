# Deployment Notes

FHIR Test Console is a client-only SPA. Build it with:

```bash
npm run build
```

Deploy the `dist/` directory to any static host such as GitHub Pages, Netlify, Vercel, S3 + CloudFront, or an internal web server.

## Live FHIR Server Requirements
- The server must be reachable from the browser.
- The server must allow CORS from the app origin.
- HTTPS is recommended for clipboard and credential handling behavior.

## Privacy and Security
- Passwords and bearer tokens are held in memory only.
- Non-secret profile details and request history are stored in browser localStorage.
- Authorization headers are sent only to the configured FHIR base URL.

## CSP Starting Point

```text
default-src 'self';
connect-src 'self' https: http://localhost:*;
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
```

Adjust `connect-src` for the customer FHIR endpoint.
