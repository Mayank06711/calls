/**
 * Environment configuration
 * All environment variables should be accessed from this file
 */
const env = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    API_VERSION: import.meta.env.VITE_API_VERSION,
    ENV: import.meta.env.VITE_ENV,
    IS_PRODUCTION: import.meta.env.VITE_ENV === 'production',
    IS_DEVELOPMENT: import.meta.env.VITE_ENV === 'development',
  };
  
  // Validate required environment variables
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_API_VERSION'];
  
  requiredEnvVars.forEach((envVar) => {
    if (!import.meta.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });
  

  export default env;