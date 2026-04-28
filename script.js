import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- INITIALISATION ---
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];

// --- CHARGEMENT ---
window.chargerRecettes = async function() {
    try {
        const snap = await getDocs(collection(db, "recettes"));
        toutesLesRecettes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        afficherRecettes(toutesLesRecettes);
    } catch (err) {
        console.error("Erreur chargement:", err);
    }
};

function afficherRecettes(liste) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    
    // LA SÉCURITÉ : On vérifie si les dossiers existent avant d'écrire dedans
    if (!cuisineCtn || !patisserieCtn) return; 

    cuisineCtn.innerHTML = "";
    patisserieCtn.innerHTML = "";

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette-card";
        card.onclick = () => window.ouvrirRecette(r.id);
        card.innerHTML = `
            <img src="${r.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400'}">
            <div class="recette-card-body">
                <h3>${r.nom}</h3>
                <span class="badge badge-cat">${r.sousCategorie || r.univers}</span>
            </div>
        `;
        if (r.univers === "pâtisserie") patisserieCtn.appendChild(card);
        else cuisineCtn.appendChild(card);
    });
}

// --- SOUS-CATÉGORIES ---
window.majSousCategories = function() {
    const uEl = document.getElementById("univers");
    const sEl = document.getElementById("sousCategorie");
    if (!uEl || !sEl) return;

    const cats = {
        "cuisine": ["Apéritif", "Entrée", "Plat de résistance", "Accompagnement", "Sauce", "Soupe"],
        "pâtisserie": ["Gâteau classique", "Tarte", "Biscuit", "Dessert", "Petit-déjeuner"]
    };

    const opts = cats[uEl.value] || [];
    sEl.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join("");
};

// --- AUTH ---
window.connexionGoogle = () => signInWithPopup(auth, provider);
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const authBtn = document.getElementById("authBtn"); // Vérifie que cet ID existe dans ton HTML
    window.chargerRecettes();
});

// --- NAVIGATION & FILTRES ---
window.changerOnglet = (page, el) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if(target) target.classList.add('active');
    if(el) el.classList.add('active');
};

window.filtrerParCategorie = (cat) => {
    if (!cat) return afficherRecettes(toutesLesRecettes);
    const res = toutesLesRecettes.filter(r => 
        (r.univers||"").toLowerCase() === cat.toLowerCase() || 
        (r.sousCategorie||"").toLowerCase() === cat.toLowerCase()
    );
    afficherRecettes(res);
};

window.rechercherParNom = () => {
    const t = document.getElementById("recherche").value.toLowerCase();
    afficherRecettes(toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(t)));
};

// --- OUVRIR MODALE ---
window.ouvrirRecette = (id) => {
    const r = toutesLesRecettes.find(i => i.id === id);
    if(!r) return;
    document.getElementById("contenuRecette").innerHTML = `
        <h2>${r.nom}</h2>
        <p><strong>Ingrédients:</strong><br>${r.ingredients}</p>
        <p><strong>Préparation:</strong><br>${r.etapes}</p>
    `;
    document.getElementById("modalRecette").style.display = "block";
};
window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

// --- LANCEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    window.majSousCategories();
});
