"use strict"

const config   = require('../config.json');
const mysql    = require('mysql');
var pool       = mysql.createPool({
    host       : config.db.host,
    port       : config.db.port,
    user       : config.db.username,
    password   : config.db.password
});

pool.getConnection(function(err, connection) {
    console.log("Connected to mysql:", connection);
});

pool.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
    if (err) throw err;

    console.log('Result:', rows[0].solution);
});

class MySqlClient {
    constructor() {

    }
    insertPokemon(pkmn) {

    }
}