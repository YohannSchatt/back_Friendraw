const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

var tokenAccessUser = new Map();
var tokenPersistentUser = new Map();

function authentificateToken(req, res, next)  {
    //PrintAllPseudoToken();      
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
        console.log(decoded)
        console.log(decoded.pseudo);
        if  (findTokenUser(decoded.pseudo) === token) {
          console.log('success');
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
function verifyPersistentToken(token) {
  const secret = 'your-refresh-token-secret';   
  try {
    const decoded = jwt.verify(token, secret);
    return { success: true, data: decoded };
  } 
  catch (error) {
    return { success: false, error: error.message };
  }
}

function appendMap(pseudo,token) {
  tokenAccessUser.set(pseudo,token);
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

function deleteTokenWithPseudo(pseudo){
  tokenAccessUser.delete(pseudo);
}

function deleteTokenWithToken(token){
  if (TokenExist()) {
    for (var [key, value] of tokenAccessUser){
      if (value === token) {
        deleteTokenWithPseudo(key);
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

module.exports = { authentificateToken, appendMap, findTokenUser, existToken, deleteTokenWithPseudo, deleteTokenWithToken };