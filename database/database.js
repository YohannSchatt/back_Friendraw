const { Pool } = require('pg');

//information permettant de se connecter a la BDD
const pool = new Pool({
    host: process.env.URLDB,
    user: process.env.USER,
    database: process.env.DB,
    password: process.env.DB_MDP,
    port : process.env.PORTDB,
})

module.exports = pool 