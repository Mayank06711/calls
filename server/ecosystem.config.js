module.exports = {
    apps: [
      {
        name: "my-app",
        script: "dist/index.js",
        instances: "max", // Or specify a number of instances
        exec_mode: "cluster", // Use cluster mode for scalability
        watch: false, // Turn on if you want file watching in development
        env: {
          NODE_ENV: "dev"
        },
        env_production: {
          NODE_ENV: "prod"
        }
      }
    ]
  };
  