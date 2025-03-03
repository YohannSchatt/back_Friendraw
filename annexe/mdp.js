const bcrypt = require('bcrypt');
const pool = require('./../database/database');

//Permet de hash le mot de passe de l'utilisateur
function get_hash(password){
    const saltRounds = 10;  //nombre de tour de hash
    return bcrypt.hashSync(password, saltRounds); 
}

//Fonction qui vérifie le mot de passe de l'utilisateur
function verif_mdp(mdp,id_user){
    return new Promise((resolve, reject) => {
      const requete_SQL = "SELECT mdp FROM utilisateur WHERE id_user=$1";
      pool.query(requete_SQL, [id_user], (erreur, resultatSQL) => {
        if (erreur) {
          console.log("problème dans la recherche de l'utilisateur", erreur);
          reject(erreur);
        } 
        else {
          const mdpcrypte = resultatSQL.rows[0].mdp;
          bcrypt.compare(mdp, mdpcrypte, (err, result) => {
          if(err){
            resolve(false);
          }
          else{
            if(result){
              resolve(true);
            }
            else{
              resolve(false)
            }
          }
          })
        };
      });
    })
}

module.exports= {verif_mdp, get_hash}