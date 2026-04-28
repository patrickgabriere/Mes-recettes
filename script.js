import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- INITIALISATION ---
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];
let modeEdition = null;

// --- GESTION DES SOUS-CATÉGORIES ---
window.majSousCategories = function() {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    if (!s) return;

    const categories = {
        "cuisine": ["Apéritif", "Entrée", "Plat de résistance", "Accompagnement", "Sauce & Condiment", "Soupe & Velouté"],
        "pâtisserie": ["Gâteau classique", "Tarte & Tourte", "Biscuit & Cookie", "Dessert à la cuillère", "Petit-déjeuner", "Confiserie"]
    };

    const opts = categories[u] || [];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join("");
};

// --- CHARGEMENT DES RECETTES ---
window.chargerRecettes = async function() {
    const snapshot = await getDocs(collection(db, "recettes"));
    toutesLesRecettes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    afficherRecettes(toutesLesRecettes);
};

function afficherRecettes(liste) {
    const cuisineDiv = document.getElementById("liste-cuisine");
    const patisserieDiv = document.getElementById("liste-patisserie");
    if (!cuisineDiv || !patisserieDiv) return;

    cuisineDiv.innerHTML = "";
    patisserieDiv.innerHTML = "";

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette-card";
        card.onclick = () => window.ouvrirRecette(r.id);
        card.innerHTML = `
            <img src="${r.imageLien || 'https://images.unsplash.com/photo-1495195129352-aec329a2d7ca?w=400'}" alt="${r.nom}">
            <div class="recette-info">
                <h3>${r.nom}</h3>
                <p>${r.sousCategorie || r.univers}</p>
            </div>
        `;

        if (r.univers === "pâtisserie") patisserieDiv.appendChild(card);
        else cuisineDiv.appendChild(card);
    });
}

// --- AJOUTER UNE RECETTE ---
window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    const ingredients = document.getElementById("ingredients").value;
    const etapes = document.getElementById("etapes").value;
    const univers = document.getElementById("univers").value;
    const sousCategorie = document.getElementById("sousCategorie").value;
    const imageLien = document.getElementById("imageLien").value;

    if (!nom || !ingredients || !etapes) {
        alert("Merci de remplir le nom, les ingrédients et les étapes.");
        return;
    }

    try {
        await addDoc(collection(db, "recettes"), {
            nom,
            ingredients,
            etapes,
            univers,
            sousCategorie,
            imageLien,
            auteur: auth.currentUser ? auth.currentUser.displayName : "Anonyme",
            uid: auth.currentUser ? auth.currentUser.uid : null,
            date: new Date()
        });

        alert("Recette ajoutée au Grimoire !");
        document.querySelectorAll("input, textarea").forEach(i => i.value = "");
        window.majSousCategories();
        window.chargerRecettes();
        window.changerOnglet('accueil', document.querySelector('.tab'));
    } catch (e) {
        alert("Erreur lors de l'enregistrement : " + e.message);
    }
};

// --- RECHERCHE ET FILTRES ---
window.rechercherParNom = function() {
    const texte = document.getElementById("recherche").value.toLowerCase();
    const resultats = toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(texte));
    afficherRecettes(resultats);
};

window.filtrerParCategorie = function(cat) {
    if (!cat) {
        afficherRecettes(toutesLesRecettes);
        return;
    }
    const recherche = cat.toLowerCase();
    const resultats = toutesLesRecettes.filter(r => 
        (r.univers && r.univers.toLowerCase() === recherche) || 
        (r.sousCategorie && r.sousCategorie.toLowerCase() === recherche)
    );
    afficherRecettes(resultats);
};

// --- GESTION DES ONGLETS ET MODALE ---
window.changerOnglet = function(page, el) {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (el) el.classList.add('active');
};

window.ouvrirRecette = function(id) {
    const r = toutesLesRecettes.find(item => item.id === id);
    if (!r) return;

    const contenu = document.getElementById("contenuRecette");
    contenu.innerHTML = `
        <h2 style="font-family:'Playfair Display'; margin-bottom:15px;">${r.nom}</h2>
        <img src="${r.imageLien || ''}" style="width:100%; border-radius:15px; margin-bottom:20px; display:${r.imageLien ? 'block' : 'none'}">
        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <span class="tag">${r.univers}</span>
            <span class="tag" style="background:#f0ebe3; color:#3d2b1f;">${r.sousCategorie}</span>
        </div>
        <h4>📝 Ingrédients</h4>
        <p style="white-space: pre-line; margin-bottom:20px;">${r.ingredients}</p>
        <h4>👨‍🍳 Préparation</h4>
        <p style="white-space: pre-line;">${r.etapes}</p>
    `;
    document.getElementById("modalRecette").style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

// --- AUTHENTIFICATION ---
window.connexionGoogle = () => signInWithPopup(auth, provider);
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const btn = document.getElementById("authBtn");
    if (user) {
        btn.innerHTML = `👋 ${user.displayName}`;
        btn.onclick = window.deconnexion;
    } else {
        btn.innerHTML = "🔑 Connexion";
        btn.onclick = window.connexionGoogle;
    }
    window.chargerRecettes();
});

// --- LANCEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.majSousCategories, 500);
});
