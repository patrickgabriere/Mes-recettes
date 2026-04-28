import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- 1. INITIALISATION ---
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];

// --- 2. CHARGEMENT DES DONNÉES (Le plus important) ---
window.chargerRecettes = async function() {
    console.log("Tentative de chargement des recettes...");
    try {
        const querySnapshot = await getDocs(collection(db, "recettes"));
        toutesLesRecettes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log("Recettes récupérées :", toutesLesRecettes.length);
        afficherRecettes(toutesLesRecettes);
    } catch (error) {
        console.error("Erreur Firebase :", error);
    }
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

        if (r.univers === "pâtisserie") {
            patisserieDiv.appendChild(card);
        } else {
            cuisineDiv.appendChild(card);
        }
    });
}

// --- 3. GESTION DES SOUS-CATÉGORIES ---
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

// --- 4. AJOUTER UNE RECETTE ---
window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value;
    const ingredients = document.getElementById("ingredients").value;
    const etapes = document.getElementById("etapes").value;
    const univers = document.getElementById("univers").value;
    const sousCategorie = document.getElementById("sousCategorie").value;
    const imageLien = document.getElementById("imageLien").value;

    if (!nom || !ingredients || !etapes) {
        alert("Remplis au moins le nom, les ingrédients et les étapes !");
        return;
    }

    try {
        await addDoc(collection(db, "recettes"), {
            nom, ingredients, etapes, univers, sousCategorie, imageLien,
            date: new Date(),
            auteur: auth.currentUser ? auth.currentUser.displayName : "Anonyme"
        });
        alert("Recette ajoutée !");
        window.chargerRecettes();
        window.changerOnglet('accueil', document.querySelector('.tab'));
    } catch (e) {
        alert("Erreur d'ajout : " + e.message);
    }
};

// --- 5. INTERFACE (Onglets, Modale, Recherche) ---
window.changerOnglet = function(page, el) {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (el) el.classList.add('active');
};

window.ouvrirRecette = function(id) {
    const r = toutesLesRecettes.find(item => item.id === id);
    if (!r) return;
    document.getElementById("contenuRecette").innerHTML = `
        <h2>${r.nom}</h2>
        <p><strong>Ingrédients :</strong><br>${r.ingredients}</p>
        <p><strong>Préparation :</strong><br>${r.etapes}</p>
    `;
    document.getElementById("modalRecette").style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

window.rechercherParNom = function() {
    const texte = document.getElementById("recherche").value.toLowerCase();
    const resultats = toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(texte));
    afficherRecettes(resultats);
};

// --- 6. AUTHENTIFICATION & DÉMARRAGE ---
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
    window.chargerRecettes(); // On lance le chargement ici
});

// Initialiser le menu au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.majSousCategories, 500);
});
