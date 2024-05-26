const express = require('express');
const router = express.Router();
const multer  = require('multer'); // Middleware pour gérer les fichiers
const middlewares = require('./../middlewares/authentification')
const pool = require('./../database/database.js');
const { getPseudoWithIdUser, FoundIdDessinWithNomAndIdUser, FoundIdUserWithPseudo} = require('./../annexe/functionGet.js');
const likes = require("./../websocket/likes.js");


// Configuration de multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Spécifiez le répertoire de destination où les fichiers téléchargés seront enregistrés
        cb(null, './../uploads/')
    },
    filename: function (req, file, cb) {
        // Spécifiez le nom de fichier pour chaque fichier téléchargé
        cb(null, file.originalname)
    }
  });
  
const upload = multer({ storage: storage });
  
//Ajout d'un signalement
router.post('/report', middlewares.authentificateToken, async (req,res) => {
    try{
      const requete_SQL = 'CALL ajout_signalement($1,$2,$3)';
      const id_user = req.user.id_user;
      const id_user_auteur = await FoundIdUserWithPseudo(req.body.pseudo);
      const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user_auteur,req.body.nom);
      const raison = req.body.raison;
      pool.query(requete_SQL, [id_user,id_dessin,raison], (erreur , resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
          res.status(200).json({
            authorization: true
            
          })
        }
      })
    }
    catch (error) {
      console.log(error)
      res.status(500).send(error);
    }
  })

//Ajout d'un dessin
router.post('/', middlewares.authentificateToken,upload.single('file'), async (req, res) => {
    try {
      const id_user = req.user.id_user;
      const nom = req.body.newName;
      const visibilite = req.body.public; //necessite d'utiliser un parser d'un form car le json empêche l'envoie correct des fichiers
      const imageFile = req.body.file;
      const base64Data = imageFile.replace(/^data:image\/png;base64,/, '')
      const pseudo = await getPseudoWithIdUser(id_user);
      const requete_SQL = 'CALL ajout_dessin($1, $2, $3, $4)';
      pool.query(requete_SQL, [base64Data,visibilite,nom, id_user], (erreur, resultat) => {
        if (erreur) {
          console.error("problème d'ajout dans la bdd", erreur);
          res.status(500).send("Erreur lors de l'ajout dans la base de données");
        } else {
          likes.SetLikes(`${nom}/${pseudo}`,0);
          res.status(201).json({authorization: true});
        }
      });
    }
    catch (error) {
      console.error("Une erreur est survenue", error);
      res.status(500).send("Une erreur est survenue lors de la recherche de l'utilisateur");
    }
  });

//Permet de récupérer un dessin en fonction de l'id_user et du nom
router.post('/select', middlewares.authentificateToken, async (req,res) => {
    try {
      const id_user = req.user.id_user
      const requete_SQL = 'SELECT image FROM dessin WHERE id_user = $1 and nom = $2';
      pool.query(requete_SQL,[id_user,req.body.nom], (erreur, resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
          res.status(200).json({authorization: true, image:resultat.rows[0].image});
        }
      })
    } 
    catch(error) {
      res.status(500).send(error);
    }
  })

//Permet de récupérer les dessins d'un utilisateur
router.get('/', middlewares.authentificateToken, async (req, res) => {
    try {
      const id_user = req.user.id_user
      const requete_SQL = 'SELECT image, nom, visibilite, favori FROM dessin WHERE id_user = $1';
      pool.query(requete_SQL, [id_user], (erreur, resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        } else {
          const images = resultat.rows.map(row => ({ //crée un tableau de dictionnaire avec les données de chaque image
            imageData: row.image,
            nom: row.nom,
            visibilite: row.visibilite,
            favori: row.favori
          }));
          res.status(200).json({
            authorization: true,
            images: images
          });
        }
      });
    } 
    catch (error) {
      console.error("Une erreur est survenue", error);
      res.status(500).send("Une erreur est survenue lors de la recherche de l'utilisateur");
    }
  });

//Permet de supprimer un dessin en fonction de l'id_user et du nom
router.delete('/', middlewares.authentificateToken, async (req,res) => {
    try {
      const id_user = req.user.id_user
      const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user,req.body.nom);
      const pseudo = await getPseudoWithIdUser(id_user);
      const requete_SQL = 'delete from dessin where id_dessin = $1'
      pool.query(requete_SQL, [id_dessin], (erreur,resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
            likes.DeleteLikes(`${req.body.nom}/${pseudo}`);
            res.status(200).json({authorization: true});
        }
      })
    }
    catch (error){
      res.status(500).send(error);
    }
  })

//Permet d'ajouter un dessin en favori
router.put('/favori', middlewares.authentificateToken, async(req,res) =>{
    try {
      const id_user = req.user.id_user
      const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user,req.body.nom);
      const requete_SQL = 'UPDATE dessin SET favori=$1 where id_dessin = $2'
      pool.query(requete_SQL,[true,id_dessin], (erreur, resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
          res.status(200).json({authorization: true});
        }
      })
    } 
    catch(error) {
      res.status(500).send(error);
    }
  })

//Permet d'enlever un dessin des favoris
router.put('/unfavori', middlewares.authentificateToken, async (req,res) => {
    try {
      const id_user = req.user.id_user;
      const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user,req.body.nom);
      const requete_SQL = 'UPDATE dessin SET favori=$1 where id_dessin = $2' 
      pool.query(requete_SQL,[false,id_dessin], (erreur, resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
          res.status(200).json({authorization: true});
        }
      })
    }
    catch(error) {
      res.status(500).send(error);
    }
  })

//Permet de rendre un dessin public
router.put('/public', middlewares.authentificateToken, async(req,res) =>{
    try {
      const id_user = req.user.id_user
      const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user,req.body.nom);
      const requete_SQL = 'UPDATE dessin SET visibilite=$1 where id_dessin = $2'
      pool.query(requete_SQL,[2,id_dessin], (erreur, resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
          res.status(200).json({authorization: true});
        }
      })
    } 
    catch(error) {
      res.status(500).send(error);
    }
  })

//Permet de rendre un dessin privé
router.put('/unpublic', middlewares.authentificateToken, async(req,res) =>{
    try {
      console.log('favori');
      const id_user = req.user.id_user
      const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user,req.body.nom);
      const requete_SQL = 'UPDATE dessin SET visibilite=$1 where id_dessin = $2'
      pool.query(requete_SQL,[1,id_dessin], (erreur, resultat) => {
        if (erreur) {
          console.error("problème de recherche dans la bdd", erreur);
          res.status(500).send("Erreur lors de la recherche dans la base de données");
        }
        else {
          res.status(200).json({authorization: true});
        }
      })
    } 
    catch(error) {
      res.status(500).send(error);
    }
})

module.exports = router