module.exports = {
    apps: [
      {
        name: "nyf_backend_pm2", // // The name of your application process in PM2 (can be anything)
        script: "./dist/index.js", // // Path to the main script that PM2 should start (your application entry point)
        instances: "max", // Or specify a number of instances
        exec_mode: "cluster", // Use cluster mode for scalability
        watch: false, // / Enable file watching for automatic restarts when code changes
        env: {
          NODE_ENV: "dev",
        },
        env_production: {
          NODE_ENV: "prod",
        },
      },
    ],
  };