const pool = require('./../database/database.js');

var likes = new Map()

function CreateLikes() {
  const requete_SQL = 'SELECT pseudo,nom,countLike(id_dessin) as nb_like from utilisateur,dessin WHERE utilisateur.id_user = dessin.id_user';
  pool.query(requete_SQL, (erreur, resultat) => {
    if (erreur){
      console.log(erreur)
      throw new Error();
    }
    else {
      resultat.rows.forEach( row => {
        console.log(row);
        likes.set(`${row.nom}/${row.pseudo}`,row.nb_like); //`${dessin.nom}/${utilisateur.pseudo}` est la forme de l'id de chaque item dans le front
      })
    }
 })
}

function SetLikes(key,value){
    likes.set(key,value);
}

function GetLikes(key){
    return likes.get(key);
}

function DeleteLikes(key){
    return likes.delete(key);
}

function HasLikes(key){
    return likes.has(key);
}

module.exports = {CreateLikes,GetLikes,SetLikes,DeleteLikes,HasLikes}