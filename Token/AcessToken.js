const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const middlewares = require('../middlewares/authentification.js')

//fonction crée un AccesToken et le renvoie 
//id_user : id de l'utilisateur
//right : droit de l'utilisateur
//return : token
function generateAccessToken(id_user,right) {
    const payload = {
      id_user: id_user,
      right: right
    };
    const options = { expiresIn: '1h' };
    token = jwt.sign(payload, process.env.SECRET_KEY,options);
    middlewares.appendMap(id_user,token);
    return token;
}
module.exports = { generateAccessToken }