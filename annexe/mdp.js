const bcrypt = require('bcrypt');
const pool = require('./../database/database');

function get_hash(password){
    const saltRounds = 10;
    return bcrypt.hashSync(password, saltRounds); // prefere the async "hash" method in production
}

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