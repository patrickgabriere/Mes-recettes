// 1. IMPORTS
import { 
    getDocs, collection, addDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// 2. RÉCUPÉRATION DE LA DB
const database = (typeof db !== 'undefined') ? db : window.db;

// --- GESTION DE LA MODALE ---
window.ouvrirRecette = function(nom, ingredients, etapes, image) {
    const modal = document.getElementById("modalRecette");
    const contenu = document.getElementById("contenuRecette");
    if (!modal || !contenu) return;

    // On nettoie les étapes pour l'affichage en liste
    const listeEtapes = etapes ? etapes.split('\n').filter(e => e.trim()).map(e => `<li>${e}</li>`).join('') : "Étapes non renseignées";

    contenu.innerHTML = `
        <img src="${image}" style="width:100%; max-height:250px; object-fit:cover; border-radius:10px; margin-bottom:15px;">
        <h1 style="color:#27ae60; margin:0 0 10px 0;">${nom}</h1>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px;">
            <h3 style="margin-top:0;">🛒 Ingrédients</h3>
            <p style="white-space: pre-wrap;">${ingredients || 'Aucun ingrédient'}</p>
        </div>
        <h3>👨‍🍳 Préparation</h3>
        <ul style="padding-left:20px; line-height:1.6;">${listeEtapes}</ul>
    `;
    modal.style.display = "block";
};

window.fermerRecette = function() {
    const modal = document.getElementById("modalRecette");
    if (modal) modal.style.display = "none";
};

// --- AFFICHAGE DES RECETTES ---
function afficherRecettes(recettes) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    
    if (!cuisineCtn || !patisserieCtn) return;
    cuisineCtn.innerHTML = ""; 
    patisserieCtn.innerHTML = "";

    recettes.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette";
        card.style.cursor = "pointer";
        const imgUrl = r.image || "https://via.placeholder.com/300x150?text=Pas+d'image";

        card.innerHTML = `
            <img src="${imgUrl}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
            <h2>${r.nom}</h2>
            <div style="display:flex; justify-content: space-between; align-items: center;">
                <span class="badge-sous-cat">${r.sousCategorie || ''}</span>
                <button class="btn-suppr" style="color:#e74c3c; border:none; background:none; font-size:1.5rem;">×</button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.className !== 'btn-suppr') {
                window.ouvrirRecette(r.nom, r.ingredients, r.etapes, imgUrl);
            }
        });

        const btnSuppr = card.querySelector(".btn-suppr");
        if (btnSuppr) {
            btnSuppr.addEventListener('click', (e) => {
                e.stopPropagation();
                window.supprimerRecette(r.id);
            });
        }

        // Tri entre cuisine et pâtisserie
        const uni = r.univers ? r.univers.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        if (uni === "patisserie") patisserieCtn.appendChild(card);
        else cuisineCtn.appendChild(card);
    });
}

// --- ACTIONS FIREBASE ---
window.chargerRecettes = async function() {
    try {
        if (!database) throw new Error("Base de données introuvable");
        const snap = await getDocs(collection(database, "recettes"));
        let liste = [];
        snap.forEach(d => {
            liste.push({ id: d.id, ...d.data() });
        });
        afficherRecettes(liste);
    } catch (e) {
        console.error("Erreur chargement:", e);
    }
};

window.ajouterRecette = async function() {
    const nomVal = document.getElementById("nom")?.value;
    if (!nomVal) return alert("Le nom est obligatoire !");

    const r = {
        nom: nomVal,
        univers: document.getElementById("univers")?.value || "cuisine",
        sousCategorie: document.getElementById("sousCategorie")?.value || "",
        ingredients: document.getElementById("ingredients")?.value || "",
        etapes: document.getElementById("etapes")?.value || "",
        image: document.getElementById("imageLien")?.value || ""
    };

    try {
        await addDoc(collection(database, "recettes"), r);
        ["nom", "ingredients", "etapes", "imageLien"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        window.chargerRecettes();
    } catch (e) {
        alert("Erreur lors de l'ajout");
    }
};

window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        try {
            await deleteDoc(doc(database, "recettes", id));
            window.chargerRecettes();
        } catch (e) {
            console.error("Erreur suppression:", e);
        }
    }
};

// --- INITIALISATION ---
window.majSousCategories = function() {
    const universEl = document.getElementById("univers");
    const sousCatEl = document.getElementById("sousCategorie");
    if (!universEl || !sousCatEl) return;

    const u = universEl.value;
    const options = u === "cuisine" ? ["Entrée", "Plat", "Accompagnement"] : ["Gâteau", "Tarte", "Biscuit"];
    sousCatEl.innerHTML = options.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

// Lancement automatique
window.majSousCategories();
setTimeout(() => {
    window.chargerRecettes();
}, 1000);
