# TalentNest USER EXPERIENCE & FEATURE PLAYBOOK — Overview & Index

**Scope:** This playbook documents EXACTLY what every logged-in user sees and can do after authentication — every menu, page, section, table, filter, button, form, and workflow. It does **not** repeat business vision, architecture, database, or API documentation (see the main [Product-Bible](../../MASTER_INDEX.md) for those).

**Method:** Derived from `src/layout/Layout.jsx` (NAVS — the actual sidebar config per role), `src/App.jsx` (route → component mapping), and direct audit of each page component under `src/pages/`. Only features that exist in code are documented. Anything not found is marked `NOT FOUND IN CODE`.

**Roles audited** (from `NAVS` in `Layout.jsx` + role-resolution logic):

| Role key (`user.role`) | Sidebar nav key (`rk`) | Playbook doc |
|---|---|---|
| `candidate` | `candidate` | [01-candidate.md](01-candidate.md) |
| `recruiter` | `recruiter` | [02-recruiter.md](02-recruiter.md) |
| `admin` (org admin, `tenantType !== 'college'`) | `admin` | [03-admin.md](03-admin.md) |
| `super_admin` | `superadmin` | [04-superadmin.md](04-superadmin.md) |
| `client` | `client` | [05-client.md](05-client.md) |
| `admin` or `placement_officer` (`tenantType === 'college'`) | `college` | [06-college.md](06-college.md) |
| `hiring_manager` | `hiring_manager` | [07-hiring-manager.md](07-hiring-manager.md) |

**Role resolution logic** (`Layout.jsx:1003`):
```js
const rk = user.role === 'super_admin' ? 'superadmin'
  : ((user.role === 'admin' || user.role === 'placement_officer') && user.tenantType === 'college') ? 'college'
  : user.role;
```
So a college-tenant `admin` or `placement_officer` sees the **college** sidebar, not the standard admin/HR sidebar — even though their stored `role` is `admin`/`placement_officer`.

## Shared elements (every role)

These exist outside the per-role nav and appear for ALL logged-in users — documented once here, not repeated per role:

- **Sidebar header**: org logo (`Logo` component, `customLogoUrl` from `LogoContext`/org branding), role label (uppercased `user.role`), Notification Bell, Messages icon (unread badge), "Who's Online" icon.
- **Notification Bell** (`NotificationBell` in `Layout.jsx:101-749`): dropdown panel with Unread/All tabs, per-notification type icons/labels (application, stage_update, interview, offer, system, assessment, job_approved/rejected, job_approval_request, job_assignment, invite_interested, invite, mention, task), "Mark all read", "Clear all", detail drill-down modal with "View Details →" deep-linking, admin/super-admin get a "🔄 Refresh" that rebuilds a live feed (recent applications + smart alerts: pending offers, stuck candidates, stale jobs) or regenerates a platform summary (super admin). Candidate sees a "⚙️ Settings" shortcut to `/app/settings/notifications`. Browser tab title shows unread count.
- **Messages icon**: opens `ChatPanel` (lazy-loaded), unread badge polled every 20s via `getUnreadMessageCount`.
- **Who's Online icon**: opens `OnlinePanel`, lets user start a chat with an online user.
- **Theme switcher**: Light / Dark / Ocean ("mixed"), persisted via `MarketingThemeContext`, switchable from sidebar footer (icon buttons) or profile menu (cycles).
- **Profile menu** (click avatar/name in sidebar footer): "My Profile" (`/app/profile`), "Change Password" (modal), "Email Settings" (modal — hidden for `candidate` role), Theme toggle, "Sign Out".
- **Impersonation banner** (`ImpersonationBanner`, `Layout.jsx:904-999`): shown only when a Super Admin is impersonating another user (detected via JWT `originalUserId` claim + `tn_sa_backup` sessionStorage flag). Shows "Impersonating: <name> <ROLE>" with a red "✕ Exit Impersonation" button that calls `stopImpersonate()` and redirects to `/app/security`.
- **Offline banner**: red bar "Connection Lost. You are currently offline. Changes may not be saved." — shown via `navigator.onLine` listener.
- **Trial banner** (admin only): "⏰ N days left in your trial" + "Upgrade now →" button (dispatches nav to billing), shown when `getBillingUsage().plan === 'trial'`.
- **Mobile**: hamburger menu (☰) opens slide-out sidebar; top bar duplicates Notification Bell, Messages, Online, Sign Out, and an online/offline status dot.
- **QuickActionMenu** (`src/components/ui/QuickActionMenu.jsx`) — floating quick-action button, role-aware (see per-role docs for what it offers).
- **CallManager** — handles incoming/outgoing voice/video call UI globally.
- **BroadcastBanner** — platform-wide announcement banner, role-targeted.
- **Real-time sync**: `usePlatformSocket` listens for tenant-wide stage-change events and dispatches `tn:stageChanged`, which the Notification Bell listens for to refresh + flash.

## Common page-level patterns referenced across role docs

- **PageLoader / Skeleton**: every lazy-loaded page shows a skeleton (title bar + 3 cards + table placeholder) while loading.
- **`tn_nav` custom event**: some buttons (e.g. trial "Upgrade now") dispatch `window.dispatchEvent(new CustomEvent('tn_nav', {detail: 'billing'}))` to trigger in-app navigation without a full route change.
- **Export pattern**: "⬇ Export" buttons use `downloadBlob()` (`src/api/client.js`) for authenticated Excel/CSV downloads.

---

Continue to: [Candidate](01-candidate.md) · [Recruiter](02-recruiter.md) · [Admin](03-admin.md) · [Super Admin](04-superadmin.md) · [Client](05-client.md) · [College](06-college.md) · [Hiring Manager](07-hiring-manager.md) · [Master Inventory Table](99-master-inventory.md)
