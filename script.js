import { 
    getDocs, 
    collection, 
    addDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const cuisine = document.getElementById("liste-cuisine");
const patisserie = document.getElementById("liste-patisserie");

// 1. Charger les recettes
window.chargerRecettes = async function() {
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let recettes = [];
    snapshot.forEach(doc => {
        recettes.push({ id: doc.id, ...doc.data() });
    });
    afficherRecettes(recettes);
}

// 2. Afficher les recettes (avec gestion Image)
function afficherRecettes(recettesALister) {
    cuisine.innerHTML = "";
    patisserie.innerHTML = "";

    recettesALister.forEach(r => {
        // Gestion de l'image (si vide, on met un placeholder)
        const imgUrl = r.image && r.image.trim() !== "" ? r.image : "https://via.placeholder.com/300x150?text=Pas+d'image";
        
        const ingredientsHTML = Array.isArray(r.ingredients) ? r.ingredients.join(', ') : r.ingredients;
        const etapesHTML = Array.isArray(r.etapes) ? r.etapes.map(e => `<li>${e}</li>`).join('') : `<li>${r.etapes}</li>`;

        const html = `
            <div class="recette">
                <img src="${imgUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
                <h2>${r.nom}</h2>
                <span class="categorie">${r.categorie}</span>
                <p><strong>Ingrédients :</strong> ${ingredientsHTML}</p>
                <ol>${etapesHTML}</ol>
                <button onclick="supprimerRecette('${r.id}')">Supprimer</button>
            </div>
        `;

        if (r.categorie === "pâtisserie" || r.categorie === "dessert") {
            patisserie.innerHTML += html;
        } else {
            cuisine.innerHTML += html;
        }
    });
}

// 3. Ajouter une recette (avec le lien image)
window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    const ingredients = document.getElementById("ingredients").value.split(",");
    const etapes = document.getElementById("etapes").value.split(",");
    const categorie = document.getElementById("categorie").value;
    const image = document.getElementById("imageLien").value;

    if (nom === "") return alert("Donne un nom à la recette !");

    await addDoc(collection(window.db, "recettes"), {
        nom, ingredients, etapes, categorie, image
    });

    // On vide les champs
    document.getElementById("nom").value = "";
    document.getElementById("ingredients").value = "";
    document.getElementById("etapes").value = "";
    document.getElementById("imageLien").value = "";
    
    window.chargerRecettes();
};

// 4. Filtrer par catégorie (Boutons)
window.filtrerParCategorie = async function(cat) {
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let resultats = [];
    snapshot.forEach(doc => {
        let r = doc.data();
        if (cat === "" || r.categorie === cat) {
            resultats.push({ id: doc.id, ...r });
        }
    });
    afficherRecettes(resultats);
};

// 5. Rechercher par nom (Barre de recherche)
window.rechercherParNom = async function() {
    const texte = document.getElementById("recherche").value.toLowerCase();
    const snapshot = await getDocs(collection(window.db, "recettes"));
    let resultats = [];
    snapshot.forEach(doc => {
        let r = doc.data();
        if (r.nom.toLowerCase().includes(texte)) {
            resultats.push({ id: doc.id, ...r });
        }
    });
    afficherRecettes(resultats);
};

// 6. Supprimer
window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        await deleteDoc(doc(window.db, "recettes", id));
        window.chargerRecettes();
    }
};

window.chargerRecettes();
