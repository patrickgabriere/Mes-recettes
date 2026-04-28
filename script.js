import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];

// --- RENDRE LES FONCTIONS ACCESSIBLES AU HTML ---

window.changerOnglet = (page, el) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if(el) el.classList.add('active');
};

window.ajouterChamp = (id, cl) => {
    const c = document.getElementById(id);
    const d = document.createElement("div");
    d.style = "display:flex; gap:5px; margin-bottom:5px;";
    d.innerHTML = `<input type="text" class="${cl}" style="flex:1; padding:10px;"><button onclick="this.parentElement.remove()">✕</button>`;
    c.appendChild(d);
};

window.majSousCategories = () => {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    const opts = u === "cuisine" ? ["Entrée", "Plat", "Apéro"] : ["Dessert", "Tarte", "Biscuit"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

window.rechercherParNom = () => {
    const q = document.getElementById("recherche").value.toLowerCase();
    window.afficherRecettes(toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(q)));
};

// --- LA FONCTION CRITIQUE QUI OUVRE LA MODALE ---
window.ouvrirRecette = (r) => {
    const modal = document.getElementById("modalRecette");
    const contenu = document.getElementById("contenuRecette");
    
    const ingHTML = r.ingredients.split('\n').map(i => `<li>${i}</li>`).join('');
    const etaHTML = r.etapes.split('\n').map(e => `<li>${e}</li>`).join('');

    contenu.innerHTML = `
        <h2 style="font-family:'Playfair Display'; margin-bottom:20px;">${r.nom}</h2>
        <div style="text-align:left;">
            <p><strong>🛒 Ingrédients :</strong></p><ul>${ingHTML}</ul>
            <p><strong>👨‍🍳 Préparation :</strong></p><ol>${etaHTML}</ol>
        </div>
    `;
    modal.style.display = "block";
};

window.fermerRecette = () => {
    document.getElementById("modalRecette").style.display = "none";
};

window.ajouterRecette = async () => {
    const nom = document.getElementById("nom").value;
    const ing = Array.from(document.querySelectorAll('.ingredient-item')).map(i => i.value).filter(v => v).join('\n');
    const eta = Array.from(document.querySelectorAll('.etape-item')).map(e => e.value).filter(v => v).join('\n');

    if (!nom || !ing) return alert("Remplis au moins le nom et les ingrédients !");

    await addDoc(collection(db, "recettes"), {
        nom, ingredients: ing, etapes: eta,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        auteurId: auth.currentUser ? auth.currentUser.uid : "anonyme",
        estPublic: true
    });
    location.reload();
};

window.afficherRecettes = (liste) => {
    const cC = document.getElementById("liste-cuisine");
    const cP = document.getElementById("liste-patisserie");
    const cM = document.getElementById("liste-mes-recettes");
    [cC, cP, cM].forEach(c => { if(c) c.innerHTML = ""; });

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette-card";
        // C'est ici qu'on lie l'ouverture !
        card.onclick = () => window.ouvrirRecette(r); 
        card.innerHTML = `<div class="recette-card-body"><h3>${r.nom}</h3><small>${r.sousCategorie}</small></div>`;
        
        if (r.univers === "pâtisserie") cP.appendChild(card);
        else cC.appendChild(card);

        if (auth.currentUser && r.auteurId === auth.currentUser.uid) {
            cM.appendChild(card.cloneNode(true));
        }
    });
};

// --- AUTHENTIFICATION ---
window.connexionGoogle = () => signInWithPopup(auth, provider);
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    document.getElementById("info-user").style.display = user ? "block" : "none";
    document.getElementById("btn-login").style.display = user ? "none" : "block";
    if(user) document.getElementById("txt-user").innerText = user.displayName;

    const snap = await getDocs(collection(db, "recettes"));
    toutesLesRecettes = snap.docs.map(d => d.data());
    window.afficherRecettes(toutesLesRecettes);
});

// Initialisation au chargement
window.majSousCategories();
