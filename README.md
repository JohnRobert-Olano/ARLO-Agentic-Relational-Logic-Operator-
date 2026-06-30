# ARLO (Agentic Relational Logic Operator)

A high-performance orchestration engine bridging natural language with strict relational database management.

## System Capabilities & Use Cases

**Frictionless Financial Tracking:** Send a casual message like "Spent $15 on coffee" via Telegram. ARLO autonomously categorizes the expense, structures the payload, and logs it directly into the Supabase backend.

**Intelligent Time Blocking:** Input your daily goals into the chat. The orchestration engine calculates precise ISO timestamps and pushes structured, time-blocked events to your schedule.

**Real-Time State Synchronization:** Trigger instant WebSocket updates on the Next.js frontend dashboard the moment a backend tool executes an autonomous database mutation, bypassing traditional web forms entirely.

**Local & Cloud Flexibility:** Execute complex reasoning workflows using cloud-based LLMs or shift to completely offline, self-hosted local models via Ollama.

---

## System Architecture Overview

The system architecture is strictly segregated into three primary domains, ensuring scalability, security, and real-time responsiveness:
1. **The Orchestration Engine (n8n + AI Agent)**: Acts as the intelligent "brain stem." It routes natural language requests from users, extracts structured data using LLMs, and triggers backend operations.
2. **The Backend (Supabase)**: A secure, real-time relational database storing personal data with stringent Row Level Security (RLS) policies.
3. **The Frontend Dashboard (Next.js)**: A responsive, real-time web interface for users to visualize analytics, manage their schedules, and track task progression.

---

## 1. Orchestration Engine (n8n & LLM Integration)

The core logic orchestration is handled by n8n, enabling seamless conversational interactions via Telegram and complex reasoning via an LLM.

### Workflow Execution Flow
1. **Telegram Webhook Trigger**: A Telegram Bot receives a message and forwards it via a POST webhook to the n8n instance (`/telegram-va-webhook`). The payload contains the raw message text, chat ID, and user Telegram ID.
2. **AI Agent Processing**: The core reasoning is processed by a Google Gemini AI Agent (utilizing models like `gemini-1.5-flash` or `gemini-2.0-flash`). The agent uses a strict custom system prompt to act as an expert Personal Virtual Assistant. It understands the user's intent, whether it is to track finances, manage a checklist, or schedule a calendar event.
3. **Declarative Tool Execution**: Instead of parsing raw text manually, the AI Agent is equipped with declarative JSON schema tools connected directly to the Supabase backend. When the LLM decides an action is needed, it structures the tool call parameters autonomously.
   - **Tool: Log Finance**: Inserts structured income or expense records. It requires `type` (Expense/Gross Income), `amount`, and `category`, with an optional `description`.
   - **Tool: Manage Checklist**: Creates or updates checklist items. It maps user input to a `title`, `priority` (Low, Medium, High), and calculates precise ISO timestamps for `due_date`.
   - **Tool: Time Block Schedule**: Creates calendar events by extracting a `title`, `description`, `start_time`, and `end_time` in strict ISO format.
4. **Response Generation**: Upon successful execution of the backend tools, the AI agent generates a warm, friendly confirmation message summarizing the completed operation, which is sent back to the user via the Telegram API (`sendMessage`).

### Local LLM Support
The workflow is built with flexibility in mind. It includes an **Ollama** node to support self-hosted, local LLMs (e.g., `llama3`, `mistral`, or `qwen`). By redirecting the AI Language Model input socket, the system can run entirely offline and locally, connecting to `http://localhost:11434`.

---

## 2. Backend (Supabase PostgreSQL)

The database schema is strictly typed, multi-tenant, and optimized for real-time synchronization. It utilizes PostgreSQL's advanced features to ensure data integrity and security.

### Database Schema Details
- **`finances`**: Tracks personal income and expenses.
  - `id`: UUID (Primary Key)
  - `user_id`: UUID (Foreign Key to auth.users, cascades on delete)
  - `type`: Restricted by check constraint to 'Expense' or 'Gross Income'
  - `amount`: Numeric value (strictly > 0)
  - `category` & `description`: Text fields for organization.
  - Indexes: optimized on `user_id`, `type`, and `created_at` for rapid analytical querying.
- **`checklist`**: A robust task management list.
  - `status`: Restricted to 'Pending', 'In Progress', 'Completed'
  - `priority`: Restricted to 'Low', 'Medium', 'High'
  - `due_date`: Timestamp for deadlines.
- **`schedules`**: Time-blocked calendar events.
  - Enforces a table-level check constraint (`check_end_after_start`) ensuring `end_time` always occurs after `start_time`.

### Advanced Database Capabilities
- **Row Level Security (RLS)**: Stringent RLS access policies guarantee that authenticated users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where the `user_id` strictly matches their `auth.uid()`.
- **Realtime Subscriptions**: The database employs a PL/pgSQL block to dynamically register `finances`, `checklist`, and `schedules` to the `supabase_realtime` publication. This allows the Next.js frontend to instantly react via WebSockets to changes triggered remotely by the Telegram bot.
- **Remote Procedure Call (RPC)**: Includes a custom `get_financial_summary` function. This powerful RPC takes a `timeframe` ('today', 'this_week', 'this_month', 'last_month', 'weekend'), `category`, and `search_term` to aggregate `total_income`, `total_expense`, and calculate a `net_balance`. It dynamically returns this summary alongside the top 10 matching transactions as a serialized JSON object, dramatically reducing complex data processing on the client side.

---

## 3. Frontend Dashboard (Next.js)

The user-facing dashboard is built with **Next.js 14** using the modern App Router architecture, **React 18**, and **TypeScript** for strict type safety.

### Key Capabilities
- **Authentication Flow**: Integrates seamlessly with `@supabase/supabase-js` to provide secure login, session management, and protected routing.
- **Real-Time Data Visualization**: Connects to the Supabase Realtime channels. When a user sends a Telegram message to add a task or log an expense, the dashboard UI updates automatically in real-time without requiring a page refresh.
- **Styling and UI**: Utilizes modular CSS (`globals.css`, `page.module.css`) for localized, conflict-free styling, ensuring a high-performance rendering cycle. It heavily relies on `lucide-react` for beautiful, lightweight SVG iconography across the interface.
- **Analytics & Summaries**: Employs the backend RPC functions to render detailed financial summaries, category breakdowns, and timeline views of upcoming schedules and tasks.

---

## 4. Automation and Utility Scripts

To assist in local development, deployment, and configuration management, the repository includes several Python utility scripts:
- **`update_workflow.py`**: A deployment utility designed to patch, update, and deploy n8n SQLite databases or workflow JSON files safely.
- **`fix_schema.py`**: A migration and synchronization script used to ensure data structures remain consistent across the Supabase backend and n8n tool schema definitions.

---

## Getting Started

This project is bootstrapped with `create-next-app`.

### Prerequisites
- Node.js (v20+)
- npm, yarn, pnpm, or bun
- Supabase Project (execute the `supabase/schema.sql` in your SQL Editor to provision tables, RLS, and RPCs)
- n8n instance (Cloud or Self-Hosted Docker container)
- Telegram Bot Token (obtained from BotFather)

### Running the Frontend Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The development server enables hot-module reloading; you can start editing the page by modifying `app/page.tsx` and the UI will auto-update.
