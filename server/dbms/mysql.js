import mysql from 'mysql2/promise';
import 'dotenv/config';

// Database configuration
// Priority: DATABASE_URL > individual env vars > defaults
const connectionString = process.env.DATABASE_URL;

const dbConfig = connectionString ? connectionString : {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hudumalynk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
