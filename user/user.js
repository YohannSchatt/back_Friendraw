const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const middlewares = require('../middlewares/authentification.js')

function generateAccessToken(pseudo) {
    const payload = {
      pseudo: pseudo,
    };
    const options = { expiresIn: '15min' };
    token = jwt.sign(payload, process.env.SECRET_KEY,options);
    middlewares.appendMap(pseudo,token);
    return token;
}

function generatePersistentToken(pseudo,email) {
    const payload = {
      pseudo: pseudo,
      email: email
    };
    const options = { expiresIn: '2h' };
    return jwt.sign(payload, process.env.SECRET_KEY, options);
}

module.exports = { generateAccessToken }