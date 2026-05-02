# Notification System Design
## Stage 1
### Core Actions the Notification Platform Should Support
- Send a notification to a student
- Fetch all notifications for a logged-in student
- Fetch unread notifications for a student
- Mark a notification as read
- Mark all notifications as read
- Delete a notification
### REST API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications/:studentId | Get notifications for a student |
| GET | /api/notifications/:studentId/unread | Get only unread notifications |
| POST | /api/notifications | Create and send notification |
| PATCH | /api/notifications/:notificationId/read | Mark one as read |
| PATCH | /api/notifications/:studentId/read-all | Mark all as read |
| DELETE | /api/notifications/:notificationId | Delete a notification |
### Request & Response Structures
#### GET /api/notifications/:studentId
Response:
```json
{
  "studentId": "12345",
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "Afford hiring drive on May 2",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ]
}
```
#### POST /api/notifications
Request:
```json
{
  "studentId": "12345",
  "type": "Placement",
  "message": "Afford hiring drive on May 2"
}
```
Response:
```json
{
  "id": "uuid",
  "studentId": "12345",
  "type": "Placement",
  "message": "Afford hiring drive on May 2",
  "isRead": false,
  "createdAt": "2026-04-22T17:51:30Z"
}
```
### notification_type Enum Values
- `Placement`
- `Result`
- `Event`
### Real-Time Notification Mechanism
Use **WebSockets** (via Socket.io):
- When a student logs in, they connect to a WebSocket server
- The server keeps a map of `studentId → socket`
- When a new notification is created via POST, the server emits it instantly to the student's socket
- If the student is offline, the notification is stored in the DB and delivered on next login

#### WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Student connects on login |
| `notification:new` | Server → Client | Push new notification to student |
| `notification:read` | Client → Server | Student marks notification as read |
## Stage 2
### Database Choice: PostgreSQL
PostgreSQL is chosen because:
- Notifications have a clear, consistent structure — relational DB fits well
- Supports indexing for fast queries on large datasets
- ACID compliance ensures no notifications are lost
- Scales well with proper indexing and partitioning
### DB Schema
#### students table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
#### notifications table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');
```
### Queries Based on Stage 1 APIs
#### Get all notifications for a student
```sql
SELECT * FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC;
```
#### Get unread notifications
```sql
SELECT * FROM notifications
WHERE student_id = $1 AND is_read = FALSE
ORDER BY created_at DESC;
```
#### Create a notification
```sql
INSERT INTO notifications (student_id, type, message)
VALUES ($1, $2, $3)
RETURNING *;
```
#### Mark one as read
```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = $1;
```
#### Mark all as read
```sql
UPDATE notifications
SET is_read = TRUE
WHERE student_id = $1;
```
#### Delete a notification
```sql
DELETE FROM notifications
WHERE id = $1;
```
### Problems as Data Volume Increases
- Table grows to millions of rows — queries slow down without indexes
- Fetching unread notifications per student becomes expensive
- Sorting by `created_at` on large tables is slow without an index
### Solutions
- Add indexes on frequently queried columns (see Stage 3)
- Partition the notifications table by `created_at` (monthly partitions)
- Archive old notifications to a separate table after 6 months
## Stage 3
### Is the query accurate?
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```
The query is logically correct but slow at scale because:
- No index on `student_id` or `is_read` — full table scan on 5,000,000 rows
- `SELECT *` fetches all columns including large `message` text
- `ORDER BY createdAt DESC` without an index requires sorting the entire result
### Computation Cost
- Full table scan: O(n) where n = 5,000,000 rows
- Sort: O(n log n)
- Total: very expensive at this scale
### Should we index every column?
No. Indexing every column is bad advice because:
- Every index slows down INSERT, UPDATE, DELETE operations
- Indexes consume significant disk space
- Most columns are never used in WHERE clauses
### Correct indexes to add
```sql
-- Most important: composite index for this exact query pattern
CREATE INDEX idx_notifications_student_read
ON notifications(student_id, is_read, created_at DESC);
```
This single composite index covers the WHERE clause and the ORDER BY in one scan.
### Query to find students who got a placement notification in last 7 days
```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
AND created_at >= NOW() - INTERVAL '7 days';
```
## Stage 4

### Problem
Notifications are fetched from DB on every page load for every student — this causes DB overload at scale.

### Solutions

#### Option 1: Server-Side Caching with Redis (Recommended)
- Cache each student's notifications in Redis with key `notifications:{studentId}`
- On page load, check Redis first — only hit DB on cache miss
- Invalidate cache when a new notification arrives or one is marked as read
- Set TTL of 5 minutes so stale data doesn't persist too long

**Tradeoffs:**
- Dramatically reduces DB load
- Sub-millisecond response times from cache
- Extra infrastructure (Redis server)
- Cache invalidation complexity — must be carefully managed

#### Option 2: Pagination
- Never fetch all notifications at once — fetch 20 at a time
- Use cursor-based pagination on `created_at`

**Tradeoffs:**
- Simple to implement, no extra infrastructure
- Reduces data transferred per request
- Still hits DB on every page load

#### Option 3: Client-Side Caching
- Store notifications in browser localStorage or Redux store
- Only re-fetch if a WebSocket event signals new notifications

**Tradeoffs:**
- Zero DB hits if nothing changed
- Stale data risk if WebSocket connection drops

### Recommended Combined Strategy
Use Redis (Option 1) + WebSocket invalidation + Pagination together for best results.

## Stage 5

### Shortcomings of the current notify_all() implementation
function notify_all(student_ids: array, message: string):
for student_id in student_ids:
send_email(student_id, message)   # calls Email API
save_to_db(student_id, message)   # DB insert
push_to_app(student_id, message)  # real-time push

Problems:
1. **Sequential loop** — processes 50,000 students one by one, extremely slow
2. **No error handling** — if send_email fails at student 200, the rest never get notified
3. **Tight coupling** — email, DB, and push are all in one synchronous block
4. **No retry mechanism** — failed emails are lost permanently
5. **DB bottleneck** — 50,000 individual INSERT statements hammer the database

### What happens when send_email fails at student 200?
Students 1–199 got the email. Students 200–50,000 get nothing. No way to know who was missed. save_to_db and push_to_app also never run for those students.

### Should saving to DB and sending email happen together?
No — they should be decoupled. The DB insert should always succeed regardless of whether the email sends. This way the notification is always stored and visible in-app, and email is a best-effort delivery on top.

### Revised Pseudocode
function notify_all(student_ids: array, message: string):
Step 1: Bulk insert all notifications to DB at once
bulk_insert_to_db(student_ids, message)
Step 2: Push real-time update to all connected sockets
broadcast_to_app(student_ids, message)
Step 3: Queue emails — do not send inline
for student_id in student_ids:
email_queue.push({ student_id, message })
Email worker (runs separately, retries on failure)
function email_worker():
while true:
job = email_queue.pop()
try:
send_email(job.student_id, job.message)
catch error:
if job.retry_count < 5:
email_queue.push(job, retry_count + 1)
else:
move_to_dead_letter_queue(job)

### Why this is better
- Bulk DB insert = 1 query instead of 50,000
- Email failures do not affect DB saves or in-app notifications
- Queue retries ensure no student is permanently missed
- Dead letter queue captures persistent failures for manual review
- DB and email are fully decoupled — each can fail independently

### Stage 6
- refer to ./notification_app_be/index.js for the code