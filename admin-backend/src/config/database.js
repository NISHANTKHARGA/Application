require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com',
  port: parseInt(process.env.DB_PORT || '6543'),
  username: process.env.DB_USER || 'postgres.kppikjqkeytxzlzivpvx',
  password: process.env.DB_PASSWORD || 'Kharga#1122',
  database: process.env.DB_NAME || 'postgres',
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = {
  development: { ...dbConfig },
  production: { ...dbConfig }
};
