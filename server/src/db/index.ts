import mongoose from "mongoose";

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

export { checkHealth, connectDB };
