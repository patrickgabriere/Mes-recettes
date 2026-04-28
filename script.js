import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];

// --- INTERFACE ---

window.changerOnglet = (page, el) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if(el) el.classList.add('active');
};

window.ajouterChamp = (id, cl) => {
    const c = document.getElementById(id);
    const d = document.createElement("div");
    d.style = "display:flex; gap:10px; margin-bottom:10px;";
    d.innerHTML = `
        <input type="text" class="${cl}" style="flex:1; padding:14px; border-radius:10px; border:2px solid #f0ebe3;">
        <button onclick="this.parentElement.remove()" style="background:#ff4d4d; color:white; border:none; padding:0 15px; border-radius:10px; cursor:pointer;">✕</button>
    `;
    c.appendChild(d);
};

window.majSousCategories = () => {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    const opts = u === "cuisine" ? ["Entrée", "Plat", "Apéro"] : ["Dessert", "Tarte", "Biscuit"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

// --- LOGIQUE RECETTES ---

window.ouvrirRecette = (r) => {
    const modal = document.getElementById("modalRecette");
    const cont = document.getElementById("contenuRecette");
    const ing = (r.ingredients || "").split('\n').map(i => `<li>${i}</li>`).join('');
    const eta = (r.etapes || "").split('\n').map(e => `<li>${e}</li>`).join('');
    cont.innerHTML = `
        <img src="${r.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800'}" style="width:100%; height:250px; object-fit:cover; border-radius:15px 15px 0 0;">
        <div style="padding:25px;">
            <h2 style="font-family:'Playfair Display'; font-size:1.8rem; margin-bottom:10px;">${r.nom}</h2>
            <span class="tag">${r.sousCategorie}</span>
            <div style="margin-top:20px;">
                <p><strong>🛒 Ingrédients :</strong></p><ul style="margin:10px 0 20px 20px;">${ing}</ul>
                <p><strong>👨‍🍳 Préparation :</strong></p><ol style="margin:10px 0 0 20px;">${eta}</ol>
            </div>
        </div>`;
    modal.style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

window.afficherRecettes = (liste) => {
    const cC = document.getElementById("liste-cuisine");
    const cP = document.getElementById("liste-patisserie");
    const cM = document.getElementById("liste-mes-recettes");

    [cC, cP, cM].forEach(c => { if(c) c.innerHTML = ""; });

    liste.forEach(r => {
        const creerCarte = () => {
            const card = document.createElement("div");
            card.className = "recette-card";
            card.onclick = () => window.ouvrirRecette(r);
            card.innerHTML = `
                <img src="${r.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800'}">
                <div class="recette-card-body">
                    <span class="tag">${r.sousCategorie || r.univers}</span>
                    <h3>${r.nom}</h3>
                </div>
            `;
            return card;
        };

        if (r.estPublic !== false) {
            if (r.univers === "pâtisserie" && cP) cP.appendChild(creerCarte());
            else if (cC) cC.appendChild(creerCarte());
        }

        if (auth.currentUser && r.auteurId === auth.currentUser.uid && cM) {
            cM.appendChild(creerCarte());
        }
    });
};

window.rechercherParNom = () => {
    const txt = document.getElementById("recherche").value.toLowerCase();
    window.afficherRecettes(toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(txt)));
};

// --- FIREBASE ---

window.ajouterRecette = async () => {
    const nom = document.getElementById("nom").value;
    const ing = Array.from(document.querySelectorAll('.ingredient-item')).map(i => i.value).filter(v => v).join('\n');
    const eta = Array.from(document.querySelectorAll('.etape-item')).map(e => e.value).filter(v => v).join('\n');

    if (!nom || !ing) return alert("Nom et Ingrédients requis !");

    try {
        await addDoc(collection(db, "recettes"), {
            nom, ingredients: ing, etapes: eta,
            univers: document.getElementById("univers").value,
            sousCategorie: document.getElementById("sousCategorie").value,
            image: document.getElementById("imageLien").value || "",
            auteurId: auth.currentUser ? auth.currentUser.uid : "anonyme",
            estPublic: document.getElementById("public").checked
        });
        location.reload();
    } catch (e) { alert("Erreur lors de l'enregistrement"); }
};

window.connexionGoogle = () => signInWithPopup(auth, provider).catch(err => alert("Erreur connexion"));
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    document.getElementById("info-user").style.display = user ? "flex" : "none";
    document.getElementById("btn-login").style.display = user ? "none" : "block";
    if(user) document.getElementById("txt-user").innerText = user.displayName;
    
    const snap = await getDocs(collection(db, "recettes"));
    toutesLesRecettes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.afficherRecettes(toutesLesRecettes);
});

window.majSousCategories();
