# 10 — Frontend: Admin Panel

The home feed and watch page are for viewers. The admin panel is where the people managing the platform live. This document covers the admin panel's structure, what's actually wired up to the backend, and where the gaps are.

---

## Access Control

The admin panel lives at `/admin`. The admin layout (`app/(protected)/admin/layout.tsx`) checks the authenticated user's role and **redirects non-admins to `/home`**. This is enforced on the client side in the layout component:

```typescript
export default function AdminLayout({ children }) {
  const { user } = useAuthStore()
  
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      redirect('/home')
    }
  }, [user])
  
  return <AdminSidebarLayout>{children}</AdminSidebarLayout>
}
```

This is client-side enforcement only. The backend API endpoints for admin operations (`GET /videos/list-all`, etc.) also require `role = ADMIN` via the `get_current_admin_user` dependency, so a malicious user can't bypass this by calling the API directly.

---

## Admin Panel Routes

```
/admin              → Dashboard overview
/admin/videos       → Video management
/admin/users        → User management
/admin/analytics    → Analytics (UI mock)
/admin/categories   → Category management (UI mock)
/admin/settings     → Platform settings (UI mock)
```

---

## Admin Dashboard

**`app/(protected)/admin/page.tsx`**

The dashboard shows overview stats (total videos, total users, videos processing, etc.) and quick navigation cards to each admin section. Currently uses mock data for the stats. Real numbers would need `GET /videos/list-all` with aggregation or a separate analytics endpoint.

---

## Video Management

**`app/(protected)/admin/videos/page.tsx`**

This is the most functional admin page. It displays all videos with their processing status, upload dates, view counts, and controls to manage them.

The page calls `GET /videos/list-all` (admin only) which returns paginated videos with full metadata including processing status. This is one of the few admin pages wired to the real API.

Features:
- **List/table view** of all videos with status badges (queued, transcoding, completed, failed)
- **Search** by title
- **Filter** by processing status
- **Sort** by date or views
- **Pagination** controls
- **Delete** button per video

The delete action calls `DELETE /videos/by-id/{video_id}` — but note the known bug in the delete endpoint (it references a non-existent `video.video_url` field). The button will trigger a 500 error from the backend until that's fixed.

The video management page also has a link to the video upload form at `/admin/videos/upload`.

---

## Admin Header

**`app/(protected)/admin/_components/AdminHeader.tsx`**

The top navigation bar for the admin panel. The full version was planned with a search bar and notification bell, but both are currently commented out. The header essentially renders only the app logo/title and the logged-in user's name. It's a working shell waiting to be filled in.

---

## User Management

**`app/(protected)/admin/users/page.tsx`**

Shows a table of all registered users with their email, username, role, verification status, and join date. Has controls for:
- Searching by email or username
- Filtering by role (admin/user)
- Suspending/activating accounts

The backend for user management operations (list users, update role, suspend account) needs to be confirmed — the endpoints may exist but the frontend wiring is incomplete for the write operations. The `GET /users/` endpoint for listing all users is not documented in the current route files (only `GET /user/profile` exists). This likely needs a new admin users endpoint on the backend.

---

## Analytics Page

**`app/(protected)/admin/analytics/page.tsx`**

A fully designed analytics dashboard with charts showing:
- Views over time (line chart)
- Views by category (pie chart)
- Top videos by view count
- User growth

Everything is hardcoded mock data. There are no backend analytics endpoints. Wiring this up would require either:
1. Adding analytics aggregation queries to the backend (simple: `GROUP BY` on the videos table)
2. Adding a dedicated analytics service (more complex: storing events as they happen for real-time dashboards)

---

## Categories Management

**`app/(protected)/admin/categories/page.tsx`**

A table view for managing video categories with controls to add, edit, and delete categories. Currently a UI mock — categories are hardcoded strings in the video model, not a database table. Implementing this properly would require:
1. A backend `categories` table with name, slug, and description
2. CRUD API endpoints
3. Updating the video creation schema to reference category IDs instead of strings

---

## Settings Page

**`app/(protected)/admin/settings/page.tsx`**

Shows platform configuration settings: site name, default age rating, processing quality settings, email configuration. All fields are editable in the UI but no save operation is wired to the backend. This is pure placeholder UI.

---

## Admin Sidebar

**`app/(protected)/admin/_components/AdminSidebar.tsx`**

The left navigation for the admin panel. Links to all admin sections. The sidebar is collapsible (toggle button in the header). Currently always expanded. The active section is highlighted based on the current route.

---

## What's Real vs. What's Mock

| Feature | Status |
|---------|--------|
| Role-based redirect (non-admins → /home) | ✅ Working |
| Video list (`GET /videos/list-all`) | ✅ Working |
| Video delete | ⚠️ Has bug (video_url → raw_video_path) |
| Dashboard stats | ❌ Mock data |
| User management table | ❌ Mock data (no list-users endpoint) |
| Analytics charts | ❌ Mock data |
| Categories CRUD | ❌ Mock (no backend table) |
| Settings save | ❌ No API call |

---

## Future Upgrades

- **Admin user management API** — `GET /admin/users` with filtering and pagination; `PUT /admin/users/{id}` to update role or active status
- **Real analytics** — start with simple DB aggregations on the videos table; graduate to event streaming for real-time dashboards
- **Categories as proper entities** — database table, CRUD endpoints, frontend integration
- **Bulk operations** — select multiple videos to delete, publish, or archive at once
- **Processing queue view** — show which videos are currently being processed and their stage
- **Audit log** — track admin actions (who deleted what, when)

---

## What's Next

The admin panel is how content gets managed. The video upload form is how content gets created. The next document focuses on the upload flow from the admin's perspective — the upload form component, how it submits to the API, and the real-time progress tracking that follows.
