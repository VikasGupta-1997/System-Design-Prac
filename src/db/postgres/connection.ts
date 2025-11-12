import { Sequelize } from 'sequelize';
import config from '../../config';


export const sequelize = new Sequelize(
  config.postgres.db,
  config.postgres.user,
  config.postgres.password,
  {
    host: config.postgres.host,
    port: config.postgres.port,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);


export const testPostgres = async () => {
  await sequelize.authenticate();
  console.log('Postgres (Sequelize) connected');
};