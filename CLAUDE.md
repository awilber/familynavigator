# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Family Navigator** - A comprehensive application for individuals navigating separation and divorce, providing tools for document management, communication analysis, incident tracking, and AI-powered guidance.

## Purpose

Family Navigator assists users in managing the complex aspects of separation and divorce by:
- Analyzing and organizing communications (emails, text messages)
- Managing court documents and legal records
- Tracking incidents and interactions
- Providing AI-powered advice and insights
- Maintaining comprehensive records for legal purposes

## Technology Stack

**Frontend**: React with TypeScript
- Material-UI for consistent UI components
- React Router for navigation
- Redux Toolkit for state management

**Backend**: Node.js with Express
- TypeScript for type safety
- PostgreSQL for structured data
- File storage for documents/PDFs

**AI Integration**: Claude API
- For communication analysis
- For providing contextual advice
- For document summarization

**Security**: 
- End-to-end encryption for sensitive data
- JWT authentication
- Role-based access control

## Project Architecture

```
familynavigator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature-specific modules
│   │   │   ├── communications/
│   │   │   ├── documents/
│   │   │   ├── incidents/
│   │   │   ├── calendar/
│   │   │   └── ai-assistant/
│   │   ├── services/      # API calls and external integrations
│   │   └── utils/         # Helper functions
├── server/                # Node.js backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   │   ├── email-parser/
│   │   │   ├── message-analyzer/
│   │   │   ├── document-processor/
│   │   │   └── ai-integration/
│   │   └── middleware/    # Auth, validation, etc.
├── database/              # SQL migrations and schemas
└── shared/               # Shared types and utilities
```

## Key Features & Implementation Notes

### 1. Communication Analysis
- **Email Integration**: Gmail API integration for direct access
- **Message Import**: Parser for macOS Messages chat.db
- **Analysis Engine**: NLP for sentiment analysis and key phrase extraction

### 2. Document Management
- **OCR for PDFs**: Tesseract.js for scanned document processing
- **Categorization**: Auto-categorize court documents, agreements, etc.
- **Version Control**: Track document revisions and modifications

### 3. Incident Tracking
- **Timeline View**: Chronological display of all incidents
- **Evidence Linking**: Connect communications, documents to incidents
- **Export Capabilities**: Generate reports for legal purposes

### 4. Family Management
- **Child Profiles**: Track medications, schedules, preferences
- **Co-parenting Calendar**: Shared custody scheduling
- **Medical Records**: Secure storage of health information

### 5. AI Assistant
- **Context-Aware Advice**: Based on user's complete history
- **Document Summarization**: Quick insights from lengthy documents
- **Pattern Recognition**: Identify concerning behavioral patterns

## Commands

```bash
# Development
npm run dev           # Start both client and server in dev mode
npm run client       # Start only the React dev server
npm run server       # Start only the Node.js server

# Testing
npm test             # Run all tests
npm run test:client  # Test frontend only
npm run test:server  # Test backend only

# Building
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed development data
```

## Security Considerations

1. **Data Encryption**: All sensitive data encrypted at rest
2. **Access Control**: Multi-factor authentication required
3. **Audit Logging**: Track all data access and modifications
4. **Data Export**: Users can export all their data
5. **GDPR Compliance**: Right to deletion implemented

## Development Guidelines

1. **Privacy First**: Always consider user privacy in feature development
2. **Legal Compliance**: Features must support legal documentation needs
3. **Data Integrity**: Ensure all records are tamper-evident
4. **User Safety**: Include resources for domestic violence situations
5. **Accessibility**: WCAG 2.1 AA compliance required

## API Integrations

- **Gmail API**: For email access and analysis
- **Our Family Wizard**: Import/export capabilities (via file upload)
- **Claude API**: For AI-powered features
- **AWS S3**: For secure document storage
- **Twilio**: For SMS notifications (optional)

## Testing Strategy

- Unit tests for all utility functions
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Security penetration testing quarterly