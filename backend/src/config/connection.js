const { Sequelize } = require('sequelize');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize = null;
const result = { sequelize: null, error: null };
try {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      dialectOptions: dbConfig.dialectOptions,
      pool: dbConfig.pool
    }
  );
  result.sequelize = sequelize;
} catch (e) {
  result.error = e?.message || e?.code || 'Unknown Sequelize init error';
  console.error('Sequelize init failed:', result.error);
}

module.exports = result;
