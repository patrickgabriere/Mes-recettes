import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];

// --- FONCTIONS GLOBALES ---
window.ajouterChamp = function(id, cl) {
    const c = document.getElementById(id);
    if (!c) return;
    const d = document.createElement("div");
    d.style = "display:flex; gap:5px; margin-bottom:5px;";
    d.innerHTML = `<input type="text" class="${cl}" placeholder="Saisir..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #ddd;">
                   <button onclick="this.parentElement.remove()" style="background:red; color:white; border:none; padding:0 10px; border-radius:8px; cursor:pointer;">✕</button>`;
    c.appendChild(d);
};

window.changerOnglet = (page, el) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if(el) el.classList.add('active');
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

window.filtrerParCategorie = (cat) => {
    if (!cat) return window.afficherRecettes(toutesLesRecettes);
    window.afficherRecettes(toutesLesRecettes.filter(r => r.sousCategorie === cat || r.univers === cat));
};

// --- CORE ---
window.ajouterRecette = async () => {
    const nom = document.getElementById("nom").value;
    const ing = Array.from(document.querySelectorAll('.ingredient-item')).map(i => i.value).filter(v => v);
    const eta = Array.from(document.querySelectorAll('.etape-item')).map(e => e.value).filter(v => v);
    const img = document.getElementById("imageLien").value;
    const pub = document.getElementById("public") ? document.getElementById("public").checked : true;

    if (!nom || ing.length === 0) return alert("Nom et Ingrédients requis !");

    const data = {
        nom, univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        ingredients: ing.join('\n'), etapes: eta.join('\n'),
        image: img || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800",
        auteurId: auth.currentUser ? auth.currentUser.uid : "anonyme",
        estPublic: pub
    };

    try {
        await addDoc(collection(db, "recettes"), data);
        alert("Enregistré !");
        location.reload();
    } catch (e) { alert("Erreur Firebase"); }
};

window.afficherRecettes = (liste) => {
    const ctnC = document.getElementById("liste-cuisine");
    const ctnP = document.getElementById("liste-patisserie");
    const ctnM = document.getElementById("liste-mes-recettes");
    
    if(ctnC) ctnC.innerHTML = ""; if(ctnP) ctnP.innerHTML = ""; if(ctnM) ctnM.innerHTML = "";

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette-card";
        card.onclick = () => window.ouvrirRecette(r);
        card.innerHTML = `<img src="${r.image}"><div class="recette-card-body"><h3>${r.nom}</h3><small>${r.sousCategorie}</small></div>`;
        
        if (r.estPublic) {
            if (r.univers === "pâtisserie") ctnP.appendChild(card.cloneNode(true));
            else ctnC.appendChild(card.cloneNode(true));
        }
        if (auth.currentUser && r.auteurId === auth.currentUser.uid) ctnM.appendChild(card);
    });
};

window.ouvrirRecette = (r) => {
    const modal = document.getElementById("modalRecette");
    const cont = document.getElementById("contenuRecette");
    const ing = r.ingredients.split('\n').map(i => `<li>${i}</li>`).join('');
    const eta = r.etapes.split('\n').map(e => `<li>${e}</li>`).join('');

    cont.innerHTML = `
        <img src="${r.image}" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
        <h2>${r.nom}</h2>
        <div style="text-align:left;">
            <p><strong>Ingrédients :</strong></p><ul>${ing}</ul>
            <p><strong>Préparation :</strong></p><ol>${eta}</ol>
        </div>`;
    modal.style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

// --- AUTH & INIT ---
window.connexionGoogle = () => signInWithPopup(auth, provider);
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    document.getElementById("info-user").style.display = user ? "flex" : "none";
    document.getElementById("form-login").style.display = user ? "none" : "block";
    if(user) document.getElementById("txt-user").innerText = user.displayName;
    
    getDocs(collection(db, "recettes")).then(snap => {
        toutesLesRecettes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.afficherRecettes(toutesLesRecettes);
    });
});

window.majSousCategories();
window.ajouterChamp('liste-ingredients-input', 'ingredient-item');
window.ajouterChamp('liste-etapes-input', 'etape-item');
