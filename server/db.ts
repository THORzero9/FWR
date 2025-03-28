import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log current database connection info (masking sensitive parts)
const dbUrlMasked = process.env.DATABASE_URL?.replace(
  /^(.*?:\/\/)(.*?):(.*?)@(.*)$/,
  (_, protocol, user, pass, rest) => `${protocol}${user}:***@${rest}`
);
console.log(`Connecting to database: ${dbUrlMasked}`);

// Create connection pool with event handlers for debugging
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

pool.on('connect', (client) => {
  console.log('New database client connected');
});

// Test connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    const res = await client.query('SELECT NOW()');
    console.log(`Database time: ${res.rows[0].now}`);
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

export const db = drizzle({ client: pool, schema });
