module.exports = {
  apps: [
    {
      name: "ecommerce",
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 7000",
      cwd: __dirname,
      env_production: {
        NODE_ENV: "production",
        PORT: "7000",
        FIREBASE_ADMIN_CREDENTIALS:
          process.env.FIREBASE_ADMIN_CREDENTIALS || "/opt/ecommerce/secrets/firebase-admin.json",
      },
    },
  ],
};
