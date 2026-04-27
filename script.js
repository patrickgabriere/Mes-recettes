// 1. On importe tout ce qu'on a besoin d'un coup
import { 
    getDocs, 
    collection, 
    addDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let cuisine = document.getElementById("liste-cuisine");
let patisserie = document.getElementById("liste-patisserie");

// 2. Charger les recettes au démarrage
async function chargerRecettes() {
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let recettes = [];
    snapshot.forEach(doc => {
        recettes.push({ id: doc.id, ...doc.data() });
    });
    afficherRecettes(recettes);
}

// 3. Afficher les recettes (avec une jolie liste à puces)
function afficherRecettes(recettes) {
    cuisine.innerHTML = "";
    patisserie.innerHTML = "";

    recettes.forEach(r => {
        // Transformation des ingrédients en liste HTML
        let ingList = "<ul>" + r.ingredients.map(i => `<li>${i}</li>`).join('') + "</ul>";
        
        // Transformation des étapes en liste ordonnée (1, 2, 3...)
        let etapesList = "<ol>" + r.etapes.map(e => `<li>${e}</li>`).join('') + "</ol>";

        let html = `
            <div class="recette">
                <h2>${r.nom}</h2>
                <span class="categorie">${r.categorie}</span>
                <p><strong>Ingrédients :</strong></p>
                ${ingList}
                <p><strong>Préparation :</strong></p>
                ${etapesList}
                <button onclick="supprimerRecette('${r.id}')">Supprimer</button>
            </div>
        `;

        if (r.categorie === "pâtisserie") {
            patisserie.innerHTML += html;
        } else {
            cuisine.innerHTML += html;
        }
    });
}

// 4. Ajouter une recette
window.ajouterRecette = async function() {
    let nom = document.getElementById("nom").value;
    // .split(",") transforme le texte "sel,poivre" en tableau ["sel", "poivre"]
    let ingredients = document.getElementById("ingredients").value.split(",");
    let etapes = document.getElementById("etapes").value.split(",");
    let categorie = document.getElementById("categorie").value;

    if(nom === "") return alert("Donne un nom à la recette !");

    await addDoc(collection(window.db, "recettes"), {
        nom,
        ingredients,
        etapes,
        categorie
    });

    // On vide le formulaire
    document.getElementById("nom").value = "";
    document.getElementById("ingredients").value = "";
    document.getElementById("etapes").value = "";
    
    chargerRecettes();
};

// 5. Supprimer une recette (avec confirmation)
window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        await deleteDoc(doc(window.db, "recettes", id));
        chargerRecettes();
    }
};

// 6. Rechercher une recette (Filtrage local)
window.rechercherRecette = async function() {
    let texte = document.getElementById("recherche").value.toLowerCase();
    const snapshot = await getDocs(collection(window.db, "recettes"));
    
    let resultats = [];
    snapshot.forEach(doc => {
        let data = doc.data();
        if (data.nom.toLowerCase().includes(texte)) {
            resultats.push({ id: doc.id, ...data });
        }
    });
    
    afficherRecettes(resultats);
};

// On lance le premier chargement
chargerRecettes();
