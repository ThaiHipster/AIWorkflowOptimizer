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

## 🧪 Development & Testing

The application includes built-in developer tools for testing:

- **Developer Debug Panel**: Access by clicking the "Developer Tools" button in the bottom-right corner
- **Test Data Generation**: Create test chats with predefined BCBA hiring workflow
- **Phase Simulation**: Test different phases of the workflow process
- **API Endpoints**: Debug endpoints for testing specific functionality

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

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgements

- [Anthropic Claude](https://www.anthropic.com/) - AI model powering the conversational intelligence
- [React](https://reactjs.org/) - Frontend library
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM

## Ideal End State
1. Deployed app
2. Someone can start a new chat and work through the conversation phase, the diagram phase, and the diagnosis phase and get an AI output
3. You can easily test each of the stages using a set of testing buttons
   a. Dropdown set of phase selection elements
   b. Test chat button
4. The app can be easily edited by Chad on Lovable, Repit, etc.

## Missing Features
1. Debug Features
2. Deployment


## To do

### Debug Features
[] Update the debug pannel view
      Labeled "1. New Test Chat"
      On click:
      Calls the existing createTestChat() method
      Adds the new chat to the visible list of chats
      Opens the new chat in the main window
   3. Phase Selector – Multi-Select Buttons
      Vertically stacked buttons labeled 1, 2, and 3 (for Phases 1–3)
      Each button acts as a toggle
      Can be multi-selected
      UI state: pressed = selected, default = unselected
      On click: update internal selectedPhases: number[] state
   4. "Test" Button Behavior
      Central button labeled "Test"
      On click:
      For each selectedPhase in selectedPhases, call setChatPhase(chatId, phaseX)
      Must only run if a current chat is selected
      Can optionally show a toast or visual confirmation for each phase triggered
   5. Integration & Visibility
      This new debug panel:
      Replaces the current Developer Debug Tools panel
      Is hidden by default
      Can be toggled on via a new toggle switch/button in the main UI
[] Update the debug pannel view
   [] Top Section – Current Chat Display
   [] Primary Action – "1. New Test Chat" Button
       [] New Chat Creates a new imediate chat with the first phase selected
   [] Phase Selector – Multi-Select Buttons
       [] Move the phase selections to the left and have them be a 
   [] Test Button Behavior
       [] Once the phase is selected it should set the phase to test
[] Name the test chats with a test and number prefix and increment up with each of the same tests
[] Have a way to get the test chats ID from the chat window

### Deployment

## 📋 Deployment Checklist

- [x] **Vercel Account Setup**
  - [x] Create Vercel account if needed
  - [x] Install Vercel CLI globally (`npm install -g vercel`)
  - [x] Login to Vercel CLI (`vercel login`)

- [ ] **Project Preparation**
  - [x] Ensure all dependencies are correctly listed in `package.json`
  - [x] Verify build script works locally (`npm run build`)
  - [x] Check for any hardcoded local URLs/paths
  - [x] Test production build locally

- [ ] **Environment Variables**
  - [x] List all required environment variables:
    - [x] `DATABASE_URL`
    - [x] `ANTHROPIC_API_KEY`
    - [x] `SEARCH_API_KEY`
    - [x] `SEARCH_ENGINE`

- [ ] **Database Setup**
  - [ ] Set up production PostgreSQL database
  - [ ] Run database migrations
  - [ ] Test database connection with production credentials
d
- [ ] **Deployment Configuration**
  - [ ] Configure build settings in Vercel
  - [ ] Set up environment variables in Vercel dashboard
  - [ ] Configure custom domain (if needed)
  - [ ] Set up automatic deployments from main branch

- [ ] **Post-Deployment**
  - [ ] Test all features on deployed version
  - [ ] Verify API endpoints
  - [ ] Check database connections
  - [ ] Test authentication flow
  - [ ] Verify environment variables are working
  - [ ] Test debug features
