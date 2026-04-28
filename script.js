import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- INITIALISATION FIREBASE ---
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];

// --- GESTION DES CHAMPS DYNAMIQUES ---
window.ajouterChamp = function(containerId, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const placeholderText = className === "ingredient-item" ? "Ex: 200g de farine" : "Ex: Faire dorer à la poêle";

    const div = document.createElement("div");
    div.style = "display:flex; gap:10px; margin-bottom:10px;";
    div.innerHTML = `
        <input type="text" class="${className}" placeholder="${placeholderText}" 
               style="flex:1; padding:12px; border-radius:10px; border:1.5px solid #ddd;">
        <button type="button" onclick="this.parentElement.remove()" 
                style="background:#ff4d4d; color:white; border:none; border-radius:10px; padding:0 15px; cursor:pointer; font-weight:bold;">✕</button>
    `;
    container.appendChild(div);
};

// --- NAVIGATION ---
window.changerOnglet = (page, tabEl) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if(tabEl) tabEl.classList.add('active');
};

window.majSousCategories = function() {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    const opts = u === "cuisine" ? ["Entrée", "Plat", "Apéro", "Soupe"] : ["Dessert", "Tarte", "Biscuit"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

// --- FILTRAGE ET RECHERCHE ---
window.rechercherParNom = function() {
    const query = document.getElementById("recherche").value.toLowerCase();
    const filtre = toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(query) && r.estPublic);
    window.afficherRecettes(filtre);
};

window.filtrerParCategorie = function(cat) {
    if (!cat) return window.afficherRecettes(toutesLesRecettes.filter(r => r.estPublic));
    const filtre = toutesLesRecettes.filter(r => (r.sousCategorie === cat || r.univers === cat) && r.estPublic);
    window.afficherRecettes(filtre);
};

// --- CRUD : AJOUTER ---
window.ajouterRecette = async function() {
    const nom = document.getElementById("nom").value.trim();
    const ingredients = Array.from(document.querySelectorAll('.ingredient-item')).map(i => i.value.trim()).filter(v => v);
    const etapes = Array.from(document.querySelectorAll('.etape-item')).map(e => e.value.trim()).filter(v => v);
    const imageInput = document.getElementById("imageLien").value.trim();
    const isPublicChecked = document.getElementById("public") ? document.getElementById("public").checked : true;
    
    const imageParDefaut = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800";

    if (!nom || ingredients.length === 0) {
        alert("Oups ! Le nom et au moins un ingrédient sont obligatoires.");
        return;
    }

    const data = {
        nom,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        ingredients: ingredients.join('\n'),
        etapes: etapes.join('\n'),
        image: imageInput || imageParDefaut,
        auteurId: auth.currentUser ? auth.currentUser.uid : "anonyme",
        estPublic: isPublicChecked,
        date: new Date()
    };

    try {
        await addDoc(collection(db, "recettes"), data);
        alert("✨ Recette ajoutée !");
        location.reload();
    } catch (e) {
        alert("Erreur technique : " + e.message);
    }
};

// --- CHARGEMENT ---
window.chargerRecettes = async function() {
    try {
        const snap = await getDocs(collection(db, "recettes"));
        toutesLesRecettes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.afficherRecettes(toutesLesRecettes);
    } catch (e) {
        console.error("Erreur Firebase:", e);
    }
};

window.afficherRecettes = function(liste) {
    const containers = {
        cuisine: document.getElementById("liste-cuisine"),
        patisserie: document.getElementById("liste-patisserie"),
        mes: document.getElementById("liste-mes-recettes")
    };
    
    Object.values(containers).forEach(c => { if(c) c.innerHTML = ""; });

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette-card";
        card.onclick = () => window.ouvrirRecette(r);
        card.innerHTML = `
            <img src="${r.image}">
            <div class="recette-card-body">
                <h3>${r.nom}</h3>
                <span style="color:#e8672a; font-size:0.8rem; font-weight:bold; text-transform:uppercase;">${r.sousCategorie}</span>
            </div>
        `;
        
        if (r.estPublic) {
            const target = r.univers === "pâtisserie" ? containers.patisserie : containers.cuisine;
            if(target) target.appendChild(card.cloneNode(true));
        }
        
        if (auth.currentUser && r.auteurId === auth.currentUser.uid && containers.mes) {
            containers.mes.appendChild(card);
        }
    });
};

// --- MODALE : DÉTAILS ---
window.ouvrirRecette = (r) => {
    const modal = document.getElementById("modalRecette");
    const contenu = document.getElementById("contenuRecette");
    if(!modal || !contenu) return;

    const ing = (r.ingredients || "").split('\n').map(i => `<li>${i}</li>`).join('');
    const eta = (r.etapes || "").split('\n').map(e => `<li>${e}</li>`).join('');

    contenu.innerHTML = `
        <img src="${r.image}" style="width:100%; height:250px; object-fit:cover; border-radius:20px; margin-bottom:25px;">
        <h2 style="font-family:'Playfair Display'; font-size:2rem; margin-bottom:15px;">${r.nom}</h2>
        <div style="text-align:left; background:#fdf6ec; padding:25px; border-radius:15px;">
            <p><strong>🛒 Ingrédients :</strong></p>
            <ul style="margin-bottom:20px;">${ing}</ul>
            <hr style="border:0; border-top:1px solid #e0d8cc; margin:20px 0;">
            <p><strong>👨‍🍳 Préparation :</strong></p>
            <ol>${eta || "Aucune étape renseignée."}</ol>
        </div>
    `;
    modal.style.display = "block";
};

window.fermerRecette = () => {
    document.getElementById("modalRecette").style.display = "none";
};

// --- AUTH ---
window.connexionGoogle = () => signInWithPopup(auth, provider);
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const info = document.getElementById("info-user");
    const login = document.getElementById("form-login");
    if (user) {
        if(info) info.style.display = "flex";
        if(login) login.style.display = "none";
        document.getElementById("txt-user").innerText = user.displayName;
    } else {
        if(info) info.style.display = "none";
        if(login) login.style.display = "block";
    }
    window.chargerRecettes();
});

// INITIALISATION
window.majSousCategories();
// On ajoute juste un champ vide de chaque pour l'esthétique au début
window.ajouterChamp('liste-ingredients-input', 'ingredient-item');
window.ajouterChamp('liste-etapes-input', 'etape-item');
