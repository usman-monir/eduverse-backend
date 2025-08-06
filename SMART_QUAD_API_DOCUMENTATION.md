# Smart Quad & Notification API Documentation

## Overview
This document outlines the new APIs added for Smart Quad (Group Classes) functionality and enhanced notification system for the Score Smart PTE platform.

## Smart Quad APIs

### 1. Create Smart Quad Batch
**POST** `/api/smart-quad`
- **Access**: Admin only
- **Description**: Create a new Smart Quad batch for group learning
- **Body**:
```json
{
  "name": "Advanced PTE Batch A",
  "description": "Group class for advanced PTE students",
  "tutor": "tutor_id_here",
  "courseType": "smart-quad",
  "preferredLanguage": "English",
  "desiredScore": 75,
  "examDeadline": "2024-06-15",
  "courseDuration": 8,
  "totalSessions": 24,
  "courseExpiryDate": "2024-07-15",
  "weeklySchedule": [
    {
      "day": "Monday",
      "time": "14:00",
      "duration": 60
    },
    {
      "day": "Wednesday",
      "time": "14:00",
      "duration": 60
    }
  ]
}
```

### 2. Get All Smart Quad Batches
**GET** `/api/smart-quad`
- **Access**: Private
- **Query Parameters**:
  - `status`: Filter by status (forming, active, completed, cancelled)
  - `tutor`: Filter by tutor ID
  - `courseType`: Filter by course type
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)

### 3. Get Smart Quad by ID
**GET** `/api/smart-quad/:id`
- **Access**: Private
- **Description**: Get detailed information about a specific Smart Quad batch

### 4. Add Student to Smart Quad
**POST** `/api/smart-quad/:id/add-student`
- **Access**: Admin only
- **Body**:
```json
{
  "studentId": "student_id_here"
}
```

### 5. Remove Student from Smart Quad
**DELETE** `/api/smart-quad/:id/remove-student/:studentId`
- **Access**: Admin only

### 6. Update Smart Quad Batch
**PUT** `/api/smart-quad/:id`
- **Access**: Admin only
- **Description**: Update batch details (name, description, schedule, etc.)

### 7. Delete Smart Quad Batch
**DELETE** `/api/smart-quad/:id`
- **Access**: Admin only

### 8. Get Available Smart Quad Batches
**GET** `/api/smart-quad/available`
- **Access**: Admin only
- **Query Parameters**:
  - `preferredLanguage`: Filter by language preference
  - `desiredScore`: Filter by target score
  - `examDeadline`: Filter by exam deadline
  - `courseType`: Filter by course type

### 9. Get Smart Quad Sessions
**GET** `/api/smart-quad/:id/sessions`
- **Access**: Private
- **Description**: Get all sessions for a specific Smart Quad batch

## Notification APIs

