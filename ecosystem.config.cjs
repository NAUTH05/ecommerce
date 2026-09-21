const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const PORT = process.env.PORT || "7000";
const HOST = process.env.HOST || "0.0.0.0";

module.exports = {
  apps: [
    {
      name: "ecommerce",
      cwd: __dirname,
      script: "npm",
      args: `run preview -- --host ${HOST} --port ${PORT}`,
      env: {
        NODE_ENV: "production",
        PORT,
        HOST,
        FIREBASE_ADMIN_CREDENTIALS:
          process.env.FIREBASE_ADMIN_CREDENTIALS || "",
      },
      env_production: {
        NODE_ENV: "production",
        PORT,
        HOST,
        FIREBASE_ADMIN_CREDENTIALS:
          process.env.FIREBASE_ADMIN_CREDENTIALS || "",
      },
    },
  ],
};
