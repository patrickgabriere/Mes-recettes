import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let toutesLesRecettes = [];
let modeEdition = null;

// --- ONGLETS ---
window.changerOnglet = function(page, tabEl) {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    tabEl.classList.add('active');
    if (page === 'mes-recettes') window.chargerMesRecettes();
};

// --- AUTH ---
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
        } else { alert("Erreur : " + e.message); }
    }
};

window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const loginDiv = document.getElementById("form-login");
    const infoDiv = document.getElementById("info-user");
    if (user) {
        if (loginDiv) loginDiv.style.display = "none";
        if (infoDiv) {
            infoDiv.style.display = "flex";
            document.getElementById("txt-user").innerText = "👨‍🍳 " + (user.displayName || user.email);
        }
    } else {
        if (loginDiv) loginDiv.style.display = "flex";
        if (infoDiv) infoDiv.style.display = "none";
    }
    window.chargerRecettes();
});

// --- CREATION CARTE ---
function creerCarte(r, montrerActions) {
    const user = auth.currentUser;
    const estAuteur = user && r.auteurId === user.uid;
    const img = r.image || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400";
    const badgeVisi = r.estPublic
        ? '<span class="badge badge-public">🔓 Public</span>'
        : '<span class="badge badge-prive">🔒 Privé</span>';

    const card = document.createElement("div");
    card.className = "recette-card";

    card.innerHTML = `
        <img src="${img}" alt="${r.nom}" onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400'">
        <div class="recette-card-body">
            <h3>${r.nom}</h3>
            <div class="card-footer">
                <span class="badge badge-cat">${r.sousCategorie || r.univers}</span>
                ${montrerActions ? badgeVisi : ''}
                <div class="card-actions" style="display:${estAuteur && montrerActions ? 'flex' : 'none'}">
                    <button title="Modifier" data-id="${r.id}">✏️</button>
                    <button title="Supprimer" data-id="${r.id}" data-action="suppr">🗑️</button>
                </div>
            </div>
        </div>
    `;

    // Clic pour ouvrir
    card.querySelector('img').addEventListener('click', () => ouvrirRecette(r));
    card.querySelector('h3').addEventListener('click', () => ouvrirRecette(r));

    // Modifier
    const btnEdit = card.querySelector('[title="Modifier"]');
    if (btnEdit) btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        window.preparerModif(r);
    });

    // Supprimer
    const btnSuppr = card.querySelector('[data-action="suppr"]');
    if (btnSuppr) btnSuppr.addEventListener('click', (e) => {
        e.stopPropagation();
        window.supprimerRecette(r.id);
    });

    return card;
}

// --- AFFICHAGE COMMUNAUTE ---
function afficherRecettes(liste) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    if (!cuisineCtn || !patisserieCtn) return;
    cuisineCtn.innerHTML = "";
    patisserieCtn.innerHTML = "";

    const cuisine = liste.filter(r => r.univers !== "pâtisserie");
    const patisserie = liste.filter(r => r.univers === "pâtisserie");

    if (cuisine.length === 0) cuisineCtn.innerHTML = '<p class="empty-msg">Aucune recette de cuisine</p>';
    if (patisserie.length === 0) patisserieCtn.innerHTML = '<p class="empty-msg">Aucune recette de pâtisserie</p>';

    cuisine.forEach(r => cuisineCtn.appendChild(creerCarte(r, false)));
    patisserie.forEach(r => patisserieCtn.appendChild(creerCarte(r, false)));
}

// --- AFFICHAGE MES RECETTES ---
window.chargerMesRecettes = function() {
    const container = document.getElementById("liste-mes-recettes");
    if (!container) return;
    const user = auth.currentUser;
    if (!user) {
        container.innerHTML = '<p class="empty-msg">Connecte-toi pour voir tes recettes</p>';
        return;
    }
    const mesRecettes = toutesLesRecettes.filter(r => r.auteurId === user.uid);
    container.innerHTML = "";
    if (mesRecettes.length === 0) {
        container.innerHTML = '<p class="empty-msg">Tu n\'as pas encore ajouté de recettes</p>';
        return;
    }
    mesRecettes.forEach(r => container.appendChild(creerCarte(r, true)));
};

// --- FIREBASE ---
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
    if (!auth.currentUser) return alert("Tu dois être connecté pour ajouter une recette !");
    const nom = document.getElementById("nom").value.trim();
    if (!nom) return alert("Le nom est obligatoire !");

    const donnees = {
        nom,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        image: document.getElementById("imageLien").value.trim(),
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
        await window.chargerRecettes();
        // Retour à l'onglet communauté
        document.querySelectorAll('.tab')[0].click();
    } catch (err) { alert("Erreur : " + err.message); }
};

window.supprimerRecette = async function(id) {
    if (confirm("Supprimer cette recette définitivement ?")) {
        await deleteDoc(doc(db, "recettes", id));
        await window.chargerRecettes();
        window.chargerMesRecettes();
    }
};

window.preparerModif = function(r) {
    modeEdition = r.id;
    document.getElementById("nom").value = r.nom || "";
    document.getElementById("ingredients").value = r.ingredients || "";
    document.getElementById("etapes").value = r.etapes || "";
    document.getElementById("univers").value = r.univers || "cuisine";
    window.majSousCategories();
    document.getElementById("sousCategorie").value = r.sousCategorie || "";
    document.getElementById("imageLien").value = r.image || "";
    document.getElementById("public").checked = r.estPublic !== false;
    document.querySelector(".btn-save").innerText = "Mettre à jour la recette";
    // Aller à l'onglet ajouter
    document.querySelectorAll('.tab')[2].click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- MODALE ---
function ouvrirRecette(r) {
    const img = r.image || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400";
    const etapes = (r.etapes || "").split(/[|\n]/).filter(e => e.trim());
    const listeEtapes = etapes.map((e, i) => `<li>${e.trim()}</li>`).join('');

    document.getElementById("contenuRecette").innerHTML = `
        <img src="${img}" alt="${r.nom}" onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400'">
        <h2>${r.nom}</h2>
        <div class="modal-section">
            <h4>🛒 Ingrédients</h4>
            <p>${r.ingredients || "Non renseigné"}</p>
        </div>
        <div class="modal-section">
            <h4>👨‍🍳 Préparation</h4>
            <ol>${listeEtapes || '<li>Non renseigné</li>'}</ol>
        </div>
    `;
    document.getElementById("modalRecette").style.display = "block";
}

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
    if (!categorie) { afficherRecettes(toutesLesRecettes); return; }
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
