const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

var tokenUser = new Map();

function authentificateToken(req, res, next)  {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
      
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
      return { success: true, data: decoded };
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
  tokenUser.set(pseudo,token);
}

function findTokenUser(pseudo) {
  const token = tokenUser.get(pseudo);
  if (!token) {
    throw new Error();
  }
  return token;
}

//renvoie un booleen
function TokenExist(token) {
  return tokenUser.has(token);
}

function deleteTokenWithPseudo(pseudo){
  tokenUser.delete(pseudo);
}

function deleteTokenWithToken(token){
  if (TokenExist()) {
    for (var [key, value] of tokenUser){
      if (value === token) {
        deleteTokenWithPseudo(key);
      }
    }
  }
  else {
    throw new Error();
  }
}

module.exports = { authentificateToken, appendMap, findTokenUser, TokenExist, deleteTokenWithPseudo, deleteTokenWithToken };