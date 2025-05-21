// Simple script to test connection to Neon database
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure connection
const connectionString = 'postgresql://neondb_owner:npg_i0IvScjlV5xs@ep-mute-resonance-a5veuvjg-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Set up the WebSocket constructor for Node.js environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;

// Create a new pool
const pool = new Pool({ connectionString });

async function testConnection() {
  try {
    // Try to connect and run a simple query
    const client = await pool.connect();
    console.log('Successfully connected to Neon database!');
    
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    // Don't forget to release the client
    client.release();
    
    // Close the pool
    await pool.end();
  } catch (err) {
    console.error('Error connecting to Neon database:', err);
  }
}

testConnection(); 