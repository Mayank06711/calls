import mongoose from "mongoose";
import { Pool, PoolClient } from "pg";
import { Query } from "../types/interface";

let pool: Pool | null = null;
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
    await client.query('BEGIN');
    
    for (const query of queries) {
      await client.query(query.text, query.values); // Execute each query in the transaction
    }

    // Commit the transaction after all queries are successful
    await client.query('COMMIT');
  } catch (error) {
    // If any query fails, rollback the transaction
    await client.query('ROLLBACK');
    console.error("Database query error:", error);
    throw error;
  } finally {
    client.release(); // Release the client back to the pool
  }
};


const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}`
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

// Function to check health status
const checkHealth = async () => {
  try {
    // Check application status
    const appStatus = "Application is running"; // You can enhance this with more checks if needed

    const readyStateOfDB = mongoose.connection.readyState;

    // Ensure the connection is established
    if (readyStateOfDB === 0) {
      console.error(`${new Date().toISOString()} - Database disconnected.`);
      return false;
    } else if (readyStateOfDB === 2) {
      console.log(`${new Date().toISOString()} - Database connecting...`);
      return false; // The connection is still in the process of connecting
    } else if (readyStateOfDB === 1) {
      console.log(`${new Date().toISOString()} - Database connected.`);
    }

    // Check database connection status
    if (mongoose.connection.db) {
      const dbConnection = await mongoose.connection.db.admin().ping(); // For Mongoose

      console.log(`${new Date().toISOString()} - ${appStatus}`);
      console.log(
        `${new Date().toISOString()} - Database connection status: ${
          dbConnection.ok ? "OK" : "FAILED"
        }`
      );
      return dbConnection.ok; // return true if connection is OK
    } else {
      console.error(`${new Date().toISOString()} - Database is not ready.`);
      return false; // Database is not ready, return false
    }
  } catch (error) {
    console.error(`${new Date().toISOString()} - Health check failed:`, error);
    return false;
  }
};

export { checkHealth, connectDB, dbQuery, dbQueryWithTransaction, dbMultipleQuery };
