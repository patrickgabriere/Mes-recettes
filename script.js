// --- DEBUT DU FICHIER ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// 1. INITIALISATION
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// IMPORTANT : On rend db et auth visibles pour le reste du code
window.db = db;
window.auth = auth;

let modeEdition = null;

// 2. AUTHENTIFICATION
window.connexionGoogle = function() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Connecté !", result.user.displayName);
        }).catch((error) => {
            alert("Erreur Firebase : " + error.message);
        });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Session active pour :", user.displayName);
    }
});
// --- LA SUITE DE TON CODE (FONCTIONS RECETTES) RESTE EN DESSOUS ---
window.gererConnexion = async function() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    if(!email || !pass) return alert("Remplis les champs !");
    
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
        if(loginDiv) loginDiv.style.display = "none";
        if(infoDiv) {
            infoDiv.style.display = "block";
            document.getElementById("txt-user").innerText = "👨‍🍳 " + (user.displayName || user.email);
        }
    } else {
        if(loginDiv) loginDiv.style.display = "block";
        if(infoDiv) infoDiv.style.display = "none";
    }
    window.chargerRecettes();
});

// 4. FONCTIONS DE RECETTES
function afficherRecettes(liste) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    if(!cuisineCtn || !patisserieCtn) return;

    cuisineCtn.innerHTML = ""; 
    patisserieCtn.innerHTML = "";

    liste.forEach(r => {
        const user = auth.currentUser;
        const estAuteur = user && r.auteurId === user.uid;
        
        const card = document.createElement("div");
        card.className = "recette";
        const img = r.image || "https://via.placeholder.com/300x150?text=Pas+d'image";

        // Nettoyage des données pour éviter les bugs JS dans le onclick
        const nomEsc = (r.nom || "").replace(/'/g, "\\'");
        const ingEsc = (r.ingredients || "").replace(/'/g, "\\'").replace(/\n/g, " ");
        const etaEsc = (r.etapes || "").replace(/'/g, "\\'").replace(/\n/g, " ");

        card.innerHTML = `
            <div onclick="window.ouvrirRecette('${nomEsc}', '${ingEsc}', '${etaEsc}', '${img}')" style="cursor:pointer">
                <img src="${img}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
                <h2>${r.nom}</h2>
            </div>
            <div style="display:flex; justify-content: space-between; align-items: center; margin-top:10px;">
                <span class="badge-sous-cat">${r.sousCategorie || ''}</span>
                <div style="display: ${estAuteur ? 'block' : 'none'}">
                    <button onclick="window.preparerModif('${r.id}', '${nomEsc}', '${ingEsc}', '${etaEsc}', '${r.univers}', '${r.sousCategorie}', '${img}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button onclick="window.supprimerRecette('${r.id}')" style="color:red; background:none; border:none; cursor:pointer; font-size: 1.2rem;">×</button>
                </div>
            </div>
        `;
        if (r.univers === "pâtisserie") patisserieCtn.appendChild(card);
        else cuisineCtn.appendChild(card);
    });
}

window.ajouterRecette = async function() {
    if (!auth.currentUser) return alert("Tu dois être connecté !");
    const nom = document.getElementById("nom").value;
    if(!nom) return alert("Le nom est obligatoire !");

    const donnees = {
        nom: nom,
        univers: document.getElementById("univers").value,
        sousCategorie: document.getElementById("sousCategorie").value,
        image: document.getElementById("imageLien").value,
        ingredients: document.getElementById("ingredients").value,
        etapes: document.getElementById("etapes").value,
        auteurId: auth.currentUser.uid,
        estPublic: document.getElementById("public") ? document.getElementById("public").checked : true
    };

    try {
        if (modeEdition) {
            await updateDoc(doc(db, "recettes", modeEdition), donnees);
            modeEdition = null;
            document.querySelector(".formulaire button.btn-save").innerText = "Enregistrer la Recette";
        } else {
            await addDoc(collection(db, "recettes"), donnees);
        }
        document.querySelectorAll(".formulaire input, .formulaire textarea").forEach(i => i.value = "");
        window.chargerRecettes();
    } catch(err) {
        alert("Erreur: " + err.message);
    }
};

window.chargerRecettes = async () => {
    try {
        const snap = await getDocs(collection(db, "recettes"));
        const user = auth.currentUser;
        let listeFiltree = [];
        snap.forEach(d => {
            const r = d.data();
            if (r.estPublic === true || (user && r.auteurId === user.uid)) {
                listeFiltree.push({ id: d.id, ...r });
            }
        });
        afficherRecettes(listeFiltree);
    } catch (err) { console.error(err); }
};

window.ouvrirRecette = function(nom, ing, eta, img) {
    const list = eta.split(/[|\n]/).filter(e => e.trim()).map(e => `<li>${e.trim()}</li>`).join('');
    document.getElementById("contenuRecette").innerHTML = `
        <img src="${img}" style="width:100%; max-height:250px; object-fit:cover; border-radius:10px;">
        <h1 style="color:#2c3e50; margin-top:15px;">${nom}</h1>
        <div style="background:#f9f9f9; padding:15px; border-radius:10px;">
            <h3>🛒 Ingrédients</h3>
            <p style="white-space: pre-wrap;">${ing}</p>
        </div>
        <h3>👨‍🍳 Préparation</h3>
        <ul style="line-height:1.6;">${list}</ul>`;
    document.getElementById("modalRecette").style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

window.supprimerRecette = async (id) => { 
    if(confirm("Supprimer cette recette ?")) { 
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
    document.querySelector(".formulaire button.btn-save").innerText = "Mettre à jour";
    window.scrollTo(0,0);
};

window.majSousCategories = function() {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    const opts = u === "cuisine" ? ["Entrée", "Plat", "Accompagnement"] : ["Gâteau", "Tarte", "Biscuit"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

window.majSousCategories();
