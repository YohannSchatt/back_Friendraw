const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

var tokenAccessUser = new Map();
var tokenPersistentUser = new Map();

function authentificateToken(req, res, next)  {    
    const result = verifyAccessToken(req.cookies.token); //si le token est bon
    if (result.success) {
      req.user = result.data; //ajoute les donnée de l'utilisateur à la requête 
      next();
    }
    else {
      return res.status(200).json({ authorization: false });
    }
}

function verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      if (decoded) {
        if  (findTokenUser(decoded.id_user) === token) {
          return { success: true, data: decoded };
        }
        else {
          throw new Error();
        } 
      } 
    }
    catch (error) {
      return { success: false, error: error.message };
    }
}

    // Verify a refresh token
function CreateRefreshToken(id_user,right) {
  const payload = {
    id_user: id_user,
    right:right
  };
  const options = { expiresIn: '15min' };
  appendMap(id_user,token);
  console.log('refresh');
  return jwt.sign(payload, process.env.SECRET_KEY, options);
}

function sendRefreshToken(user,res){
  const token = CreateRefreshToken(user.id_user,user.right)
  res.cookie('token',token, {httpOnly: true, maxAge: 900000, path:'/'});
}

function appendMap(id_user,token) {
  tokenAccessUser.set(id_user,token);
}

function findTokenUser(pseudo) {
  const token = tokenAccessUser.get(pseudo);
  if (!token) {
    throw new Error();
  }
  return token;
}

//renvoie un booleen
function existToken(token) {
  return tokenAccessUser.has(token);
}

function deleteTokenWithId(id){
  tokenAccessUser.delete(id);
}

function deleteTokenWithToken(token){
  if (TokenExist()) {
    for (var [key, value] of tokenAccessUser){
      if (value === token) {
        deleteTokenWithId(key);
      }
    }
  }
  else {
    throw new Error();
  }
}

function PrintAllPseudoToken() {
  for (var [key, value] of tokenAccessUser){
    console.log("pseudo :" + key + ", token : " + value)
  }
}

module.exports = { sendRefreshToken,authentificateToken, appendMap, findTokenUser, existToken, deleteTokenWithId, deleteTokenWithToken };