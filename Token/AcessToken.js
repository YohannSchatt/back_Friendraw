const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const middlewares = require('../middlewares/authentification.js')

function generateAccessToken(id_user,right) {
    const payload = {
      id_user: id_user,
      right: right
    };
    const options = { expiresIn: '15min' };
    token = jwt.sign(payload, process.env.SECRET_KEY,options);
    middlewares.appendMap(id_user,token);
    return token;
}
module.exports = { generateAccessToken }