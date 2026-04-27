// 1. LES IMPORTS (Toujours en haut)
import { 
    getDocs, collection, addDoc, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// 2. RÉCUPÉRATION DES INSTANCES (déjà créées dans ton index.html ou script.js d'init)
const db = window.db;
const auth = getAuth();
let modeEdition = null;

// 3. FONCTIONS D'AUTHENTIFICATION
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
            document.getElementById("txt-user").innerText = "👨‍🍳 " + user.email;
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

        const nomEsc = r.nom.replace(/'/g, "\\'");
        const ingEsc = r.ingredients ? r.ingredients.replace(/'/g, "\\'").replace(/\n/g, " ") : "";
        const etaEsc = r.etapes ? r.etapes.replace(/'/g, "\\'").replace(/\n/g, " ") : "";

        card.innerHTML = `
            <div onclick="window.ouvrirRecette('${nomEsc}', '${ingEsc}', '${etaEsc}', '${img}')" style="cursor:pointer">
                <img src="${img}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
                <h2>${r.nom}</h2>
            </div>
            <div style="display:flex; justify-content: space-between; align-items: center; margin-top:10px;">
                <span class="badge-sous-cat">${r.sousCategorie || ''}</span>
                <div style="display: ${estAuteur ? 'block' : 'none'}">
                    <button onclick="window.preparerModif('${r.id}', '${nomEsc}', '${ingEsc}', '${etaEsc}', '${r.univers}', '${r.sousCategorie}', '${img}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button onclick="window.supprimerRecette('${r.id}')" style="color:red; background:none; border:none; cursor:pointer;">×</button>
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
        auteurId: auth.currentUser.uid, // ID de celui qui crée
        estPublic: document.getElementById("public").checked // True si coché, False sinon
    };

    if (modeEdition) {
        await updateDoc(doc(db, "recettes", modeEdition), donnees);
        modeEdition = null;
        document.querySelector(".btn-save").innerText = "Enregistrer la Recette";
    } else {
        await addDoc(collection(db, "recettes"), donnees);
    }

    // Vider les champs
    document.querySelectorAll(".formulaire input, .formulaire textarea").forEach(i => i.value = "");
    document.getElementById("public").checked = true; // Remettre en public par défaut
    window.chargerRecettes();
};

window.chargerRecettes = async () => {
    const snap = await getDocs(collection(db, "recettes"));
    const user = auth.currentUser;
    let listeFiltree = [];

    snap.forEach(d => {
        const r = d.data();
        // CONDITION DE VISIBILITÉ :
        // On affiche si : La recette est publique OU (on est connecté ET on est l'auteur)
        if (r.estPublic === true || (user && r.auteurId === user.uid)) {
            listeFiltree.push({ id: d.id, ...r });
        }
    });

    afficherRecettes(listeFiltree);
};
// ... Garde tes fonctions ouvrirRecette, preparerModif, supprimerRecette et majSousCategories ...
// Mais assure-toi qu'elles commencent par window. pour être accessibles !

window.ouvrirRecette = function(nom, ing, eta, img) {
    const list = eta.split(/[|\n]/).filter(e => e.trim()).map(e => `<li>${e.trim()}</li>`).join('');
    document.getElementById("contenuRecette").innerHTML = `
        <img src="${img}" style="width:100%; border-radius:10px;">
        <h1>${nom}</h1>
        <p><b>Ingrédients :</b><br>${ing}</p>
        <p><b>Préparation :</b><ul>${list}</ul></p>`;
    document.getElementById("modalRecette").style.display = "block";
};

window.fermerRecette = () => document.getElementById("modalRecette").style.display = "none";

window.supprimerRecette = async (id) => { 
    if(confirm("Supprimer ?")) { await deleteDoc(doc(db, "recettes", id)); window.chargerRecettes(); }
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
    document.querySelector(".formulaire button").innerText = "Mettre à jour";
};

window.majSousCategories = function() {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    const opts = u === "cuisine" ? ["Entrée", "Plat", "Accompagnement"] : ["Gâteau", "Tarte", "Biscuit"];
    s.innerHTML = opts.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('');
};

window.majSousCategories();
