# Admin Video Service - Query Builder Documentation

## Overview

The `get_all_videos_admin()` function fetches videos for the admin panel with **flexible filtering, searching, sorting, and pagination**. It uses a **query builder pattern** to construct SQL queries dynamically based on user input.

---

## Function Signature
```python
def get_all_videos_admin(
    db: Session,
    skip: int = 0,              # Pagination: records to skip
    limit: int = 20,            # Pagination: records to fetch
    status: Optional[str] = None,               # Filter: "draft", "published", "archived"
    processing_status: Optional[str] = None,    # Filter: "queued", "completed", "failed", etc.
    search: Optional[str] = None,               # Search: title or description
    user_id: Optional[str] = None,              # Filter: by uploader
    sort_by: str = "created_at",                # Sort column
    sort_order: str = "desc"                    # Sort direction: "asc" or "desc"
) -> Tuple[List[Video], int]:
    # Returns: (list of videos, total count)
```

---

## How It Works: Step-by-Step

### 1️⃣ **Start Query with Eager Loading**
```python
query = db.query(Video).options(joinedload(Video.user))
```
- Fetches videos AND their related user data in **one query**
- Prevents N+1 problem (avoids extra queries for each video's user)

**SQL Generated:**
```sql
SELECT videos.*, users.* 
FROM videos 
LEFT JOIN users ON videos.user_id = users.id
```

---

### 2️⃣ **Apply Filters (Conditionally)**
Only adds filters if the parameter is provided.
```python
if status:
    query = query.filter(Video.status == status)
```

**Example:**
```python
# User provides: status="published"
# SQL: WHERE status = 'published'

# User provides: status="published" AND processing_status="completed"
# SQL: WHERE status = 'published' AND processing_status = 'completed'
```

---

### 3️⃣ **Search (Case-Insensitive)**
```python
if search:
    search_pattern = f"%{search}%"
    query = query.filter(
        or_(
            Video.title.ilike(search_pattern),
            Video.description.ilike(search_pattern)
        )
    )
```

**What it does:**
- `%pattern%` = SQL wildcard (matches anywhere in text)
- `ilike()` = case-insensitive LIKE
- `or_()` = searches in BOTH title AND description

**Example:**
```python
search = "django"
# Finds: "Django Tutorial", "Learn django", "DJANGO basics"
```

**SQL Generated:**
```sql
WHERE (title ILIKE '%django%' OR description ILIKE '%django%')
```

---

### 4️⃣ **Count Total BEFORE Pagination**
```python
total = query.count()
```

**⚠️ IMPORTANT:** Count happens **before** `.limit()` to get the true total.
```python
# At this point:
# - All filters applied ✅
# - NO pagination yet ✅
# - Counts ALL matching videos (e.g., 10,000)

total = query.count()  # Returns 10,000

# THEN apply pagination
query = query.limit(20)  # Only fetch 20
```

---

### 5️⃣ **Dynamic Sorting**
```python
sort_column = getattr(Video, sort_by, Video.created_at)
if sort_order == "asc":
    query = query.order_by(asc(sort_column))
else:
    query = query.order_by(desc(sort_column))
```

**What `getattr()` does:**
- Dynamically accesses model attributes by name (string)
- Falls back to `created_at` if invalid field provided

**Examples:**
```python
# Sort by views (descending)
sort_by = "views_count", sort_order = "desc"
# SQL: ORDER BY views_count DESC

# Sort by title (ascending)
sort_by = "title", sort_order = "asc"
# SQL: ORDER BY title ASC

# Invalid field (uses fallback)
sort_by = "invalid_field"
# SQL: ORDER BY created_at DESC
```

---

### 6️⃣ **Apply Pagination**
```python
videos = query.offset(skip).limit(limit).all()
```

**How pagination works:**
```python
# Page 1: skip=0, limit=20
# SQL: OFFSET 0 LIMIT 20  → Videos 1-20

# Page 2: skip=20, limit=20
# SQL: OFFSET 20 LIMIT 20  → Videos 21-40

# Page 3: skip=40, limit=20
# SQL: OFFSET 40 LIMIT 20  → Videos 41-60
```

**Formula:**
```python
skip = (page - 1) * limit
```

---

### 7️⃣ **Attach User Info to Videos**
```python
for video in videos:
    if video.user:
        video.user_email = video.user.email
        video.user_username = video.user.username
```

**Why?**
- Makes serialization easier
- Schema expects flat fields (`user_email`), not nested (`user.email`)

---

### 8️⃣ **Return Results**
```python
return videos, total
```

Returns **two values**:
- `videos`: List of Video objects (max = limit)
- `total`: Total matching videos in DB (for pagination UI)

---

## Usage Examples

### Example 1: Basic Pagination
```python
videos, total = video_service.get_all_videos_admin(
    db=db,
    skip=0,
    limit=20
)
# Returns: First 20 videos, total count of all videos
```

### Example 2: Filter + Search
```python
videos, total = video_service.get_all_videos_admin(
    db=db,
    skip=0,
    limit=20,
    status="published",
    search="tutorial"
)
# Returns: Published videos with "tutorial" in title/description
```

### Example 3: Full Query
```python
videos, total = video_service.get_all_videos_admin(
    db=db,
    skip=40,              # Page 3
    limit=20,
    status="published",
    processing_status="completed",
    search="python",
    sort_by="views_count",
    sort_order="desc"
)
# Returns: Videos 41-60 that are:
# - Published
# - Processing completed
# - Contain "python" in title/description
# - Sorted by views (highest first)
```

---

## Complete SQL Example

**Request:**
```
GET /api/admin/videos?skip=20&limit=10&status=published&search=cat&sort_by=views_count&sort_order=desc
```

**Generated SQL:**
```sql
SELECT videos.*, users.*
FROM videos
LEFT JOIN users ON videos.user_id = users.id
WHERE status = 'published'
  AND (title ILIKE '%cat%' OR description ILIKE '%cat%')
ORDER BY views_count DESC
OFFSET 20 LIMIT 10;
```

**Count Query (runs separately):**
```sql
SELECT COUNT(*)
FROM videos
WHERE status = 'published'
  AND (title ILIKE '%cat%' OR description ILIKE '%cat%');
```

---

## Key Concepts Reference

| Concept | What It Does |
|---------|-------------|
| **Query Chaining** | Build queries step-by-step: each `.filter()` adds to WHERE clause |
| **`joinedload()`** | Eager load relationships (prevents N+1 queries) |
| **`or_()`** | Combine conditions with OR logic |
| **`ilike()`** | Case-insensitive LIKE search |
| **`%pattern%`** | SQL wildcard (matches anywhere) |
| **`getattr()`** | Dynamic attribute access by name |
| **`.count()`** | Count BEFORE pagination for true total |
| **`.offset().limit()`** | Implement pagination (skip N, take M) |
| **Tuple return** | Return both data AND metadata |

---

## Common Patterns

### Pattern 1: Add New Filter
```python
# Add a new filter for age rating
if age_rating:
    query = query.filter(Video.age_rating == age_rating)
```

### Pattern 2: Add Date Range Filter
```python
if start_date and end_date:
    query = query.filter(
        Video.created_at >= start_date,
        Video.created_at <= end_date
    )
```

### Pattern 3: Multi-Field Search
```python
if search:
    search_pattern = f"%{search}%"
    query = query.filter(
        or_(
            Video.title.ilike(search_pattern),
            Video.description.ilike(search_pattern),
            Video.director.ilike(search_pattern)  # ← Add more fields
        )
    )
```

---

## Performance Tips

✅ **DO:**
- Count BEFORE pagination
- Use `joinedload()` for relationships you'll always access
- Add database indexes on frequently filtered/sorted columns

❌ **DON'T:**
- Don't call `.all()` without `.limit()` (can load millions of records)
- Don't count after pagination (gives wrong total)
- Don't access relationships without `joinedload()` in loops (N+1 problem)

---

## Debugging Tips

**Print the SQL query:**
```python
from sqlalchemy import inspect
print(query.statement.compile(compile_kwargs={"literal_binds": True}))
```

**Check query execution time:**
```python
import time
start = time.time()
videos = query.all()
print(f"Query took {time.time() - start:.2f}s")
```

---

## Quick Reference: Page Calculation
```python
# Given page number (1-based)
page = 2
skip = (page - 1) * limit  # (2-1) * 20 = 20

# Calculate total pages
total_pages = math.ceil(total / limit)  # ceil(150 / 20) = 8

# Check if more pages exist
has_more = skip + limit < total  # 20 + 20 < 150 = True
```

---

**Last Updated:** January 2026  
**Related Files:**
- Service: `/backend/app/services/video_service.py`
- Route: `/backend/app/apis/routes/admin.py`
- Schema: `/backend/app/schemas/video.py`