# EduPortal Backend API

Backend API for EduPortal - A Student Portal/Booking System with class scheduling, study materials management, and WhatsApp automation.

## Features

- 🔐 **Authentication & Authorization** (JWT-based)
- 👥 **User Management** (Students, Tutors, Admins)
- 📚 **Study Materials Management** (Protected content)
- 📅 **Class Session Booking System**
- 💬 **Messaging System**
- 📝 **Slot Request Management**
- 🤖 **WhatsApp Automation** (CRM integration)
- 🔒 **Content Security** (Protected downloads)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Language**: TypeScript
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd eduverse-booking-system/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/eduportal
   JWT_SECRET=your-super-secret-jwt-key
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**

   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

### Health Check

- `GET /health` - API health status

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.ts        # Main server file
├── dist/                # Compiled JavaScript
├── uploads/             # File uploads
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

| Variable         | Description               | Default                               |
| ---------------- | ------------------------- | ------------------------------------- |
| `PORT`           | Server port               | `5000`                                |
| `MONGODB_URI`    | MongoDB connection string | `mongodb://localhost:27017/eduportal` |
| `JWT_SECRET`     | JWT signing secret        | Required                              |
| `JWT_EXPIRES_IN` | JWT expiration time       | `7d`                                  |
| `CORS_ORIGIN`    | Allowed CORS origin       | `http://localhost:3000`               |
| `NODE_ENV`       | Environment mode          | `development`                         |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
