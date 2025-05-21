# AI Workflow Optimizer

An AI-powered workflow analysis and optimization platform that transforms complex process mapping into an intuitive, intelligent experience. This application helps businesses analyze and improve their workflows through AI-driven insights.

![Workflow Optimizer Screenshot](https://via.placeholder.com/800x450?text=AI+Workflow+Optimizer)

## 🌟 Features

- **Guided Workflow Discovery**: Interactive conversation-based workflow mapping powered by Claude AI
- **Three-Phase Approach**:
  - Phase 1: Workflow Discovery - Map your business process through AI-guided conversation
  - Phase 2: Diagram Generation - Auto-create visual workflow diagrams from your descriptions
  - Phase 3: AI Opportunities - Receive AI-driven optimization recommendations
- **Real-time Visualization**: Automatically generated workflow diagrams
- **Enhanced Insights**: AI-powered analysis identifies automation opportunities and process improvements
- **Developer Tools**: Built-in debugging features for testing and development

## 🧠 AI Capabilities

- **Claude 3.7 Sonnet Integration**: Leverages the latest Claude AI model for natural conversations
- **Extended Thinking Mode**: Enables more thorough analysis in the AI Opportunities phase
- **Web Search Integration**: Enhances AI recommendations with real-time internet data
- **Structured Data Extraction**: Automatically identifies workflow components from natural language

## 🖥️ Tech Stack

- **Frontend**: TypeScript, React, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Anthropic Claude 3.7 Sonnet
- **Authentication**: Simple company + email authentication

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/workflow-optimizer.git
   cd workflow-optimizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   ANTHROPIC_API_KEY=your_anthropic_api_key
   SEARCH_API_KEY=your_search_api_key (optional)
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Debug Tools

The application includes a Debug Panel that is only available when the `NODE_ENV` environment variable is not set to `production`. Running `npm run dev` will start the server in this mode and the panel appears in the bottom-right corner.

### Debug Panel
- Quickly create test chats, set chat phases, and fill in sample workflow data.

### Debug API
- `POST /api/debug/create-test-chat` – create a chat with predefined messages. Body: `{ userId, messageCount }`
- `POST /api/debug/set-chat-phase` – set the current phase of a chat (1, 2, or 3). Body: `{ chatId, phase }`
- `POST /api/debug/set-workflow-json` – add sample workflow JSON to a chat. Body: `{ chatId }`
- `POST /api/debug/create-completed-chat` – generate a completed sample chat with AI suggestions. Body: `{ userId }`


## 📊 System Architecture

The application follows a client-server architecture with three main layers:

1. **Client Layer**: React-based single-page application
2. **Server Layer**: Node.js Express server with Claude AI integration
3. **Data Layer**: PostgreSQL database using Drizzle ORM

## 🔄 Workflow Process

1. **User creates a new chat**
2. **Phase 1: Workflow Discovery**
   - Claude conducts an interview about the user's workflow
   - AI extracts structured workflow data
3. **Phase 2: Diagram Generation**
   - System generates a Mermaid flowchart of the workflow
   - Claude converts the Mermaid syntax into a visual diagram
4. **Phase 3: AI Opportunity Suggestions**
   - Claude analyzes the workflow for optimization opportunities
   - Web search integration provides real-world best practices
   - Extended Thinking Mode enables deeper analysis

## 🔐 Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `ANTHROPIC_API_KEY`: API key for Claude AI integration (required)
- `SEARCH_API_KEY`: API key for web search functionality (optional)
- `SEARCH_ENGINE`: Search engine to use (default: 'serper', alternative: 'google')
- `GOOGLE_SEARCH_ENGINE_ID`: Required if using Google search engine
- `SESSION_SECRET`: Secret key for signing session cookies

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgements

- [Anthropic Claude](https://www.anthropic.com/) - AI model powering the conversational intelligence
- [React](https://reactjs.org/) - Frontend library
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM

## Features to add
### Chat
- [ ] Initiate a chat from the AI side
- [ ] When you push enter after entering a message, then it should appear before the AI responds

### Debug
- [ ] The debug panel disappears when I start a chat
- [ ] Phase management


### Diagram

### Users
- [ ] Sign up and create a new user in the database that can then login

### Asthetics
- [ ] Add a loading state to the chat
- [ ] Add a favicon to the website

### Preperation for production
- [ ] Enable a debug / non-debug option
