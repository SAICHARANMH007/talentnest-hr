# SPF DNS Record Setup for talentnesthr.com

## What is an SPF Record?

An SPF (Sender Policy Framework) record tells email servers which servers are
authorised to send email on behalf of your domain. Without it, your emails may
land in spam or be rejected entirely.

---

## The SPF Record to Add

Copy the following value **exactly** and add it as a **TXT record** in your DNS provider:

```
v=spf1 include:sendgrid.net include:_spf.resend.com ~all
```

> If you use Resend only (not SendGrid), use:
> ```
> v=spf1 include:_spf.resend.com ~all
> ```

---

## How to Add It (Step by Step)

1. Log in to your domain registrar or DNS provider (e.g. GoDaddy, Cloudflare,
   Namecheap, Google Domains)
2. Navigate to **DNS Management** or **DNS Records** for `talentnesthr.com`
3. Click **Add Record** or **+ New Record**
4. Fill in the fields:

| Field      | Value                                        |
|------------|----------------------------------------------|
| **Type**   | `TXT`                                        |
| **Name / Host** | `@` (represents the root domain)        |
| **Value / Content** | `v=spf1 include:_spf.resend.com ~all` |
| **TTL**    | `3600` (1 hour) or leave as default          |

5. Save the record
6. Wait up to 24–48 hours for DNS propagation

---

## Notes

- You can only have **one SPF TXT record** on your root domain (`@`). If one
  already exists, edit it — do not add a second one.
- The `~all` at the end means "soft fail" (emails from other servers are marked
  suspicious but not rejected). Use `-all` for strict rejection once you have
  confirmed all sending sources are included.
- Since the backend uses **Resend** (`RESEND_API_KEY`), `include:_spf.resend.com`
  is the primary entry needed.

---

## Verify After Setup

Use a free tool to confirm the record is live:
- https://mxtoolbox.com/spf.aspx
- Enter `talentnesthr.com` and click **SPF Lookup**

A healthy result will show `v=spf1 ... ~all` with no errors.
