import { 
    getDocs, 
    collection, 
    addDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let cuisine = document.getElementById("liste-cuisine");
let patisserie = document.getElementById("liste-patisserie");

// 1. Charger les recettes (Fonction principale)
async function chargerRecettes() {
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let recettes = [];
    snapshot.forEach(doc => {
        recettes.push({ id: doc.id, ...doc.data() });
    });
    afficherRecettes(recettes);
}

// 2. Afficher les recettes dans le HTML
function afficherRecettes(recettesALister) {
    cuisine.innerHTML = "";
    patisserie.innerHTML = "";

    recettesALister.forEach(r => {
        // On crée le HTML pour chaque recette
        let html = `
            <div class="recette">
                <h2>${r.nom}</h2>
                <span class="categorie">${r.categorie}</span>
                <p><strong>Ingrédients :</strong> ${Array.isArray(r.ingredients) ? r.ingredients.join(', ') : r.ingredients}</p>
                <ol>
                    ${r.etapes.map(e => `<li>${e}</li>`).join('')}
                </ol>
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

// 3. LA RECHERCHE (C'est ici que ça se joue !)
window.rechercherRecette = async function() {
    let texte = document.getElementById("recherche").value.toLowerCase();
    
    // On va chercher les recettes actuelles sur Firebase
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let toutesLesRecettes = [];
    snapshot.forEach(doc => {
        toutesLesRecettes.push({ id: doc.id, ...doc.data() });
    });

    // On filtre : on ne garde que celles dont le nom contient le texte tapé
    let resultats = toutesLesRecettes.filter(r => 
        r.nom.toLowerCase().includes(texte)
    );

    // On demande à ré-afficher seulement les résultats filtrés
    afficherRecettes(resultats);
};

// 4. Ajouter une recette
window.ajouterRecette = async function() {
    let nom = document.getElementById("nom").value;
    let ingredients = document.getElementById("ingredients").value.split(",");
    let etapes = document.getElementById("etapes").value.split(",");
    let categorie = document.getElementById("categorie").value;

    if(nom === "") return alert("Donne un nom !");

    await addDoc(collection(window.db, "recettes"), {
        nom, ingredients, etapes, categorie
    });

    document.getElementById("nom").value = "";
    document.getElementById("ingredients").value = "";
    document.getElementById("etapes").value = "";
    
    chargerRecettes();
};

// 5. Supprimer une recette
window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        await deleteDoc(doc(window.db, "recettes", id));
        chargerRecettes();
    }
};

// Lancer le chargement au démarrage
chargerRecettes();
