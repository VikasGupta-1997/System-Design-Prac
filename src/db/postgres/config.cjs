require('dotenv').config();
const path = require("path"); 

module.exports = {
  development: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    dialect: "postgres",
    migrationStorageTableName: "sequelize_meta",
    migrations: {
      path: path.resolve("dist/db/postgres/migrations"),
      pattern: /\.js$/
    },
    seederStorage: "sequelize"
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres"
  }
};
