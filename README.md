# FreshSave - Food Wastage Reduction Application

FreshSave is a web application designed to help users reduce food waste by managing their inventory, discovering recipes, and facilitating food sharing or donation.

## Features
*   **Inventory Management**: Track food items, quantities, and expiry dates.
*   **Recipe Suggestions**: Get recipe ideas based on your available ingredients, especially those nearing expiry.
*   **Food Sharing**: Connect with nearby users or locate local food banks to share or donate excess food.
*   **Waste Tracking**: Monitor your impact with statistics on CO2, water, and money saved by reducing waste.
*   **User Authentication**: Secure user accounts for personalized inventory and tracking.

## Project Structure

The project is a monorepo structure with three main parts:

*   `client/`: Contains the frontend React application built with Vite and TypeScript.
*   `server/`: Contains the backend Express.js application built with TypeScript, using PostgreSQL (via Drizzle ORM) as the database.
*   `shared/`: Contains shared code, primarily database schemas and types used by both client and server.

## Getting Started

### Prerequisites

*   Node.js (version 20.x or later recommended)
*   npm (usually comes with Node.js)
*   PostgreSQL database server

### Setup

1.  **Clone the repository (if applicable):**
    ```bash
    # git clone <repository-url>
    # cd <project-directory>
    ```

2.  **Install dependencies:**
    From the project root directory, install dependencies for both server and client:
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    *   You will need a PostgreSQL database. Create one if you don't have it.
    *   Create a `.env` file in the project root directory.
    *   Add your database connection string to the `.env` file:
        ```env
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
        ```
        Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE_NAME` with your actual database credentials.
    *   You can also set a `SESSION_SECRET` for Express sessions:
        ```env
        SESSION_SECRET="your-super-secret-session-key"
        ```
        If not provided, a default, less secure secret will be used.

4.  **Apply Database Migrations/Schema:**
    The project uses Drizzle ORM. To apply the schema to your database (this will create the necessary tables):
    ```bash
    npm run db:push
    ```
    *(Note: Ensure your `DATABASE_URL` in `.env` is correctly configured before running this.)*

### Running the Application

*   **Development Mode (Client and Server concurrently):**
    This command starts both the backend server (with auto-reload via `tsx`) and the frontend Vite development server.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5000` (server) and the Vite client might proxy to this or run on a separate port (check terminal output).

*   **Build for Production:**
    This command builds both the client and server for production.
    ```bash
    npm run build
    ```
    The client build will be in `client/dist` (or similar, check `vite.config.ts`) and the server build will be in `dist/`.

*   **Start in Production Mode:**
    After building the application, run:
    ```bash
    npm run start
    ```
    This serves the production-built application.

### Running Tests

The project uses Vitest for automated tests. To run the tests:
```bash
npm run test
```

## Key Technologies

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI, Wouter
*   **Backend**: Node.js, Express.js, TypeScript, PostgreSQL, Drizzle ORM, Passport.js
*   **Testing**: Vitest, Supertest
*   **Shared**: Zod (for validation)
