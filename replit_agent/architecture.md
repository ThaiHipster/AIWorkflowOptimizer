# Architecture Documentation

## Overview

This repository contains an AI Workflow Optimizer application, which is a full-stack web application designed to help businesses analyze and optimize their workflows. The system uses AI (specifically Claude from Anthropic) to interview users about their business processes, generate workflow diagrams, and provide optimization recommendations.

The application follows a modern web architecture with a clear separation between frontend and backend components. It uses React for the frontend, Express for the backend API, and a PostgreSQL database for persistent storage.

## System Architecture

The application follows a client-server architecture with three main layers:

1. **Client Layer**: A React-based single-page application (SPA) that provides the user interface
2. **Server Layer**: A Node.js Express server that handles API requests and business logic
3. **Data Layer**: A PostgreSQL database using Drizzle ORM for data persistence

### High-Level Architecture Diagram

```
┌─────────────────┐     ┌────────────────────┐     ┌───────────────────┐
│                 │     │                    │     │                   │
│  Client (React) │────▶│ Server (Express)   │────▶│ Database (Postgres)│
│                 │     │                    │     │                   │
└─────────────────┘     └────────────────────┘     └───────────────────┘
                              │
                              │
                              ▼
                        ┌────────────────┐
                        │                │
                        │ Anthropic API  │
                        │ (Claude AI)    │
                        │                │
                        └────────────────┘
```

## Key Components

### Frontend Architecture

The frontend is built using React with the following key technologies:

- **React**: Core UI library
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **React Query**: Data fetching and state management
- **React Hook Form**: Form handling
- **Zod**: Schema validation

The frontend is organized into the following directory structure:

- `client/src/components`: UI components organized by feature and shared components
- `client/src/contexts`: React context providers for global state management
- `client/src/hooks`: Custom React hooks
- `client/src/lib`: Utility functions and API client
- `client/src/pages`: Page components corresponding to routes

The application uses a context-based state management pattern with two main contexts:
- `AuthContext`: Manages user authentication state
- `ChatContext`: Manages chat and workflow data

### Backend Architecture

The backend is built using Node.js with Express and provides a RESTful API. Key components include:

- **Express**: Web framework for handling HTTP requests
- **Passport.js**: Authentication middleware
- **Connect-PG-Simple**: Session store using PostgreSQL
- **Anthropic API**: Integration with Claude AI for workflow analysis

The backend is organized into the following structure:

- `server/index.ts`: Entry point and server initialization
- `server/routes.ts`: API route definitions
- `server/auth.ts`: Authentication logic
- `server/claude.ts`: Integration with Anthropic's Claude AI
- `server/storage.ts`: Data access layer for database operations
- `server/websearch.ts`: Web search functionality for AI assistance

### Database Schema

The database uses PostgreSQL with Drizzle ORM for schema definition and database operations. The main tables are:

1. **users**: Stores user information
   - id (UUID, primary key)
   - company_name (text)
   - email (text)
   - created_at (timestamp)

2. **chats**: Stores workflow analysis sessions
   - id (UUID, primary key)
   - user_id (UUID, foreign key to users)
   - title (text)
   - created_at (timestamp)
   - updated_at (timestamp)
   - workflow_json (jsonb) - Stores the structured workflow data
   - ai_suggestions_markdown (text) - Stores AI optimization recommendations
   - phase (integer) - Current phase of the workflow analysis
   - completed (integer) - Flag indicating completion status

3. **messages**: Stores the conversation history
   - id (UUID, primary key)
   - chat_id (UUID, foreign key to chats)
   - content (text)
   - role (text) - 'user' or 'assistant'
   - created_at (timestamp)

## Data Flow

The application follows these primary data flows:

### Authentication Flow

1. User enters company name and email in the auth form
2. Frontend sends credentials to `/api/auth/login` endpoint
3. Backend creates or retrieves the user record
4. User information is returned to the client and stored in localStorage
5. AuthContext maintains the authenticated state throughout the application

### Workflow Analysis Flow

1. User creates a new chat or selects an existing one
2. AI (Claude) conducts an interview to map the user's workflow through a series of questions
3. Messages are exchanged between client and server via API endpoints
4. The server processes user inputs and generates AI responses using Anthropic's Claude API
5. The workflow is progressively mapped and stored in the database
6. Once the workflow is fully mapped, AI generates optimization suggestions

### Data Retrieval Flow

1. Frontend fetches data (chats, messages) from the API using React Query
2. Backend retrieves data from the PostgreSQL database using Drizzle ORM
3. Data is returned to the client as JSON responses
4. React components render the data in the UI

## External Dependencies

The application integrates with the following external services:

1. **Anthropic's Claude API**: Used for natural language processing and AI-powered workflow analysis
   - Integration is handled in `server/claude.ts`
   - Requires an API key set in environment variables

2. **Search API** (optional): Used for web search functionality to assist the AI
   - Integration is handled in `server/websearch.ts`
   - Supports either Google or Serper as the search engine
   - Requires an API key set in environment variables

3. **Neon Serverless PostgreSQL**: Database service for data persistence
   - Connection is established in `db/index.ts`
   - Requires a connection string set in environment variables

## Deployment Strategy

The application is configured for deployment on Replit, as evidenced by the `.replit` configuration file. The deployment strategy includes:

1. **Build Process**:
   - Client-side code is built using Vite
   - Server-side code is bundled using esbuild
   - The combined build is placed in the `dist` directory

2. **Runtime Configuration**:
   - Environment variables for API keys and database connection strings
   - Production mode flag for optimized performance

3. **Database Management**:
   - Schema migrations using Drizzle Kit
   - Database seeding for initial data population

4. **Server Configuration**:
   - Express server serves both the API and static frontend assets
   - Production middleware configuration for security and performance

The application can be deployed to other platforms by adjusting the build and start scripts in `package.json` and ensuring the required environment variables are set.

## Security Considerations

The application implements several security measures:

1. **Authentication**: Simple email-based authentication without passwords
2. **Session Management**: Server-side sessions stored in PostgreSQL
3. **HTTPS**: Configuration for secure connections in production
4. **Environment Variables**: Sensitive information stored in environment variables
5. **Input Validation**: Request data validation using Zod schemas

## Development Workflow

The repository includes several npm scripts for development:

- `npm run dev`: Starts the development server
- `npm run build`: Builds the application for production
- `npm run start`: Starts the production server
- `npm run check`: Type checking using TypeScript
- `npm run db:push`: Updates the database schema
- `npm run db:seed`: Seeds the database with initial data