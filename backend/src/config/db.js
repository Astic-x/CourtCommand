import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Create a connection pool instead of a single client
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD, // No fallback empty string, it will force the password from .env
    database: process.env.DB_NAME || "court_command",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then((connection) => {
        console.log("✅ Successfully connected to the MySQL database!");
        connection.release();
    })
    .catch((err) => {
        console.error("❌ Database connection failed:", err.message);
    });

export default pool;