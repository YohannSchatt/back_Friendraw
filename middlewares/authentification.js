const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

var tokenAccessUser = new Map();
var tokenPersistentUser = new Map();

function authentificateToken(req, res, next)  {
    PrintAllPseudoToken();
    console.log(req.headers)
    console.log(token);
      
    if (!token) {
      return res.sendStatus(401);
    }
      
    const result = verifyAccessToken(token); //si le token est bon
      
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }
      
    req.user = result.data; //ajoute les donnée de l'utilisateur à la requête 
    next();
}

function verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      if  (decoded && findTokenUser(decoded.payload.pseudo) === token) {
        return { success: true, data: decoded };
      }
      else {
        throw new Error();
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
  const token = tokenUser.get(pseudo);
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
    console.log("pseudo :" + key + ", token : " + token)
  }
}

module.exports = { authentificateToken, appendMap, findTokenUser, existToken, deleteTokenWithPseudo, deleteTokenWithToken };