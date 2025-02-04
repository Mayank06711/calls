import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Pool, PoolClient } from "pg";
import { Query } from "../interface/interface";

let pool: Pool | null = null;
let isConfigured = false;
const initializePool = () => {
  if (!pool) {
    const DB_PWS = String(process.env.DB_PASSWORD);
    const database = `${process.env.DB_NAME}_${process.env.NODE_ENV}`;

    console.log("Initializing database connection pool with:");
    // console.log("DB User:", process.env.PG_DB_USER);
    // console.log("DB Host:", process.env.PG_DB_HOST);
    // console.log("Database:", database);
    // console.log("Password:", DB_PWS);

    pool = new Pool({
      user: process.env.PG_DB_USER,
      host: process.env.PG_DB_HOST,
      database: database, // Corrected: Use database name here
      password: DB_PWS, // Corrected: Use DB password here
      port: 5432,
      max: 2, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000, // Time to release idle clients
    });
  }
};

// Function to get a database client for custom queries
const getClient = async (): Promise<PoolClient> => {
  try {
    initializePool(); // Ensure pool is initialized
    const client = await pool!.connect();
    return client; // Return the client to be used for custom operations
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error; // Rethrow the error to handle it at a higher level
  }
};

const dbQuery = async (query: Query) => {
  const client = await getClient();
  try {
    return await client.query(query.text, query.values);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    client.release(); //// Release the client back to the pool
  }
};

const dbQueryWithTransaction = async (query: Query) => {
  const client = await getClient();
  try {
    // Begin the transaction
    await client.query("BEGIN");

    // Execute the query
    const result = await client.query(query.text, query.values);

    // Commit the transaction if successful
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // If an error occurs, rollback the transaction
    await client.query("ROLLBACK");
    console.error("Database query error:", error);
    throw error;
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const dbMultipleQuery = async (queries: Query[]) => {
  const client = await getClient();
  try {
    // Start the transaction
    await client.query("BEGIN");

    for (const query of queries) {
      await client.query(query.text, query.values); // Execute each query in the transaction
    }

    // Commit the transaction after all queries are successful
    await client.query("COMMIT");
  } catch (error) {
    // If any query fails, rollback the transaction
    await client.query("ROLLBACK");
    console.error("Database query error:", error);
    throw error;
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30 * 1000,
      socketTimeoutMS: 45 * 1000,
    };
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}`,
      options
    );
    console.log(
      ` SEE me in src db index.js IF you Forgot
         /n DATABASE CONNECTION ESTABLISHED With DB Host !! ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log(
      ` MONGODB CONNECTION FAILED: with data base  FROM db.index.js`,
      error
    );
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await checkHealth();
    await mongoose.disconnect();
    console.log("MongoDB connection closed successfully");
  } catch (error) {
    console.error("Error while disconnecting from MongoDB:", error);
    throw error;
  }
};
// Function to check health status
const checkHealth = async () => {
  try {
    const readyStateOfDB = mongoose.connection.readyState;
    const timestamp = new Date().toISOString();
    // Ensure the connection is established
    if (readyStateOfDB === 0) {
      console.error(`${timestamp} - Database disconnected.`);
      return false;
    } else if (readyStateOfDB === 2) {
      console.log(`${timestamp} - Database connecting...`);
      return false; // The connection is still in the process of connecting
    } else if (readyStateOfDB === 1) {
      console.log(`${timestamp} - Database connected.`);
    }

    // Perform ping test if connected
    if (mongoose.connection.db) {
      const pingResult = await mongoose.connection.db.admin().ping(); // For Mongoose
      const isHealthy = pingResult.ok === 1;
      console.log(
        `${timestamp} - Database ping test: ${isHealthy ? "SUCCESS" : "FAILED"}`
      );
      return isHealthy;
    } else {
      console.error(`${timestamp} - Database is not ready.`);
      return false; // Database is not ready, return false
    }
  } catch (error) {
    console.error(`${new Date().toISOString()} - Health check failed:`, error);
    return false;
  }
};

const configureCloudinary = (): void => {
  if (isConfigured) {
    console.log("Cloudinary already configured");
    return;
  }

  if (
    !process.env.CLOUDINARY_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET_KEY
  ) {
    console.error(
      "Missing Cloudinary configuration. Please check your environment variables:"
    );
    console.error("CLOUDINARY_NAME:", process.env.CLOUDINARY_NAME ? "✓" : "✗");
    console.error(
      "CLOUDINARY_API_KEY:",
      process.env.CLOUDINARY_API_KEY ? "✓" : "✗"
    );
    console.error(
      "CLOUDINARY_API_SECRET_KEY:",
      process.env.CLOUDINARY_API_SECRET_KEY ? "✓" : "✗"
    );
    throw new Error("Cloudinary configuration missing");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
  });

  isConfigured = true;
  console.log("Cloudinary configured successfully");
};

const getCloudinary = () => {
  if (!isConfigured) {
    throw new Error(
      "Cloudinary not configured. Call configureCloudinary() first."
    );
  }
  return cloudinary;
};

export {
  checkHealth,
  connectDB,
  disconnectDB,
  dbQuery,
  dbQueryWithTransaction,
  dbMultipleQuery,
  getCloudinary,
  configureCloudinary,
};
