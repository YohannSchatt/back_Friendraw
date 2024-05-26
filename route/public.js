const express = require('express');
const router = express.Router();
const pool = require('./../database/database.js');

//route qui permet de récupérer tous les dessins publics (visibilité = 2)
//Il est possible de filtrer les dessins par pseudo et par nom
router.post('/dessin', (req,res) => {
    const requete_SQL = `SELECT pseudo,nom,image,countLike(id_dessin) as nb_aime FROM utilisateur, dessin 
    WHERE utilisateur.id_user = dessin.id_user
    and visibilite = 2 
    and dessin.nom like '%' || $1 || '%' 
    and utilisateur.pseudo like '%' || $2 || '%'`;
    const pseudo = req.body.pseudo;
    const nom_dessin = req.body.nom;
    pool.query(requete_SQL, [nom_dessin,pseudo], (erreur, resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        const images = resultat.rows.map(row => ({ //crée un tableau de dictionnaire avec les données de chaque image
          imageData: row.image,
          nom: row.nom,
          pseudo: row.pseudo,
          nb_aime: row.nb_aime
        }));
        res.status(200).json({
          images: images
        });
      }
    })
})

module.exports = router