# Security

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately
through GitHub's **Report a vulnerability** button on the repository's
Security tab, with steps to reproduce. We aim to reply within a week.

## Secrets

- Cloudflare R2 keys live only in `.env`, which is git-ignored. Use an R2 API
  token scoped to **Object Read & Write** on the one bucket the pictures use.
- If a key is ever committed or shared, revoke it in the Cloudflare dashboard
  straight away and create a new one.
- Only variables prefixed `WAKU_PUBLIC_` reach the browser; never give a secret
  that prefix.
