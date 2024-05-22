const express = require('express');
const router = express.Router();
const middlewares = require('./../middlewares/authentification.js')
const User = require('./../Token/AcessToken.js');
const pool = require('./../database/database.js'); 
const {verif_mdp,get_hash} = require('./../annexe/mdp.js')
const bcrypt = require('bcrypt');

router.get('/', middlewares.authentificateToken, middlewares.verifyAdminRight, (req, res) => {
    // Exemple de requête SQL
    const requeteSQL = 'SELECT * FROM utilisateur';
    // Exécute la requête SQL
    pool.query(requeteSQL, (erreur, resultat) => {
      if (erreur) {
        console.error('Erreur lors de l\'exécution de la requête', erreur);
        res.status(500).send('Erreur lors de l\'exécution de la requête');
      } else {
        // Renvoie les résultats de la requête en tant que réponse HTTP
        res.status(200).json(resultat.rows);
      }
    });
});
  
  
router.post('/inscription', (req, res) => {
    const { pseudo, mdp, email } = req.body;
    const requete_SQL = `CALL ajout_user($1, $2, $3)`;
    const valeurs = [pseudo,get_hash(mdp),email];
    pool.query(requete_SQL, valeurs,(erreur, resultat) => {
      if (erreur) {
        console.error('Erreur lors de l\'exécution de la requête', erreur);
        res.status(202).send("L'email ou le pseudo est déjà utilisé");
      } else {
        res.status(201).send("success");
      }
    })
});
  
router.post('/connexion', (req,res) => {
    const { email, mdp } = req.body;
    const requete_SQL = 'SELECT mdp,id_user,pseudo,droit FROM utilisateur WHERE adresse_mail = $1'
    pool.query(requete_SQL, [email], (erreur, resultatSQL) => {
      if (erreur){
        console.log("Erreur lors de l'exécution de la requête");
        res.status(500).send("Erreur lors de la connexion");
      }
      else {
        if (resultatSQL.rows.length === 0){
          res.status(404).send("Identifiant invalide");
        }
        else{
          const mdpcrypte = resultatSQL.rows[0].mdp;
          bcrypt.compare(mdp, mdpcrypte, (err, result) => {
            if(err) {
              console.error("Erreur pendant la comparaison des mdp");
              res.status(500).send("Erreur lors de la connexion");
            }
            else {
              if(result){
                const token = User.generateAccessToken(resultatSQL.rows[0].id_user,resultatSQL.rows[0].droit);
                res.cookie('token', token, { httpOnly: true, maxAge: 900000, path:'/'});
                res.status(200).json( { success : true , pseudo : resultatSQL.rows[0].pseudo});
              }
              else{
                res.status(401).json( {success : false});
              }
            }
          })
        }
      }
    })
})
  
router.get('/deconnexion', middlewares.authentificateToken, (req,res) => {
    middlewares.deleteTokenWithId(req.user.id_user)
    res.clearCookie('token');
    res.status(200).json({ authorization: true });
})
  
router.get('/verification', middlewares.authentificateToken, (req,res) =>{
    //middlewares.sendRefreshToken(req.user,res);
    res.status(200).json({ authorization: true });
})
  

router.put('/mdp', middlewares.authentificateToken, async(req,res) => {
    try{
      const id_user = req.user.id_user;
      const verification = await verif_mdp(req.body.oldMdp,id_user);
      const requete_SQL = 'UPDATE utilisateur SET mdp=$1 where id_user=$2'
      if (verification) {
        pool.query(requete_SQL,[get_hash(req.body.newMdp),id_user],(erreur,resultat) => {
          if (erreur) {
            console.error("problème de recherche dans la bdd", erreur);
            res.status(500).send("Erreur lors de la recherche dans la base de données");
          }
          else {
            res.status(200).json({authorization: true})
          }
        })
      }
      else {
        res.status(200).json({authorization: false})
      }
    }
    catch (error){
      res.status(500).send(error);
    }
})
  
router.delete('/', middlewares.authentificateToken, async(req,res) => {
    try{
      const id_user = req.user.id_user;
      const requete_SQL = 'DELETE FROM utilisateur WHERE id_user=$1'
        pool.query(requete_SQL,[id_user],(erreur,resultat) => {
          if (erreur) {
            console.error("problème de recherche dans la bdd", erreur);
            res.status(500).send("Erreur lors de la recherche dans la base de données");
          }
          else {
            res.clearCookie('token')
            middlewares.deleteTokenWithId(req.user.id_user);
            res.status(200).json({authorization: true})
          }
        })
      }
    catch (error){
      res.status(500).send(error);
    }
})

router.put('/pseudo', middlewares.authentificateToken, async(req,res) => {
    try{
      const id_user = req.user.id_user;
      const verification = await verif_mdp(req.body.mdp,id_user);
      const requete_SQL = 'UPDATE utilisateur SET pseudo=$1 where id_user=$2'
      if (verification) {
        pool.query(requete_SQL,[req.body.newPseudo,id_user],(erreur,resultat) => {
          if (erreur) {
            console.error("problème de recherche dans la bdd", erreur);
            res.status(500).send("Erreur lors de la recherche dans la base de données");
          }
          else {
            res.status(200).json({authorization: true})
          }
        })
      }
      else {
        res.status(200).json({authorization: false})
      }
    }
    catch (error){
      res.status(500).send(error);
    }
})

router.post('/public/dessin', middlewares.authentificateToken, (req ,res) => {
    const requete_SQL = `SELECT pseudo,nom,image, estLike($1,id_dessin) as aime, countLike(id_dessin) as nb_aime FROM utilisateur, dessin
    WHERE dessin.id_user = utilisateur.id_user
    and visibilite = 2 
    and dessin.nom like '%' || $2 || '%' 
    and utilisateur.pseudo like '%' || $3 || '%'`;
    const id_user = req.user.id_user;
    const pseudo = req.body.pseudo;
    const nom_dessin = req.body.nom;
    pool.query(requete_SQL, [id_user,nom_dessin,pseudo], (erreur, resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        console.log('resultat de la requête : ', resultat.rows)
        const images = resultat.rows.map(row => ({ //crée un tableau de dictionnaire avec les données de chaque image
          imageData: row.image,
          nom: row.nom,
          pseudo: row.pseudo,
          aime: row.aime,
          nb_aime: row.nb_aime
        }));
        console.log(images);
        res.status(200).json({
          authorization: true,
          images: images
        });
      }
    })
  })

module.exports = router