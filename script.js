import { 
    getDocs, collection, addDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const cuisineDiv = document.getElementById("liste-cuisine");
const patisserieDiv = document.getElementById("liste-patisserie");

const config = {
    cuisine: ["Entrée", "Plat", "Accompagnement"],
    pâtisserie: ["Gâteau", "Entremet", "Biscuit", "Tarte"]
};

// --- GESTION DES CATÉGORIES ---
window.majSousCategories = function() {
    const univers = document.getElementById("univers").value;
    const select = document.getElementById("sousCategorie");
    select.innerHTML = "";
    config[univers].forEach(cat => {
        let opt = document.createElement("option");
        opt.value = cat.toLowerCase();
        opt.text = cat;
        select.add(opt);
    });
};

// --- OUVERTURE DE LA RECETTE ---
window.ouvrirRecette = function(nom, ing, etapes, img) {
    const modal = document.getElementById("modalRecette");
    const contenu = document.getElementById("contenuRecette");
    const listeEtapes = etapes.split(' | ').map(e => `<li>${e}</li>`).join('');

    contenu.innerHTML = `
        <img src="${img}" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
        <h2 style="color:#e67e22;">${nom}</h2>
        <p><strong>🛒 Ingrédients :</strong><br>${ing}</p>
        <p><strong>👨‍🍳 Étapes :</strong><ul style="text-align:left;">${listeEtapes}</ul></p>
    `;
    modal.style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

// --- AFFICHAGE ---
function afficherRecettes(liste) {
    cuisineDiv.innerHTML = "";
    patisserieDiv.innerHTML = "";

    liste.forEach(r => {
        const img = r.image || "https://via.placeholder.com/300x150";
        // On prépare les textes pour le onclick (on enlève les retours à la ligne et on protège les apostrophes)
        const nomEsc = r.nom.replace(/'/g, "\\'");
        const ingEsc = r.ingredients.replace(/'/g, "\\'").replace(/\n/g, " ");
        const etaEsc = r.etapes.replace(/'/g, "\\'").replace(/\n/g, " ");

        const card = `
            <div class="recette">
                <div onclick="window.ouvrirRecette('${nomEsc}', '${ingEsc}', '${etaEsc}', '${img}')" style="cursor:pointer;">
                    <img src="${img}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;">
                    <h3>${r.nom}</h3>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge-sous-cat">${r.sousCategorie}</span>
                    <button onclick="window.supprimerRecette('${r.id}')" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">Supprimer</button>
                </div>
            </div>
        `;
        if (r.univers === "pâtisserie") patisserieDiv.innerHTML += card;
        else cuisineDiv.innerHTML += card;
    });
}

// --- ACTIONS FIREBASE ---
window.chargerRecettes = async function() {
    const snap = await getDocs(collection(window.db, "recettes"));
    let liste = [];
    snap.forEach(d => liste.push({ id: d.id, ...d.data() }));
    afficherRecettes(liste);
};

window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    if (!nom) return alert("Nom manquant");
    
    await addDoc(collection(window.db, "recettes"), {
        nom: nom,
        ingredients: document.getElementById("ingredients").value,
        etapes: document.getElementById("etapes").value,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        image: document.getElementById("imageLien").value
    });
    
    location.reload(); // On recharge pour voir la nouvelle recette
};

window.supprimerRecette = async function(id) {
    if (confirm("Supprimer ?")) {
        await deleteDoc(doc(window.db, "recettes", id));
        window.chargerRecettes();
    }
};

window.filtrerParCategorie = async function(cat) {
    const snap = await getDocs(collection(window.db, "recettes"));
    let liste = [];
    snap.forEach(d => {
        let r = d.data();
        if (!cat || r.univers === cat || r.sousCategorie === cat) liste.push({ id: d.id, ...r });
    });
    afficherRecettes(liste);
};

window.rechercherParNom = async function() {
    const recherche = document.getElementById("recherche").value.toLowerCase();
    const snap = await getDocs(collection(window.db, "recettes"));
    let liste = [];
    snap.forEach(d => {
        if (d.data().nom.toLowerCase().includes(recherche)) liste.push({ id: d.id, ...d.data() });
    });
    afficherRecettes(liste);
};

// Initialisation
window.majSousCategories();
window.chargerRecettes();
