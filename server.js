import express from "express";
import router from "./router.js";
import {connect} from "mongoose";

connect("mongodb+srv://hindtoutaoui96:Vp75nJCK6uPA3c5l@cluster0.4pfo5e8.mongodb.net/Paris")
    .then(function(){
        console.log("Connexion MongoDB réussie")
    })
    .catch(function(err){
        console.log(new Error(err))
    })

const app = express();
const PORT = 1235;

app.use(express.json());

app.use(router);

app.listen(PORT,function() {
    console.log(`serveur express d'écoute sur le port ${PORT}`)
})