### 1. Send Course Expiry Notifications
**POST** `/api/notifications/course-expiry`
- **Access**: Admin only
- **Description**: Send notifications to students whose courses expire in 10 days
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalStudents": 5,
    "notificationsSent": 4,
    "notificationsFailed": 1,
    "errors": [...]
  }
}
```

### 2. Send Smart Quad Availability Notifications
**POST** `/api/notifications/smart-quad-availability`
- **Access**: Admin only
- **Body**:
```json
{
  "smartQuadId": "smart_quad_id_here"
}
```

### 3. Send Session Cancellation Notifications
**POST** `/api/notifications/session-cancellation`
- **Access**: Admin only
- **Body**:
```json
{
  "sessionId": "session_id_here",
  "cancellationReason": "Tutor unavailable"
}
```

### 4. Get Notification Statistics
**GET** `/api/notifications/stats`
- **Access**: Admin only
- **Response**:
```json
{
  "success": true,
  "data": {
    "expiringStudents": 3,
    "activeSmartQuads": 5,
    "studentsInSmartQuads": 18,
    "notificationTypes": {
      "courseExpiry": "Available",
      "smartQuadAssignment": "Available",
      "smartQuadRemoval": "Available",
      "smartQuadCancellation": "Available",
      "sessionCancellation": "Available"
    }
  }
}
```

## Updated User Model Fields

The User model has been extended with student-specific fields:

```typescript
// New fields added to User model
preferredLanguage?: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
desiredScore?: number; // 0-90
examDeadline?: Date;
courseType?: 'one-on-one' | 'smart-quad';
courseDuration?: number; // in weeks
totalSessions?: number;
courseExpiryDate?: Date;
```

## Updated Admin APIs

### Update User Profile
**PUT** `/api/admin/users/:id`
- **Access**: Admin only
- **New Fields**: All student-specific fields can now be updated
- **Body**:
```json
{
  "preferredLanguage": "English",
  "desiredScore": 75,
  "examDeadline": "2024-06-15",
  "courseType": "smart-quad",
  "courseDuration": 8,
  "totalSessions": 24,
  "courseExpiryDate": "2024-07-15",
  "accessTill": "2024-07-15"
}
```

## Smart Quad Model Schema

```typescript
interface ISmartQuad {
  name: string;
  description?: string;
  tutor: Types.ObjectId;
  tutorName: string;
  students: {
    studentId: Types.ObjectId;
    studentName: string;
    email: string;
    phone?: string;
  }[];
  maxStudents: number; // Default: 4
  currentStudents: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  courseType: 'one-on-one' | 'smart-quad';
  preferredLanguage: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore: number;
  examDeadline: Date;
  courseDuration: number;
  totalSessions: number;
  completedSessions: number;
  courseExpiryDate: Date;
  weeklySchedule: {
    day: string;
    time: string;
    duration: number;
  }[];
  createdBy: Types.ObjectId;
}
```

## Email Notifications

The system now supports the following email notifications:

1. **Smart Quad Assignment**: Sent when a student is added to a Smart Quad batch
2. **Smart Quad Removal**: Sent when a student is removed from a Smart Quad batch
3. **Smart Quad Cancellation**: Sent when a Smart Quad batch is cancelled
4. **Course Expiry Alert**: Sent 10 days before course expiry
5. **Smart Quad Availability**: Sent to eligible students when new batches are available

## Key Features Implemented

### Feature 6: Smart Quad (Group Classes)
✅ **Complete Implementation**
- Create and manage Smart Quad batches
- Add/remove students from batches
- Automatic status management (forming → active when full)
- Student matching based on preferences
- Weekly schedule management
- Session tracking for batches

### Feature 8: Notification & Access Control
✅ **Complete Implementation**
- Course expiry notifications (10 days before)
- Smart Quad assignment notifications
- Access restriction based on expiry date
- Comprehensive email templates
- Notification statistics and management

## Usage Examples

### Creating a Smart Quad Batch
```javascript
const response = await fetch('/api/smart-quad', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    name: "Advanced PTE Group A",
    tutor: "tutor_id",
    courseType: "smart-quad",
    preferredLanguage: "English",
    desiredScore: 75,
    examDeadline: "2024-06-15",
    courseDuration: 8,
    totalSessions: 24,
    courseExpiryDate: "2024-07-15"
  })
});
```

### Adding a Student to Smart Quad
```javascript
const response = await fetch(`/api/smart-quad/${batchId}/add-student`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    studentId: "student_id"
  })
});
```

### Sending Course Expiry Notifications
```javascript
const response = await fetch('/api/notifications/course-expiry', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

## Database Indexes

The following indexes have been added for optimal performance:

- `SmartQuad`: `{ status: 1, currentStudents: 1 }`
- `SmartQuad`: `{ tutor: 1, status: 1 }`
- `SmartQuad`: `{ 'students.studentId': 1 }`
- `SmartQuad`: `{ preferredLanguage: 1, status: 1 }`
- `SmartQuad`: `{ courseExpiryDate: 1 }`
- `User`: `{ courseExpiryDate: 1 }` (for expiry notifications)

## Error Handling

All APIs include comprehensive error handling:
- Input validation
- Database operation errors
- Email sending failures
- Authorization checks
- Detailed error messages

## Security Considerations

- All Smart Quad operations require admin privileges
- Student data is protected and validated
- Email notifications are sent securely
- Access control is enforced at multiple levels 