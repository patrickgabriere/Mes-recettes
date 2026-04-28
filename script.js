import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];
let modeEdition = null;

// --- AUTHENTIFICATION ---
window.connexionGoogle = function() {
    signInWithPopup(auth, provider).catch(e => alert("Erreur : " + e.message));
};

window.gererConnexion = async function() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    if (!email || !pass) return alert("Remplis les champs !");
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
            } catch (err) { alert("Erreur création : " + err.message); }
        } else { alert("Erreur connexion : " + e.message); }
    }
};

window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const loginDiv = document.getElementById("form-login");
    const infoDiv = document.getElementById("info-user");
    if (user) {
        if (loginDiv) loginDiv.style.display = "none";
        if (infoDiv) {
            infoDiv.style.display = "block";
            document.getElementById("txt-user").innerText = "👨‍🍳 " + (user.displayName || user.email);
        }
    } else {
        if (loginDiv) loginDiv.style.display = "block";
        if (infoDiv) infoDiv.style.display = "none";
    }
    window.chargerRecettes();
});

// --- AFFICHAGE ---
function afficherRecettes(liste) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    if (!cuisineCtn || !patisserieCtn) return;
    cuisineCtn.innerHTML = "";
    patisserieCtn.innerHTML = "";

    liste.forEach(r => {
        const user = auth.currentUser;
        const estAuteur = user && r.auteurId === user.uid;
        const img = r.image || "https://via.placeholder.com/300x150?text=Pas+d'image";
        const nomEsc = (r.nom || "").replace(/'/g, "\\'");
        const ingEsc = (r.ingredients || "").replace(/'/g, "\\'").replace(/\n/g, " ");
        const etaEsc = (r.etapes || "").replace(/'/g, "\\'").replace(/\n/g, " ");
        const badgeVisi = r.estPublic ? '<span class="badge-public">🔓 Public</span>' : '<span class="badge-prive">🔒 Privé</span>';

        const card = document.createElement("div");
        card.className = "recette";
        card.innerHTML = `
            <div onclick="window.ouvrirRecette('${nomEsc}','${ingEsc}','${etaEsc}','${img}')" style="cursor:pointer">
                <img src="${img}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;">
                <h2>${r.nom}</h2>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                <span class="badge-sous-cat">${r.sousCategorie || ''}</span>
                ${badgeVisi}
                <div style="display:${estAuteur ? 'flex' : 'none'};gap:5px;">
                    <button onclick="window.preparerModif('${r.id}','${nomEsc}','${ingEsc}','${etaEsc}','${r.univers}','${r.sousCategorie}','${img}')" style="background:none;border:none;cursor:pointer;font-size:1.2rem;">✏️</button>
                    <button onclick="window.supprimerRecette('${r.id}')" style="color:red;background:none;border:none;cursor:pointer;font-size:1.2rem;">×</button>
                </div>
            </div>
        `;
        if (r.univers === "pâtisserie") patisserieCtn.appendChild(card);
        else cuisineCtn.appendChild(card);
    });
}

// --- FIREBASE RECETTES ---
window.chargerRecettes = async function() {
    try {
        const snap = await getDocs(collection(db, "recettes"));
        const user = auth.currentUser;
        toutesLesRecettes = [];
        snap.forEach(d => {
            const r = { id: d.id, ...d.data() };
            if (r.estPublic === true || (user && r.auteurId === user.uid)) {
                toutesLesRecettes.push(r);
            }
        });
        afficherRecettes(toutesLesRecettes);
    } catch (err) { console.error(err); }
};

window.ajouterRecette = async function() {
    if (!auth.currentUser) return alert("Tu dois être connecté !");
    const nom = document.getElementById("nom").value;
    if (!nom) return alert("Le nom est obligatoire !");

    const donnees = {
        nom,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        image: document.getElementById("imageLien").value,
        ingredients: document.getElementById("ingredients").value,
        etapes: document.getElementById("etapes").value,
        auteurId: auth.currentUser.uid,
        estPublic: document.getElementById("public").checked
    };

    try {
        if (modeEdition) {
            await updateDoc(doc(db, "recettes", modeEdition), donnees);
            modeEdition = null;
            document.querySelector(".btn-save").innerText = "Enregistrer la Recette";
        } else {
            await addDoc(collection(db, "recettes"), donnees);
        }
        document.querySelectorAll(".formulaire input[type=text], .formulaire textarea").forEach(i => i.value = "");
        window.chargerRecettes();
    } catch (err) { alert("Erreur : " + err.message); }
};

window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette ?")) {
        await deleteDoc(doc(db, "recettes", id));
        window.chargerRecettes();
    }
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
    document.querySelector(".btn-save").innerText = "Mettre à jour la recette";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- MODALE ---
window.ouvrirRecette = function(nom, ing, eta, img) {
    const list = eta.split(/[|\n]/).filter(e => e.trim()).map(e => `<li>${e.trim()}</li>`).join('');
    document.getElementById("contenuRecette").innerHTML = `
        <img src="${img}" style="width:100%;max-height:250px;object-fit:cover;border-radius:10px;">
        <h1 style="color:#2c3e50;margin-top:15px;">${nom}</h1>
        <div style="background:#f9f9f9;padding:15px;border-radius:10px;">
            <h3>🛒 Ingrédients</h3>
            <p style="white-space:pre-wrap;">${ing}</p>
        </div>
        <h3>👨‍🍳 Préparation</h3>
        <ul style="line-height:1.6;">${list}</ul>`;
    document.getElementById("modalRecette").style.display = "block";
};

window.fermerRecette = function() {
    document.getElementById("modalRecette").style.display = "none";
};

// --- RECHERCHE ET FILTRES ---
window.rechercherParNom = function() {
    const recherche = document.getElementById("recherche").value.toLowerCase();
    const resultats = toutesLesRecettes.filter(r => r.nom.toLowerCase().includes(recherche));
    afficherRecettes(resultats);
};

window.filtrerParCategorie = function(categorie) {
    if (!categorie) {
        afficherRecettes(toutesLesRecettes);
        return;
    }
    const resultats = toutesLesRecettes.filter(r => 
        (r.sousCategorie && r.sousCategorie.toLowerCase().includes(categorie)) ||
        (r.univers && r.univers.toLowerCase().includes(categorie))
    );
    afficherRecettes(resultats);
};

// --- SOUS CATEGORIES ---
window.majSousCategories = function() {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    if (!s) return;
    const opts = u === "cuisine"
        ? ["Entrée", "Plat", "Accompagnement"]
        : ["Gâteau", "Tarte", "Biscuit", "Entremet"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

window.majSousCategories();
