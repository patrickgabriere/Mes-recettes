// 1. On importe les outils nécessaires
import { 
    getDocs, 
    collection, 
    addDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const cuisine = document.getElementById("liste-cuisine");
const patisserie = document.getElementById("liste-patisserie");

// 2. Fonction pour afficher (on s'assure qu'elle gère bien les données)
function afficherRecettes(recettesALister) {
    cuisine.innerHTML = "";
    patisserie.innerHTML = "";

    recettesALister.forEach(r => {
        const ingredientsTexte = Array.isArray(r.ingredients) ? r.ingredients.join(', ') : r.ingredients;
        const etapesHTML = Array.isArray(r.etapes) ? r.etapes.map(e => `<li>${e}</li>`).join('') : `<li>${r.etapes}</li>`;

        const html = `
            <div class="recette">
                <h2>${r.nom}</h2>
                <span class="categorie">${r.categorie}</span>
                <p><strong>Ingrédients :</strong> ${ingredientsTexte}</p>
                <ol>${etapesHTML}</ol>
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

// 3. Charger les recettes depuis Firebase
window.chargerRecettes = async function() {
    try {
        const snapshot = await getDocs(collection(window.db, "recettes"));
        let recettes = [];
        snapshot.forEach(doc => {
            recettes.push({ id: doc.id, ...doc.data() });
        });
        afficherRecettes(recettes);
    } catch (error) {
        console.error("Erreur Firebase :", error);
    }
};

// 4. Ajouter une recette
window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    const ingredients = document.getElementById("ingredients").value.split(",");
    const etapes = document.getElementById("etapes").value.split(",");
    const categorie = document.getElementById("categorie").value;

    if (nom === "") return alert("Donne un nom à la recette !");

    await addDoc(collection(window.db, "recettes"), {
        nom, ingredients, etapes, categorie
    });

    document.getElementById("nom").value = "";
    document.getElementById("ingredients").value = "";
    document.getElementById("etapes").value = "";
    
    window.chargerRecettes();
};

// 5. Supprimer une recette
window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        await deleteDoc(doc(window.db, "recettes", id));
        window.chargerRecettes();
    }
};

// 6. Rechercher (Filtrage local pour plus de rapidité)
window.rechercherRecette = async function() {
    const texte = document.getElementById("recherche").value.toLowerCase();
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let resultats = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.nom.toLowerCase().includes(texte)) {
            resultats.push({ id: doc.id, ...data });
        }
    });
    
    afficherRecettes(resultats);
};

// Lancement au démarrage
window.chargerRecettes();
