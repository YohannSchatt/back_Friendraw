const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cors = require('cors');
const http = require('http');
const middlewares = require('./middlewares/authentification.js')
const likes = require("./websocket/likes.js");
const pool = require('./database/database.js');
const { getPseudoWithIdUser, FoundIdDessinWithNomAndIdUser, FoundIdUserWithPseudo} = require('./annexe/functionGet.js');
const multer  = require('multer'); // Middleware pour gérer les fichiers


const PORT = process.env.PORT || 3001; 

const app = express();
app.use(cors({ origin: [`${process.env.URL_FRONT}`], credentials: true }));
app.use(bodyParser.json({ limit: '50mb' })); //pour faire passer les images en base64
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser()); //faciliter l'utilisation des cookies

// Import des routes
const usersRouter = require('./route/user.js');
const usersDessinRouter = require('./route/UserDessin.js')
const AdminRouter = require('./route/admin.js')
const publicRouter = require('./route/public.js')

// Utilisation des routes
app.use('/user', usersRouter);
app.use('/user/dessin', usersDessinRouter);
app.use('/admin', AdminRouter);
app.use('/public', publicRouter);

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

const upload = multer({ storage: storage })


//-------------------------Web Socket---------------------------------------

//Met à jour les likes des dessins lors du lancement du serveur
likes.CreateLikes();

const server = http.createServer(app);
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server });

//Connexion d'un client
wss.on('connection', (ws) => {
  console.log('Client connecté');
})

//Route pour ajouter un like à un dessin
app.post('/user/dessin/like', middlewares.authentificateToken, async (req,res) => {
  try {
    const requete_SQL = 'INSERT INTO aime (id_user, id_dessin) VALUES ($1, $2)';
    const id_user = req.user.id_user;
    const id_user_auteur = await FoundIdUserWithPseudo(req.body.pseudo);
    const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user_auteur,req.body.nom);
    const drawingId = `${req.body.nom}/${req.body.pseudo}`;
    pool.query(requete_SQL, [id_user,id_dessin], (erreur , resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        if (likes.HasLikes(drawingId)){
          const nb_like = likes.GetLikes(drawingId)+1
          likes.SetLikes(drawingId,nb_like);
          wss.clients.forEach((client) => { //envoie au client par websockets du nombre de like pour le mettre à jour en temps réel
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'updateLikes',
                drawingId: drawingId,
                likes: nb_like
              }));
            }
          });
          res.status(200).json({
            authorization: true
          })
        }
        else {
          console.log("Le dessin que vous avez liké n'existe pas")
          res.status(500).send("Le dessin que vous avez liké n'existe pas");
        }
      }
    })
  }
  catch (error) {
    console.log(error)
    res.status(500).send(error);
  }
})

//Route pour supprimer un like à un dessin
app.delete('/user/dessin/like', middlewares.authentificateToken, async (req,res) => {
  try {
    const requete_SQL = 'DELETE FROM aime WHERE id_user = $1 AND id_dessin = $2';
    const id_user = req.user.id_user;
    const id_user_auteur = await FoundIdUserWithPseudo(req.body.pseudo);
    const id_dessin = await FoundIdDessinWithNomAndIdUser(id_user_auteur,req.body.nom);
    const drawingId = `${req.body.nom}/${req.body.pseudo}`;
    pool.query(requete_SQL, [id_user,id_dessin], (erreur , resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        if (likes.HasLikes(drawingId)){
          const nb_like = likes.GetLikes(drawingId)-1
          likes.SetLikes(drawingId,nb_like)
          wss.clients.forEach((client) => { //envoie au client par websockets du nombre de like pour le mettre à jour en temps réel
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'updateLikes',
                drawingId: drawingId,
                likes: nb_like
              }));
            }
          });
          res.status(200).json({
            authorization: true
          })
        }
        else {
          res.status(500).send("Le dessin que vous avez liké n'existe pas");
        }
      }
    })
  }
  catch (error) {
    console.log(error)
    res.status(500).send(error);
  }
})

//Route pour modifier le nom d'un dessin et son image
app.put('/user/dessin/', middlewares.authentificateToken,upload.single('file'), async (req,res) => {
  try {
    const id_user = req.user.id_user
    const imageFile = req.body.file;
    const pseudo = await getPseudoWithIdUser(id_user);
    const base64Data = imageFile.replace(/^data:image\/png;base64,/, '')
    const requete_SQL = 'UPDATE dessin SET image=$1, nom=$2, visibilite=$3 WHERE id_user = $4 and nom = $5';
    pool.query(requete_SQL,[base64Data,req.body.newName,req.body.public,id_user,req.body.oldName], (erreur, resultat) => {
      if (erreur) {
        console.error("problème de recherche dans la bdd", erreur);
        res.status(500).send("Erreur lors de la recherche dans la base de données");
      }
      else {
        const idDrawing = `${req.body.oldName}/${pseudo}`;
        const nb_like = likes.GetLikes(idDrawing);
        likes.SetLikes(`${req.body.newName}/${pseudo}`,nb_like);
        likes.DeleteLikes(idDrawing);
        wss.clients.forEach((client) => { //envoie au client par websockets du nombre de like pour le mettre à jour en temps réel
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'updateNomDessin',
              newId: `${req.body.newName}/${pseudo}`,
              oldId: idDrawing
            }));
          }
        });
        res.status(200).json({authorization: true});
      }
    })
  } 
  catch(error) {
    res.status(500).send(error);
  }
})

//-------------------------Back Online--------------------------------------

// Route de healthcheck
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

//Lance le serveur
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = wss