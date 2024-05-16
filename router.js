import { Router } from  "express";
import {Balades } from "./model.js"; 
import { isValidObjectId } from "mongoose";




const router = Router();

router.get('/', (req, rep) => {
    rep.json("Bonjour");
})

//recuperer tous les balades de la bdd:
router.get("/all", async function(req, rep){
    const reponse = await Balades.find({})
    rep.json(reponse);
})

//recuperer une balade par son id
router.get("/id/:id", async function (req, rep){
    const id =req.params.id;

    const verif = isValidObjectId(id)

    if(!verif){
        return rep.status(400).json({msg : "id invalid"});
    }

    const reponse = await Balades.findById({_id : id})
    rep.json({reponse});
})

//chercher des mots ou des lettres dans les clés:  nom_poi et texte_intro (Regex)
router.get("/search/:search", async function (req, rep) {
    const searchTerm = req.params.search;
    const regex = new RegExp(searchTerm, 'i'); 
  
    try {
      const response = await Balades.find({
        $or: [
          { nom_poi: { $regex: regex } },
          { texte_intro: { $regex: regex } },
        ],
      });
      rep.json(response);
    } catch (error) {
      rep.status(500).json({ msg: "Server error" });
    }
});


//chercher url_site qui sont pas null:
router.get("/site-internet", async function (req, rep) {
    const response = await Balades.find({ 
        url_site: { 
            $exists: true, 
            $ne: null  
        } 
    });
    rep.json(response);
})


// recuperer tous les balades qui ont 5 mots dans le clé: mot-cle
router.get("/mot-cle", async function(req, rep){
    const response = await Balades.find({ mot_cle: { $size: 5 } }); //$size, il faut lui passé le nombre directement sans un object.
    rep.json(response);
})


//tous les balades publiés lors de l'année passé en paramètre d'url, organiser par order croissant:
router.get("/publie/:annee", async function (req, rep) {
    const annee = req.params.annee;
    const regex = new RegExp(`^${annee}-`);
  
    const balades = await Balades.find({ 
        date_saisie: { $regex: regex } 
    }).sort({ 
        date_saisie: 1 
    });
    rep.json(balades);
});


// permettre de compter le nombre de balade pour l'arrondissement écrit dans la clé:num 
router.get("/arrondissement/:num_arrondissement", async function (req, rep) {
    const code_postal = req.params.num_arrondissement;
  
    const count = await Balades.countDocuments({ 
        code_postal: code_postal 
    });
    rep.json({ count: count });
   
});


//afficher par arrondissement le nombre de balades disponibles:
router.get("/synthese", async function (req, rep) {

    const result = await Balades.aggregate([
        {
          $group: {
            _id: "$code_postal",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
    ]);
  
    rep.json(result);
});
  

// afficher les différentes catégories distinctes de balades disponibles en base de donnée
router.get("/categories", async function (req, rep) {
   
    const categories = await Balades.distinct("categorie");
    rep.json(categories);
});
  

//10:permet de créer une nouvelle balade : Attention les clés « nom_poi » / « adresse » et « categorie » sont obligatoires
router.post("/add", async function (req, rep) {
    const newBalade = new Balades(req.body);
  
    if (!newBalade.nom_poi || !newBalade.adresse || !newBalade.categorie) {
      return rep.status(400).json({ msg: "Missing required fields" });
    }
  
    const result = await newBalade.save();
    rep.json(result);
   
});


//permet d'ajouter un mot clé à une balade existante dans sa clé « mot_cle », Attention le mot clé ajouté en doit pas être en doublon avec les mots clé existant. Attention si l'id est invalide afficher une message d'erreur
router.put("/add-mot-cle/:id", async function (req, rep) {
    const id = req.params.id;
  
    if (!isValidObjectId(id)) {
      return rep.status(400).json({ msg: "ID invalide" });
    }
 
    const balade = await Balades.findById(id);

    if (!balade) {
    return rep.status(404).json({ msg: "Balade non trouvée" });
    }

    const nouveauMotCle = req.body.mot_cle;

    if (balade.mot_cle.includes(nouveauMotCle)) {
    return rep.status(409).json({ msg: "Mot clé déjà présent" });
    }

    balade.mot_cle.push(nouveauMotCle);
    await balade.save();

    rep.status(200).json({ msg: "Mot clé ajouté avec succès" });

});
  
 
//permet de mettre à jour une balade via son id, Attention si l'id est invalide afficher une message d'erreur
router.put('/update-one/:id', async (req, res) => {
    try {
      const updatedBalade = await Balades.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updatedBalade) {
        return res.status(404).json({ message: 'Balade not found' });
      }
      res.status(200).json(updatedBalade);
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      res.status(500).json({ message: error.message });
    }
});
  

//13:permet de mettre à jour « nom_poi » de plusieurs balades distante si leur « texte_description » contient les lettres dans la clé search qui est dans l'ur
router.put("/update-many/:search", async (req, res) => {
    const searchTerm = req.params.search;
    const newNomPoi = req.body.nom_poi;
  
    if (!newNomPoi) {
      return res.status(400).json({ message: "Missing required field: nom_poi" });
    }
  
    const balades = await Balades.find({
    texte_description: { $regex: searchTerm, $options: "i" },
    });

    for (const balade of balades) {
    balade.nom_poi = newNomPoi;
    await balade.save();
    }

    res.status(200).json({ message: "Mise à jour réussie" });

});
  

// permet de supprimer une balade via son id , Attention si l'id est invalide afficher une message d'erreur
router.delete('/delete/:id', async (req, res) => {
    try {
      const deletedBalade = await Balades.findByIdAndDelete(req.params.id);
      if (!deletedBalade) {
        return res.status(404).json({ message: 'Balade not found' });
      }
      res.status(200).json({ message: 'Balade deleted successfully' });
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      res.status(500).json({ message: error.message });
    }
});
  



//remarque sur 10: sur le model pour la clé: type(cas spéciale) , il faut pas mettre: (type:string ). mais il faut mettre : (type:{type:string})
// $ ne pour chercher une valeur qui nest pas: dans notre cas qui egale pas à null
//numero 7: (remarque pour moi: ce que je dois mettre sur url commet nom (:num_arrondissement) doit etre sur le params mais je peux le nommer comme je veux.)
//remarque pour moi: tabulation, le contraire: shift+tabulation
export default router ;