const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const User = require('./user/user.js');
const cors = require('cors');
const middlewares = require('./middlewares/authentification')

const port = 3000; 

const pool = new Pool({
  host: 'localhost',
  user: process.env.USER,
  database: process.env.DB,
  password: process.env.DB_MDP,
  port : 5432,
})

const corsOption = {
  origin: true,
  credentials: true,
}

const app = express();
app.use(cors(corsOption));
app.use(bodyParser.json());
app.use(cookieParser())

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
  console.log(mdp)
  const requete_SQL = `CALL ajout_user($1, $2, $3)`;
  const valeurs = [pseudo,get_hash(mdp),email];
  pool.query(requete_SQL, valeurs,(erreur, resultat) => {
    if (erreur) {
      console.error('Erreur lors de l\'exécution de la requête', erreur);
      res.status(202).send("L'email ou le pseudo est déjà utilisé");
    } else {
      // Renvoie les résultats de la requête en tant que réponse HTTP
      res.status(201).send("success");
    }
  })
});

app.post('/user/connexion', (req,res) => {
  const { email, mdp } = req.body;
  const requete_SQL = 'SELECT mdp,pseudo FROM utilisateur WHERE adresse_mail = $1'
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
            console.error("Erreur lors de la comparaison des mdp");
            res.status(500).send("Erreur lors de la connexion")
          }
          else {
            if(result){
              const token = User.generateAccessToken(resultatSQL.rows[0].pseudo);
              res.cookie('token', token, { httpOnly: true });     
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

app.get('/user/verification', middlewares.authentificateToken, (req,res) =>{
  res.status(200).send('success');
})

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
