import { 
    getDocs, collection, addDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// 1. Configuration des catégories
const categoriesConfig = {
    cuisine: ["Entrée", "Plat", "Accompagnement"],
    pâtisserie: ["Gâteau", "Entremet", "Biscuit", "Tarte"]
};

// 2. Fonctions pour l'interface (accessibles depuis le HTML)
window.majSousCategories = function() {
    const univers = document.getElementById("univers").value;
    const select = document.getElementById("sousCategorie");
    if (!select) return;
    select.innerHTML = "";
    categoriesConfig[univers].forEach(cat => {
        let opt = document.createElement("option");
        opt.value = cat.toLowerCase();
        opt.text = cat;
        select.add(opt);
    });
};

window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    if (!nom) return alert("Le nom est obligatoire !");

    await addDoc(collection(window.db, "recettes"), {
        nom: nom,
        ingredients: document.getElementById("ingredients").value,
        etapes: document.getElementById("etapes").value,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        image: document.getElementById("imageLien").value
    });
    
    document.getElementById("nom").value = ""; // Vide le champ
    window.chargerRecettes();
};

window.chargerRecettes = async function() {
    if (!window.db) return; // Sécurité
    const snap = await getDocs(collection(window.db, "recettes"));
    const cDiv = document.getElementById("liste-cuisine");
    const pDiv = document.getElementById("liste-patisserie");
    
    cDiv.innerHTML = "";
    pDiv.innerHTML = "";

    snap.forEach(d => {
        const r = d.data();
        const card = `
            <div class="recette" style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px;">
                <img src="${r.image}" style="width:100%; height:120px; object-fit:cover; border-radius:5px;">
                <h3>${r.nom}</h3>
                <button onclick="window.supprimerRecette('${d.id}')" style="color:red; border:none; background:none; cursor:pointer;">Supprimer</button>
            </div>
        `;
        if (r.univers === "pâtisserie") pDiv.innerHTML += card;
        else cDiv.innerHTML += card;
    });
};

window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        await deleteDoc(doc(window.db, "recettes", id));
        window.chargerRecettes();
    }
};
// Cette fonction crée l'affichage détaillé quand on clique sur une recette
function afficherRecettes(recettesALister) {
    const cuisineContainer = document.getElementById("liste-cuisine");
    const patisserieContainer = document.getElementById("liste-patisserie");
    
    cuisineContainer.innerHTML = "";
    patisserieContainer.innerHTML = "";

    recettesALister.forEach(r => {
        const imgUrl = r.image || "https://via.placeholder.com/300x150?text=Pas+d'image";
        
        // On prépare les textes pour éviter les erreurs avec les apostrophes
        const nomEscaped = r.nom.replace(/'/g, "\\'");
        const ingredientsEscaped = r.ingredients.replace(/'/g, "\\'").replace(/\n/g, " ");
        const etapesEscaped = r.etapes.replace(/'/g, "\\'").replace(/\n/g, " ");

        const html = `
            <div class="recette" onclick="window.ouvrirRecette('${nomEscaped}', '${ingredientsEscaped}', '${etapesEscaped}', '${imgUrl}')" style="cursor:pointer;">
                <img src="${imgUrl}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
                <h2>${r.nom}</h2>
                <div style="display:flex; justify-content: space-between; align-items: center;">
                    <span class="badge-sous-cat">${r.sousCategorie || 'Général'}</span>
                    <button onclick="event.stopPropagation(); window.supprimerRecette('${r.id}')" class="btn-suppr">×</button>
                </div>
            </div>
        `;

        if (r.univers === "pâtisserie") {
            patisserieContainer.innerHTML += html;
        } else {
            cuisineContainer.innerHTML += html;
        }
    });
}
// Fonction pour ouvrir la recette en grand
window.ouvrirRecette = function(nom, ingredients, etapes, image) {
    const modal = document.getElementById("modalRecette");
    const contenu = document.getElementById("contenuRecette");
    
    // On transforme les étapes séparées par des "|" en liste à puces
    const etapesListe = etapes.split('|').map(e => `<li>${e.trim()}</li>`).join('');

    contenu.innerHTML = `
        <img src="${image}" style="width:100%; max-height:300px; object-fit:cover; border-radius:10px; margin-bottom:15px;">
        <h1 style="color:#27ae60; margin-top:0;">${nom}</h1>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px;">
            <h3 style="margin-top:0;">🛒 Ingrédients</h3>
            <p style="white-space: pre-wrap;">${ingredients}</p>
        </div>
        <h3>👨‍🍳 Préparation</h3>
        <ul style="padding-left:20px; line-height:1.6;">${etapesListe}</ul>
    `;
    
    modal.style.display = "block"; // Affiche la modale
};

// Fonction pour fermer la fenêtre
window.fermerRecette = function() {
    document.getElementById("modalRecette").style.display = "none";
};

// Fermer si on clique sur le fond noir
window.onclick = function(event) {
    const modal = document.getElementById("modalRecette");
    if (event.target == modal) {
        modal.style.display = "none";
    }
};
// 3. Lancement au démarrage
window.majSousCategories();
// On attend 1 seconde que Firebase soit bien prêt avant de charger
setTimeout(() => { window.chargerRecettes(); }, 1000);
