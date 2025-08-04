# Family Navigator

A comprehensive application for individuals navigating separation and divorce, providing tools for document management, communication analysis, incident tracking, and AI-powered guidance.

## 🚀 Latest Updates (v1.1.0)

### Gmail Integration
- **Complete OAuth 2.0 Integration**: Secure Gmail account connection with Google Cloud Console
- **Test Sync Functionality**: Safe testing with limited message count (10 messages)
- **Quick Email Filter**: Real-time filtering with Gmail search syntax support
- **Incremental Sync**: Efficient updates using Gmail History API for new messages only
- **Batch Processing**: Intelligent rate-limited sync with progress tracking

### User Authentication
- **JWT Token System**: Secure session management with bcrypt password hashing
- **Multi-user Support**: User-specific data segregation and Gmail account linking
- **Comprehensive Error Handling**: Detailed logging and error recovery mechanisms

### CI/CD & Deployment
- **GitHub Actions Pipeline**: Automated testing, building, and AWS deployment
- **Docker Containerization**: Production-ready containers for client and server
- **AWS ECS Integration**: Scalable cloud deployment with health monitoring
- **Automated Testing**: Comprehensive test suite execution before deployment

## Features

### Core Functionality
- **Communication Analysis**: Import and analyze emails, text messages, and other communications
- **Gmail Integration**: Direct Gmail access with OAuth 2.0, incremental sync, and advanced filtering
- **Document Management**: Store and organize court documents, agreements, and other important files
- **Incident Tracking**: Log and track incidents with timeline visualization
- **Family Management**: Manage children's schedules, medications, and important information
- **AI Assistant**: Get contextual advice and insights based on your situation

### Technical Features
- **Real-time Sync Progress**: Live updates during Gmail synchronization
- **Advanced Search**: Gmail search syntax support for precise message filtering
- **Responsive Design**: Material-UI components optimized for all device sizes
- **Dark Mode Support**: Complete theme system with adaptive UI
- **Type-Safe Development**: Full TypeScript implementation across client and server
- **Secure Storage**: End-to-end encryption for all sensitive data

## Architecture

### Frontend (React + TypeScript)
- **Material-UI**: Consistent, accessible UI components
- **Redux Toolkit**: Predictable state management
- **React Router**: Client-side routing and navigation
- **Vite**: Fast development server and optimized builds

### Backend (Node.js + Express)
- **TypeScript**: Type-safe server development
- **SQLite**: Lightweight database for development and testing
- **Gmail API**: Official Google APIs integration
- **JWT Authentication**: Secure user session management
- **Winston Logging**: Comprehensive application logging

### Infrastructure
- **Docker**: Containerized deployment
- **AWS ECS**: Scalable container orchestration
- **GitHub Actions**: Automated CI/CD pipeline
- **nginx**: Reverse proxy and static file serving

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Google Cloud Console project with Gmail API enabled
- AWS account (for production deployment)
- GitHub account (for CI/CD pipeline)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/awilber/familynavigator.git
   cd familynavigator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure Google OAuth**
   - Create a project in Google Cloud Console
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Add your client ID and secret to .env

5. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:4001

### Development Commands

```bash
# Start development servers (client + server)
npm run dev

# Start only the client (React + Vite)
npm run client

# Start only the server (Node.js + Express)
npm run server

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## Gmail Integration Setup

### Google Cloud Console Configuration

1. **Create OAuth 2.0 Credentials**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"

2. **Configure Authorized Domains**
   - Add your domain to authorized JavaScript origins
   - Add redirect URIs for OAuth callback

3. **Add Test Users** (for development)
   - Go to OAuth consent screen
   - Add test users to access the application during development

4. **Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

### Gmail API Features

- **Secure Authentication**: OAuth 2.0 flow with refresh token management
- **Incremental Sync**: Only sync new messages using Gmail History API
- **Batch Processing**: Efficient API usage with configurable batch sizes
- **Advanced Filtering**: Support for Gmail search operators
- **Progress Tracking**: Real-time sync status and progress indicators

## Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
The application includes automated deployment via GitHub Actions:

1. **Push to main branch** triggers automatic deployment
2. **CI/CD Pipeline** runs tests and builds Docker images
3. **AWS ECS Deployment** updates the production environment
4. **Health Checks** verify successful deployment

### Manual Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual services
docker build -t familynavigator-client ./client
docker build -t familynavigator-server ./server
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Gmail Integration Endpoints
- `GET /api/gmail/auth` - Start OAuth flow
- `GET /api/gmail/status` - Check connection status
- `POST /api/gmail/sync` - Start message sync
- `GET /api/gmail/sync/progress` - Get sync progress
- `POST /api/gmail/sync/pause` - Pause sync
- `POST /api/gmail/sync/resume` - Resume sync
- `POST /api/gmail/sync/stop` - Stop sync
- `POST /api/gmail/sync/incremental` - Incremental sync

## Security

This application handles sensitive personal information. Security measures include:

### Data Protection
- **End-to-end Encryption**: All sensitive data encrypted at rest
- **JWT Authentication**: Secure session management with token expiration
- **Password Security**: bcrypt hashing with high salt rounds
- **OAuth 2.0**: Secure third-party authentication without storing passwords

### Infrastructure Security
- **HTTPS Only**: All communication encrypted in transit
- **Security Headers**: Comprehensive HTTP security headers
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Server-side validation and sanitization
- **Audit Logging**: Complete audit trail of all data access

### Compliance
- **GDPR Compliance**: Right to deletion and data export
- **Data Minimization**: Only collect necessary information
- **Access Controls**: Role-based permissions and user isolation
- **Regular Security Audits**: Automated and manual security assessments

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for new features
- Ensure all CI/CD checks pass

## Support

For support and questions:
- Check the [Issues](https://github.com/awilber/familynavigator/issues) page
- Review the [Documentation](https://github.com/awilber/familynavigator/wiki)
- Contact the development team

## License

Private - All rights reserved

---

**Latest Release**: v1.1.0 - Enhanced Gmail Integration with User Authentication  
**Build Status**: ![Deploy to AWS](https://img.shields.io/github/workflow/status/awilber/familynavigator/Deploy%20to%20AWS)  
**Code Coverage**: ![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)