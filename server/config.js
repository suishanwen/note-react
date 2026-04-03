require('dotenv').config();

module.exports = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'note',
    timezone: '+08:00'
  },
  server: {
    port: parseInt(process.env.PORT || '8051', 10)
  },
  adminToken: process.env.ADMIN_TOKEN
};
