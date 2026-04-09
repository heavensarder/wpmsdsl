import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wpmsdsl',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


export async function query(sql: string, values?: any[]) {
  const [results] = await pool.execute(sql, values);
  return results;
}

let messageLogsInitialized = false;
export async function initMessageLogsTable() {
  if (messageLogsInitialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(20) NOT NULL,
      message TEXT,
      file_url VARCHAR(500),
      status ENUM('success', 'failed') NOT NULL,
      error_reason TEXT,
      wa_message_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  messageLogsInitialized = true;
}

export default pool;
