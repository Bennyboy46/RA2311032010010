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