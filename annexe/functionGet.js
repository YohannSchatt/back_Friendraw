const pool = require('./../database/database.js'); 

//Fonction qui renvoie le pseudo d'un utilisateur à partir de son id
function getPseudoWithIdUser(id_user) {
    return new Promise((resolve, reject) => {
      const requete_SQL1 = "SELECT pseudo FROM utilisateur WHERE id_user=$1";
      pool.query(requete_SQL1, [id_user], (erreur, resultat) => {
        if (erreur) {
          console.log(erreur);
          reject(erreur);
        } else {
          resolve(resultat.rows[0].pseudo); // Renvoie l'ID unique par pseudo
        }
      });
    });
  }

//Fonction qui renvoie l'id d'un utilisateur à partir de son pseudo
function FoundIdUserWithPseudo(pseudo) {
    return new Promise((resolve, reject) => {
      const requete_SQL1 = "SELECT id_user FROM utilisateur WHERE pseudo=$1";
      pool.query(requete_SQL1, [pseudo], (erreur, resultat) => {
        if (erreur) {
          console.log("problème dans la recherche de l'utilisateur", erreur);
          reject(erreur);
        } else {
          console.log(resultat.rows[0].id_user);
          resolve(resultat.rows[0].id_user); // Renvoie l'ID unique par pseudo
        }
      });
    });
  }

//Fonction qui renvoie l'id d'un dessin à partir de son nom et de l'id de l'utilisateur
function FoundIdDessinWithNomAndIdUser(id_user,nom) {
    return new Promise((resolve, reject) => {
      const requete_SQL = "SELECT id_dessin FROM dessin WHERE id_user=$1 and nom = $2";
      pool.query(requete_SQL, [id_user,nom], (erreur, resultat) => {
        if (erreur) {
          console.log(erreur);
          reject(erreur);
        } else {
          resolve(resultat.rows[0].id_dessin); // Renvoie l'ID unique par pseudo
        }
      });
    });
  }  

module.exports = { getPseudoWithIdUser, FoundIdDessinWithNomAndIdUser, FoundIdUserWithPseudo}