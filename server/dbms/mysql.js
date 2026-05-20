import mysql from 'mysql2/promise';
import 'dotenv/config';

// Database configuration
// Priority: DATABASE_URL > individual env vars > defaults
const connectionString = process.env.DATABASE_URL;

const dbConfig = connectionString ? {
  uri: connectionString,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
} : {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

export const pool = mysql.createPool(dbConfig);

export const db = {
  query: async (sql, params) => {
    return pool.query(sql, params);
  },
  getConnection: async () => {
    return pool.getConnection();
  }
};
