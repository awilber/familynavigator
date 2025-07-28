# Family Navigator

A comprehensive application for individuals navigating separation and divorce, providing tools for document management, communication analysis, incident tracking, and AI-powered guidance.

## Features

- **Communication Analysis**: Import and analyze emails, text messages, and other communications
- **Document Management**: Store and organize court documents, agreements, and other important files
- **Incident Tracking**: Log and track incidents with timeline visualization
- **Family Management**: Manage children's schedules, medications, and important information
- **AI Assistant**: Get contextual advice and insights based on your situation
- **Secure Storage**: End-to-end encryption for all sensitive data

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- AWS account (for S3 storage)
- Claude API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run db:migrate
   npm run db:seed # Optional: add sample data
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:3000

## Security

This application handles sensitive personal information. Security measures include:

- End-to-end encryption for sensitive data
- JWT-based authentication with MFA support
- Audit logging for all data access
- GDPR-compliant data handling
- Regular security audits

## License

Private - All rights reserved