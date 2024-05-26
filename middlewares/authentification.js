const jwt = require('jsonwebtoken');

var tokenAccessUser = new Map();
//var tokenPersistentUser = new Map();


//vérifie si l'utilisateur a un accesToken, si oui, ajoute les données de l'utilisateur à la requête
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

//Fonction qui vériffie et déconde le token
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

//Fonction qui vérifie si l'utilisateur a les droits administrateurs
function verifyAdminRight(req,res,next){
  const id_user = req.user.id_user
  const right = req.user.right
  if (right == 3){
    next()
  }
  else {
    return res.status(200).json({ authorization: false });
  }
}

//vérifie si l'utilisateur a un refreshToken
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

//fonction qui envoie un refreshToken
function sendRefreshToken(user,res){
  const token = CreateRefreshToken(user.id_user,user.right)
  res.cookie('token',token, {httpOnly: true, maxAge: 900000, path:'/'});
}

//ajoute un token à la map
function appendMap(id_user,token) {
  tokenAccessUser.set(id_user,token);
}

//trouve le token d'un utilisateur
function findTokenUser(pseudo) {
  const token = tokenAccessUser.get(pseudo);
  if (!token) {
    throw new Error();
  }
  return token;
}

//vérifie si un token existe, renvoie true si oui, false sinon
function existToken(token) {
  return tokenAccessUser.has(token);
}

//supprime un token de la map
function deleteTokenWithId(id){
  tokenAccessUser.delete(id);
}

//supprime le token a l'aide du token
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

//Fonction qui affiche tout pseudo et leur token associé
function PrintAllPseudoToken() {
  for (var [key, value] of tokenAccessUser){
    console.log("pseudo :" + key + ", token : " + value)
  }
}

module.exports = { verifyAdminRight,sendRefreshToken,authentificateToken, appendMap, findTokenUser, existToken, deleteTokenWithId, deleteTokenWithToken };