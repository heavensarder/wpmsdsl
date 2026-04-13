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

let settingsInitialized = false;
export async function initSettingsTable() {
  if (settingsInitialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS gateway_settings (
      id INT PRIMARY KEY DEFAULT 1,
      active_engine ENUM('wwebjs', 'meta') DEFAULT 'wwebjs',
      meta_access_token VARCHAR(1000),
      meta_phone_id VARCHAR(50)
    )
  `);
  
  // Ensure default row exists
  const rows: any = await query('SELECT id FROM gateway_settings WHERE id = 1');
  if (rows.length === 0) {
    await query('INSERT INTO gateway_settings (id, active_engine) VALUES (1, "wwebjs")');
  }
  
  settingsInitialized = true;
}

export async function getGatewaySettings() {
  await initSettingsTable();
  const rows: any = await query('SELECT * FROM gateway_settings WHERE id = 1');
  return rows[0];
}

export default pool;
