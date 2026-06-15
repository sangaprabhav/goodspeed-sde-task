Goodspeed
Software Developer Technical Assessment


Overview
Build an AI-Powered Knowledge Base - a full-stack application where users can create and manage documents, then ask questions about them through an AI chat interface that retrieves relevant context (RAG).
You are encouraged to use AI-assisted coding tools (Claude Code, Cursor, Copilot, Codex, etc.). We are not testing how fast you can type - we are evaluating your ability to make good architectural decisions, ship working software, and produce a codebase that other engineers would want to work in.


Tech Stack
Layer
Technology
Monorepo
Turborepo
Frontend
React + Next.js
Backend API
NestJS
Database
Supabase (PostgreSQL + pgvector)
AI
OpenAI SDK (provider-agnostic - see below)



Requirements
1. Monorepo Setup (Turborepo)
Structure the project as a Turborepo monorepo with at minimum:
apps/web - Next.js frontend
apps/api - NestJS backend
packages/ - shared types, config, or utilities as you see fit
The repo should have sensible Turborepo pipelines for build, dev, and lint. A new developer should be able to clone the repo, run a single setup command, and be up and running.
2. Authentication
Implement authentication using Supabase Auth (email/password is sufficient). Users should only be able to see and interact with their own documents and conversations.
3. Document CRUD
Users should be able to create, read, update, and delete documents. Each document has at minimum:
Title
Text content (plain text or markdown)
Tags (optional)
Timestamps (created, updated)
4. RAG Pipeline
When a document is created or updated, the backend should:
Chunk the document content into appropriate segments
Generate embeddings for each chunk
Store the embeddings in Supabase using the pgvector extension
The chunking strategy and chunk size are up to you - but be prepared to explain your choices.
5. AI Chat Interface
Build a chat interface where users can ask questions about their documents. The system should:
Retrieve relevant document chunks via vector similarity search
Include the retrieved context in the prompt sent to the AI model
Display the AI response in a conversational UI
Maintain conversation history within a session
6. Provider-Agnostic AI Layer
This is a key requirement. The AI integration must be designed so that any provider following the OpenAI API specification can be swapped in via configuration - without changing application code. This includes but is not limited to:
OpenAI
Groq
Together AI
OpenRouter
A local Ollama instance
Design a clean abstraction for this. We care about how you model this interface, not just that it works with one provider.


What We're Evaluating
Area
What we're looking for
Monorepo architecture
Turborepo config, workspace structure, shared packages, DX (developer experience)
Code quality
Clean separation of concerns, readable code, consistent patterns, proper error handling
Database design
Schema design, pgvector usage, RLS policies, migration strategy
RAG implementation
Chunking strategy, embedding storage, retrieval quality, prompt construction
AI abstraction
Is the provider layer genuinely swappable? How well is the interface designed?
Frontend craft
Component structure, state management, UX sensibility - it doesn't need to be beautiful, but it should be usable



Submission

To email:

A Loom walkthrough talking through what you’ve built (no longer than 5 mins)
AGitHub repository (public or private - invite us if private with the email team@goodspeed.studio) containing:


The complete codebase
A README that includes:
Setup instructions (we will run your project)
Your architecture decisions and why you made them
How to swap AI providers
What you would improve or add given more time
Link to a loom walk through of the app
Link to a loom walk through on how you used AI to accelerate.
A .env.example with all required environment variables documented


Stretch Goals (Optional)
These are not required, but if you want to demonstrate range:
Streaming AI responses
Persistent conversation history across sessions
Source citations - show which document chunks informed each answer
File upload (PDF/TXT) with text extraction into the document system
A simple usage/token tracking view
