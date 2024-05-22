const express = require('express');
const router = express.Router();
const middlewares = require('./../middlewares/authentification')
const pool = require('./../database/database.js');

router.get('/', middlewares.authentificateToken, middlewares.verifyAdminRight, (req,res) => {
    res.status(200).json({
      authorization: true
    })
  })
  
router.get('/signalement', middlewares.authentificateToken, middlewares.verifyAdminRight, (req,res) => {
    const requete_SQL = 'SELECT id_signalement,signalement.id_dessin,image,nom,pseudo,raison FROM signalement,dessin,utilisateur WHERE signalement.id_dessin = dessin.id_dessin AND signalement.id_user = utilisateur.id_user'
    pool.query(requete_SQL, (erreur,resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        const images = resultat.rows.map(row => ({ //crée un tableau de dictionnaire avec les données de chaque image
          imageData: row.image,
          nom: row.nom,
          pseudo: row.pseudo,
          raison: row.raison,
          id_dessin:row.id_dessin,
          id_signalement:row.id_signalement
        }));
        res.status(200).json({
          authorization: true,
          images :images
        })
      }
    })
  })
  
router.delete('/signalement/dessin' ,middlewares.authentificateToken, middlewares.verifyAdminRight, (req,res) =>{
    const requete_SQL = 'DELETE FROM dessin WHERE id_dessin = $1';
    pool.query(requete_SQL, [req.body.id_dessin], (erreur,resultat) => {
      if(erreur) {
        console.error("problème de suppresion dans la bdd", erreur);
        res.status(500).send("Erreur lors de la suppresion dans la base de données");
      }
      else {
        res.status(200).json({
          authorization: true
        })
      }
    })
  })
  
router.delete('/signalement' ,middlewares.authentificateToken, middlewares.verifyAdminRight, (req,res) =>{
    const requete_SQL = 'DELETE FROM signalement WHERE id_signalement = $1';
    pool.query(requete_SQL, [req.body.id_signalement], (erreur,resultat) => {
      if(erreur) {
        console.error("problème de suppresion dans la bdd", erreur);
        res.status(500).send("Erreur lors de la suppresion dans la base de données");
      }
      else {
        res.status(200).json({
          authorization: true
        })
      }
    })
  })

module.exports = router