import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  timezone: "+08:00",
});

export async function testDbConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log("MySQL connected successfully");
    return true;
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
}