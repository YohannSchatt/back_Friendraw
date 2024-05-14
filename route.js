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

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 900000, sameSite: 'none'}
}));

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

// Refresh an access token using a valid refresh token
app.post('/token/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    return res.sendStatus(401);
  }
  const result = verifyRefreshToken(refreshToken);  
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  const user = result.data;
  const newAccessToken = generateAccessToken(user);
  res.json({ accessToken: newAccessToken });
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
      // Renvoie les résultats de la requête en tant que réponse HTTP
      fs.mkdir(`${pseudo}`)
      res.status(201).send("success");
    }
  })
});

app.post('/user/connexion', (req,res) => {
  const { email, mdp } = req.body;
  const requete_SQL = 'SELECT mdp,pseudo,droit FROM utilisateur WHERE adresse_mail = $1'
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
              const token = User.generateAccessToken(resultatSQL.rows[0].pseudo,resultatSQL.rows[0].droit);
              res.cookie('token', token, { httpOnly: true, maxAge: 900000, path:'/', secure: true, sameSite: 'none' });
              res.status(200).json( { success : true });
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
  console.log(req.user.pseudo);
  middlewares.deleteTokenWithPseudo(req.user.pseudo)
  res.status(200).json({ authorization: true });
})

app.get('/user/verification', middlewares.authentificateToken, (req,res) =>{
  res.status(200).json({ authorization: true });
})

function FoundIdWithPseudo(pseudo) {
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

app.post('/dessin/ajout', middlewares.authentificateToken,upload.single('file'), async (req, res) => {
  try {
    const id_user = await FoundIdWithPseudo(req.user.pseudo);
    const nom = req.body.nom;
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

app.get('/dessin/chercher', middlewares.authentificateToken, async (req, res) => {
  try {
    const id_user = await FoundIdWithPseudo(req.user.pseudo);
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



app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
