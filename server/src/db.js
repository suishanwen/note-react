import mysql from 'mysql2/promise';
import config from './config.js';

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci'
});

export default pool;
