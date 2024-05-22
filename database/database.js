const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: process.env.USER,
    database: process.env.DB,
    password: process.env.DB_MDP,
    port : process.env.PORTDB,
})

module.exports = pool 