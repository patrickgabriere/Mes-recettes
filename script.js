import { 
    getDocs, collection, addDoc, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const db = window.db;
let modeEdition = null; 

// --- 1. AFFICHAGE DES RECETTES ---
function afficherRecettes(liste) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    
    cuisineCtn.innerHTML = ""; 
    patisserieCtn.innerHTML = "";

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette";
        const img = r.image || "https://via.placeholder.com/300x150?text=Pas+d'image";

        // Nettoyage des textes pour éviter les erreurs JS dans le onclick
        const nomEsc = r.nom.replace(/'/g, "\\'");
        const ingEsc = r.ingredients.replace(/'/g, "\\'").replace(/\n/g, " ");
        const etaEsc = r.etapes.replace(/'/g, "\\'").replace(/\n/g, " ");

        card.innerHTML = `
            <div onclick="window.ouvrirRecette('${nomEsc}', '${ingEsc}', '${etaEsc}', '${img}')" style="cursor:pointer">
                <img src="${img}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
                <h2>${r.nom}</h2>
            </div>
            <div style="display:flex; justify-content: space-between; align-items: center; margin-top:10px;">
                <span class="badge-sous-cat">${r.sousCategorie || ''}</span>
                <div>
                    <button onclick="window.preparerModif('${r.id}', '${nomEsc}', '${ingEsc}', '${etaEsc}', '${r.univers}', '${r.sousCategorie}', '${img}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button onclick="window.supprimerRecette('${r.id}')" class="btn-suppr">×</button>
                </div>
            </div>
        `;

        if (r.univers === "pâtisserie") patisserieCtn.appendChild(card);
        else cuisineCtn.appendChild(card);
    });
}

// --- 2. ACTIONS (AJOUTER / MODIFIER) ---
window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    if (!nom) return alert("Le nom est obligatoire !");

    const donnees = {
        nom,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        image: document.getElementById("imageLien").value,
        ingredients: document.getElementById("ingredients").value,
        etapes: document.getElementById("etapes").value
    };

    if (modeEdition) {
        await updateDoc(doc(db, "recettes", modeEdition), donnees);
        modeEdition = null;
        document.querySelector(".formulaire button").innerText = "Enregistrer la Recette";
    } else {
        await addDoc(collection(db, "recettes"), donnees);
    }

    document.querySelectorAll(".formulaire input, .formulaire textarea").forEach(i => i.value = "");
    window.chargerRecettes();
};

window.preparerModif = function(id, nom, ing, eta, univ, scat, img) {
    modeEdition = id;
    document.getElementById("nom").value = nom;
    document.getElementById("ingredients").value = ing;
    document.getElementById("etapes").value = eta;
    document.getElementById("univers").value = univ;
    window.majSousCategories();
    document.getElementById("sousCategorie").value = scat;
    document.getElementById("imageLien").value = img;
    document.querySelector(".formulaire button").innerText = "Mettre à jour";
    window.scrollTo(0,0);
};

// --- 3. FILTRES ET RECHERCHE ---
window.filtrerParCategorie = async function(cat) {
    const snap = await getDocs(collection(db, "recettes"));
    let res = [];
    snap.forEach(d => {
        const r = d.data();
        if (cat === "" || r.univers === cat || r.sousCategorie === cat) res.push({id: d.id, ...r});
    });
    afficherRecettes(res);
};

window.rechercherParNom = async function() {
    const txt = document.getElementById("recherche").value.toLowerCase();
    const snap = await getDocs(collection(db, "recettes"));
    let res = [];
    snap.forEach(d => {
        if (d.data().nom.toLowerCase().includes(txt)) res.push({id: d.id, ...d.data()});
    });
    afficherRecettes(res);
};

// --- 4. MODALE ET CHARGEMENT ---
window.ouvrirRecette = function(nom, ing, eta, img) {
    const list = eta.split(/[|\n]/).filter(e => e.trim()).map(e => `<li>${e.trim()}</li>`).join('');
    document.getElementById("contenuRecette").innerHTML = `
        <img src="${img}" style="width:100%; border-radius:10px;">
        <h1>${nom}</h1>
        <p><b>Ingrédients :</b><br>${ing}</p>
        <p><b>Préparation :</b><ul>${list}</ul></p>`;
    document.getElementById("modalRecette").style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

window.supprimerRecette = async (id) => { 
    if(confirm("Supprimer ?")) { await deleteDoc(doc(db, "recettes", id)); window.chargerRecettes(); }
};

window.majSousCategories = function() {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    const opts = u === "cuisine" ? ["Entrée", "Plat", "Accompagnement"] : ["Gâteau", "Tarte", "Biscuit"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

window.chargerRecettes = async () => {
    const snap = await getDocs(collection(db, "recettes"));
    let l = []; snap.forEach(d => l.push({id: d.id, ...d.data()}));
    afficherRecettes(l);
};

window.majSousCategories();
window.chargerRecettes();
