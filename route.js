const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const User = require('./user/user.js');
const cors = require('cors');
const middlewares = require('./middlewares/authentification')
const session = require('express-session');
const multer  = require('multer'); // Middleware pour gérer les fichiers
const fs = require('fs');
const { rejects } = require('assert');


const port = 3000; 

const pool = new Pool({
  host: 'localhost',
  user: process.env.USER,
  database: process.env.DB,
  password: process.env.DB_MDP,
  port : 5432,
})

const app = express();
app.use(cors({ origin: 'http://localhost:5500', credentials: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Configuration de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      // Spécifiez le répertoire de destination où les fichiers téléchargés seront enregistrés
      cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
      // Spécifiez le nom de fichier pour chaque fichier téléchargé
      cb(null, file.originalname)
  }
});

const upload = multer({ storage: storage });

function get_hash(password){
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds); // prefere the async "hash" method in production
}

app.get('/user', (req, res) => {
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


app.post('/user/inscription', (req, res) => {
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

app.post('/user/connexion', (req,res) => {
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

app.get('/user/deconnexion', middlewares.authentificateToken, (req,res) => {
  middlewares.deleteTokenWithId(req.user.id_user)
  res.clearCookie('token');
  res.status(200).json({ authorization: true });
})

app.get('/user/verification', middlewares.authentificateToken, (req,res) =>{
  //middlewares.sendRefreshToken(req.user,res);
  res.status(200).json({ authorization: true });
})

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

function FoundIdDessinWithNomAndIdUser(id_user,nom) {
  return new Promise((resolve, reject) => {
    const requete_SQL = "SELECT id_dessin FROM dessin WHERE id_user=$1 and nom = $2";
    pool.query(requete_SQL, [id_user,nom], (erreur, resultat) => {
      if (erreur) {
        console.log("problème dans la recherche de l'utilisateur", erreur);
        reject(erreur);
      } else {
        console.log(resultat.rows[0].id_dessin);
        resolve(resultat.rows[0].id_dessin); // Renvoie l'ID unique par pseudo
      }
    });
  });
}

app.post('/user/dessin', middlewares.authentificateToken,upload.single('file'), async (req, res) => {
  try {
    const id_user = req.user.id_user;
    const nom = req.body.newName;
    const visibilite = req.body.public; //necessite d'utiliser un parser d'un form car le json empêche l'envoie correct des fichiers
    const imageFile = req.body.file;
    const base64Data = imageFile.replace(/^data:image\/png;base64,/, '')
    const requete_SQL = 'CALL ajout_dessin($1, $2, $3, $4)';
    pool.query(requete_SQL, [base64Data,visibilite,nom, id_user], (erreur, resultat) => {
      if (erreur) {
        console.error("problème d'ajout dans la bdd", erreur);
        res.status(500).send("Erreur lors de l'ajout dans la base de données");
      } else {
        res.status(201).json({authorization: true});
      }
    });
  }
  catch (error) {
    console.error("Une erreur est survenue", error);
    res.status(500).send("Une erreur est survenue lors de la recherche de l'utilisateur");
  }
});

app.post('/user/dessin/select', middlewares.authentificateToken, async (req,res) => {
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

app.put('/user/dessin', middlewares.authentificateToken,upload.single('file'), async (req,res) => {
  try {
    const id_user = req.user.id_user
    const imageFile = req.body.file;
    const base64Data = imageFile.replace(/^data:image\/png;base64,/, '')
    const requete_SQL = 'UPDATE dessin SET image=$1, nom=$2, visibilite=$3 WHERE id_user = $4 and nom = $5';
    console.log(req.body);
    pool.query(requete_SQL,[base64Data,req.body.newName,req.body.public,id_user,req.body.oldName], (erreur, resultat) => {
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

app.get('/user/dessin', middlewares.authentificateToken, async (req, res) => {
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
        console.log(images[0]);
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

app.delete('/user/dessin', middlewares.authentificateToken, async (req,res) => {
  try {
    const id_user = req.user.id_user
    const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user,req.body.nom);
    const requete_SQL = 'delete from dessin where id_dessin = $1'
    pool.query(requete_SQL, [id_dessin], (erreur,resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        res.status(200).json({authorization: true});
      }
    })
  }
  catch (error){
    res.status(500).send(error);
  }
})

app.put('/user/dessin/favori', middlewares.authentificateToken, async(req,res) =>{
  try {
    console.log('favori');
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

app.put('/user/dessin/unfavori', middlewares.authentificateToken, async (req,res) => {
  try {
    console.log('unfavorite');
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

app.put('/user/dessin/public', middlewares.authentificateToken, async(req,res) =>{
  try {
    console.log('favori');
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

app.put('/user/dessin/unpublic', middlewares.authentificateToken, async(req,res) =>{
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
        console.log(mdp)
        console.log(mdpcrypte)
        bcrypt.compare(mdp, mdpcrypte, (err, result) => {
        if(err){
          console.log("test1");
          resolve(false);
        }
        else{
          if(result){
            console.log("test2")
            resolve(true);
          }
          else{
            console.log("test3")
            resolve(false)
          }
        }
        })
      };
    });
  })
}


app.put('/user/pseudo', middlewares.authentificateToken, async(req,res) => {
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

app.put('/user/mdp', middlewares.authentificateToken, async(req,res) => {
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

app.delete('/user', middlewares.authentificateToken, async(req,res) => {
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

app.post('user/public/dessin/', middlewares.authentificateToken, (req ,res) => {
  const requete_SQL = `SELECT pseudo,nom,image, Call estLike($1,id_dessin) as like FROM utilisateur, dessin
  WHERE dessin.id_user = utilisateur.id_user and dessin 
  and visibilite = 2 
  and dessin.nom like '%$2%' 
  and utilisateur.pseudo like '%$3%'`;
  const id_user = req.user.id_user;
  const pseudo = req.body.pseudo;
  const nom_dessin = req.body.nom_dessin;
  pool.query(requete_SQL, [id_user,nom_dessin,pseudo], (erreur, resultat) => {
    if (erreur) {
      console.error("problème de recherche dans la bdd", erreur);
      res.status(500).send("Erreur lors de la recherche dans la base de données");
    }
    else {
      const images = resultat.rows.map(row => ({ //crée un tableau de dictionnaire avec les données de chaque image
        imageData: row.image,
        nom: row.nom,
        pseudo: row.pseudo,
        like: row.like
      }));
      res.status(200).json({
        authorization: true,
        data: images
      });
    }
  })
})

app.post('public/dessin', (req,res) => {
  const requete_SQL = `SELECT pseudo,nom,image FROM utilisateur, dessin WHERE utilisateur.id_user = dessin.id_user`
  const pseudo = req.body.pseudo;
  const nom_dessin = req.body.nom_dessin;
  pool.query(requete_SQL, [id_user,nom_dessin,pseudo], (erreur, resultat) => {
    if (erreur) {
      console.error("problème de recherche dans la bdd", erreur);
      res.status(500).send("Erreur lors de la recherche dans la base de données");
    }
    else {
      const images = resultat.rows.map(row => ({ //crée un tableau de dictionnaire avec les données de chaque image
        imageData: row.image,
        nom: row.nom,
        pseudo: row.pseudo,
      }));
      res.status(200).json({
        data: images
      });
    }
  })
})

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


