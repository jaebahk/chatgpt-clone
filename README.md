# ChatGPT Clone

A full-stack ChatGPT-style application built with React, Node.js, and TypeScript. Features real-time streaming responses, Google OAuth authentication, and persistent chat history with DynamoDB.

## 🚀 Features

- **Real-time Chat**: Streaming responses from OpenAI API
- **Google OAuth**: Secure authentication with session management
- **Chat Management**: Create, switch between, and delete conversations
- **Persistent Storage**: Chat history and user data stored in DynamoDB
- **Modern UI**: Beautiful interface built with shadcn/ui components
- **Responsive Design**: Works seamlessly across devices

## 🛠 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** for beautiful, accessible components
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **Node.js** with TypeScript
- **Express.js** for API server
- **Google OAuth 2.0** for authentication
- **JWT** for session management
- **OpenAI API** for LLM responses
- **AWS DynamoDB** for data persistence
- **Server-Sent Events** for real-time streaming

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Cloud Console account (for OAuth)
- OpenAI API key
- AWS account with DynamoDB access

## 🔧 Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/jaebahk/chatgpt-clone
cd chatgpt-clone

# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`
7. Copy the Client ID and Client Secret

### 3. AWS DynamoDB Setup

1. Go to [AWS Console](https://console.aws.amazon.com/dynamodb/)
2. Create three tables with the following configurations:

**Users Table:**
- Table name: `Users`
- Partition key: `id` (String)

**Chats Table:**
- Table name: `Chats`  
- Partition key: `chatId` (String)

**Messages Table:**
- Table name: `Messages`
- Partition key: `id` (String)

3. Note your AWS region (e.g., `us-east-2`)
4. Create an IAM user with DynamoDB full access and get Access Key ID + Secret

### 4. Environment Configuration

Create environment files:

**Server (.env)**
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Client Configuration
CLIENT_URL=http://localhost:5173

# Server Configuration
PORT=3001

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-2
```

**Client (.env)**
```env
VITE_SERVER_URL=http://localhost:3001
```

### 5. Run the Application

```bash
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Start the client
cd client  
npm run dev
```

The application will be available at:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

## 🏗 Architecture & Design Decisions

### Authentication Flow
- **Google OAuth 2.0** for secure user authentication
- **JWT tokens** for session management with automatic refresh
- **Redirect-based flow** that handles the OAuth callback properly

### Real-time Communication
- **Server-Sent Events (SSE)** for streaming OpenAI responses
- **Incremental updates** that stream tokens as they arrive
- **Graceful fallbacks** to mock responses when APIs are unavailable

### Data Persistence
- **DynamoDB** chosen for scalability and AWS ecosystem integration
- **Three-table design**: Users, Chats, Messages for clear separation
- **Optimistic updates** with server sync for responsive UX
- **Error handling** with mock fallbacks during development

### Frontend Architecture
- **Component-based design** with clear separation of concerns
- **Context API** for global authentication state
- **shadcn/ui** for consistent, accessible UI components
- **Responsive design** with mobile-first approach

### Backend Architecture
- **Express.js** with TypeScript for type safety
- **Modular route structure** for maintainability
- **Middleware** for authentication and error handling
- **Environment-based configuration** for different deployment stages

## 🎨 UI/UX Decisions

### Design System
- **shadcn/ui** components for professional, accessible interface
- **Consistent spacing** using Tailwind's 8px grid system
- **Semantic colors** that adapt to light/dark themes
- **Typography hierarchy** with proper contrast ratios

### Chat Interface
- **Message bubbles** with clear user/AI distinction
- **Avatar icons** (User/Bot) for visual clarity
- **Timestamps** for conversation context
- **Real-time typing indicators** during AI responses

### Navigation
- **Sidebar chat list** with recent-first sorting
- **Visual active states** for current conversation
- **Delete functionality** with proper state management
- **Responsive layout** that works on mobile

## 🧪 Bonus Feature: LLM Eval Harness

The application includes an **LLM Eval Harness** for comparing different prompts and models:

### Features
- **Side-by-side comparison**: Test two different prompts on the same user message
- **Performance metrics**: Capture response latency and token usage
- **Rating system**: Thumbs up/down to rate which response is better
- **Results history**: View past comparisons and their ratings
- **Real-time testing**: Uses OpenAI API for actual model comparisons

### Usage
1. Navigate to `/eval` or click "Eval Harness" in the chat interface
2. Enter a user message to test both prompts with
3. Configure Prompt A and Prompt B with different system instructions
4. Click "Run Comparison" to see side-by-side results
5. Rate which response is better using the thumbs up buttons
6. View comparison history and performance metrics

### Technical Implementation
- **Backend API** (`/api/eval/compare`): Runs parallel OpenAI requests with timing
- **Performance tracking**: Measures latency and token usage for each prompt
- **Rating storage**: Logs user preferences for prompt effectiveness
- **Fallback support**: Works with mock data when OpenAI API unavailable

## 📁 Project Structure

```
chatgpt-clone/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── EvalHarness.tsx  # LLM evaluation interface
│   │   │   └── ...
│   │   ├── context/        # React context providers
│   │   ├── lib/           # Utility functions
│   │   └── App.tsx        # Main application
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── routes/        # Express route handlers
│   │   │   ├── eval.ts    # Evaluation API endpoints
│   │   │   └── ...
│   │   ├── services/      # Business logic
│   │   └── server.ts      # Express server setup
│   └── package.json
└── README.md
```
