const pool = require('./../database/database.js');

//Création de la map des likes
var likes = new Map()

//Fonction qui récupère et stocke les likes des dessins
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

//Fonction qui modifie le nombre de likes d'un dessin
function SetLikes(key,value){
    likes.set(key,value);
}

//Fonction qui récupère le nombre de likes d'un dessin
function GetLikes(key){
    return likes.get(key);
}

//Fonction qui supprime un dessin de la map des likes
function DeleteLikes(key){
    return likes.delete(key);
}

//Fonction qui vérifie si un dessin est dans la map des likes
function HasLikes(key){
    return likes.has(key);
}

module.exports = {CreateLikes,GetLikes,SetLikes,DeleteLikes,HasLikes}