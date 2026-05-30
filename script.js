import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// URL de ton Worker Cloudflare — pont sécurisé vers Claude
const CLAUDE_PROXY = "https://grimoire-proxy.patrick-gabriere.workers.dev";

let toutesLesRecettes = [];
let frigoImageBase64 = null;

// =============================================
// INTERFACE — ONGLETS & CHAMPS
// =============================================

window.changerOnglet = (page, el) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (el) el.classList.add('active');
};

window.ajouterChamp = (id, cl) => {
    const c = document.getElementById(id);
    const d = document.createElement("div");
    d.style = "display:flex; gap:10px; margin-bottom:10px;";
    d.innerHTML = `
        <input type="text" class="${cl}" style="flex:1; padding:14px 18px; border-radius:10px; border:2px solid var(--gray); font-size:1rem;" placeholder="Ajouter un élément...">
        <button onclick="this.parentElement.remove()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#e8672a;">×</button>
    `;
    c.appendChild(d);
};

const sousCatMapping = {
    cuisine: ["Plat", "Entrée", "Apéro", "Sauce", "Accompagnement"],
    pâtisserie: ["Gâteau", "Biscuit", "Crème/Mousse", "Tarte", "Viennoiserie"]
};

window.majSousCategories = () => {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    s.innerHTML = sousCatMapping[u].map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join('');
};

// =============================================
// FIREBASE — AJOUT / SUPPRESSION
// =============================================

window.ajouterRecette = async () => {
    const nom = document.getElementById("nomRecette").value.trim();
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

window.connexionGoogle = () => signInWithPopup(auth, provider).catch(() => alert("Erreur connexion"));
window.deconnexion = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    document.getElementById("info-user").style.display = user ? "flex" : "none";
    document.getElementById("btn-login").style.display = user ? "none" : "block";
    if (user) document.getElementById("txt-user").innerText = user.displayName;

    const snap = await getDocs(collection(db, "recettes"));
    toutesLesRecettes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    window.genererFiltres('commu');
    window.genererFiltres('perso');
    window.filtrerRecettes('commu');
    window.filtrerRecettes('perso');
});

// =============================================
// FILTRES & AFFICHAGE DES GRILLES
// =============================================

let filtreActif = { commu: "tous", perso: "tous" };

window.genererFiltres = (type) => {
    const zone = document.getElementById('filtres-' + type);
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    const recs = toutesLesRecettes.filter(r => type === 'commu' ? r.estPublic : r.auteurId === uid);
    const categories = ["Tous", ...new Set(recs.map(r => r.sousCategorie).filter(Boolean))];
    zone.innerHTML = categories.map(c => {
        const cl = c.toLowerCase() === filtreActif[type] ? 'active' : '';
        return `<button class="btn-filter ${cl}" onclick="window.setFiltre('${type}', '${c.toLowerCase()}', this)">${c.toUpperCase()}</button>`;
    }).join('');
};

window.setFiltre = (type, cat, el) => {
    filtreActif[type] = cat;
    el.parentElement.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    window.filtrerRecettes(type);
};

window.filtrerRecettes = (type) => {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    const txt = document.getElementById(type === 'commu' ? 'rechercheCommu' : 'recherchePerso').value.toLowerCase();
    const fCat = filtreActif[type];

    let res = toutesLesRecettes.filter(r => type === 'commu' ? r.estPublic : r.auteurId === uid);
    if (txt) res = res.filter(r => r.nom.toLowerCase().includes(txt) || r.ingredients.toLowerCase().includes(txt));
    if (fCat !== "tous") res = res.filter(r => r.sousCategorie === fCat);

    const grille = document.getElementById('grille-' + type);
    grille.innerHTML = res.map(r => `
        <div class="recette-card" onclick="window.ouvrirRecette('${r.id}')">
            <img class="recette-img" src="${r.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500'}" alt="${r.nom}">
            <div class="recette-info">
                <div class="recette-title">${r.nom}</div>
                <div class="recette-badge">${r.sousCategorie.toUpperCase()}</div>
            </div>
        </div>
    `).join('');
};

// =============================================
// MODAL DÉTAIL RECETTE
// =============================================

window.ouvrirRecette = (id) => {
    const r = toutesLesRecettes.find(x => x.id === id);
    if (!r) return;

    const estAuteur = auth.currentUser && r.auteurId === auth.currentUser.uid;
    window._recetteCourante = r;

    let html = `
        <div class="modal-title">${r.nom}</div>
        <div style="font-size:0.9rem; color:#a09080; margin-bottom:20px; font-weight:bold;">
            UNIVERS : ${r.univers.toUpperCase()} | CATÉGORIE : ${r.sousCategorie.toUpperCase()}
        </div>

        <div class="modal-section-title">🍓 Ingrédients</div>
        <ul class="list-ingredients">
            ${r.ingredients.split('\n').map(i => `<li>${i}</li>`).join('')}
        </ul>

        <div class="modal-section-title">🍳 Préparation</div>
        <ol class="ol-etapes">
            ${r.etapes.split('\n').map(e => `<li>${e}</li>`).join('')}
        </ol>

        <div class="ia-box ia-box-purple">
            <p class="ia-box-title">🛒 Liste de courses</p>
            <button class="btn-ia btn-ia-purple" id="btnGenererListe" onclick="window.genererListeCourses()">
                ✨ Générer ma liste de courses triée (IA)
            </button>
            <div id="zoneRenduListe" class="liste-rendu" style="display:none;"></div>
        </div>

        <div class="ia-box ia-box-green">
            <p class="ia-box-title">👨‍🍳 Conseils du chef</p>
            <button class="btn-ia btn-ia-green" id="btnConseils" onclick="window.genererConseils()">
                🌿 Obtenir des conseils de préparation (IA)
            </button>
            <div id="zoneRenduConseils" class="liste-rendu" style="display:none;"></div>
        </div>

        <div class="ia-box ia-box-orange">
            <p class="ia-box-title">🔍 Recettes similaires</p>
            <button class="btn-ia btn-ia-orange" id="btnSimilaires" onclick="window.genererSimilaires()">
                🍽️ Suggérer des recettes similaires (IA)
            </button>
            <div id="zoneRenduSimilaires" class="liste-rendu" style="display:none;"></div>
        </div>
    `;

    if (estAuteur) {
        html += `<button onclick="window.supprimerRecette('${r.id}')" style="margin-top:30px; background:#d9534f; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%;">Supprimer cette recette</button>`;
    }

    document.getElementById("contenuRecette").innerHTML = html;
    document.getElementById("modalRecette").style.display = "flex";
};

window.fermerRecette = () => {
    document.getElementById("modalRecette").style.display = "none";
    window._recetteCourante = null;
};

window.supprimerRecette = async (id) => {
    if (!confirm("Supprimer définitivement cette recette ?")) return;
    try {
        await deleteDoc(doc(db, "recettes", id));
        location.reload();
    } catch (e) { alert("Erreur suppression"); }
};

// =============================================
// APPEL CLAUDE — FONCTION GÉNÉRIQUE (texte)
// =============================================

async function appellerClaude(prompt, btnId, zoneId, labelEnCours, labelFini) {
    const btn = document.getElementById(btnId);
    const rendu = document.getElementById(zoneId);

    btn.innerText = labelEnCours;
    btn.disabled = true;
    rendu.style.display = "block";
    rendu.innerText = "✨ Magie en cours...";

    try {
        const response = await fetch(CLAUDE_PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (!response.ok) throw new Error("Erreur serveur");
        const data = await response.json();
        rendu.innerText = data.content[0].text;

    } catch (error) {
        console.error("Erreur Claude:", error);
        rendu.innerText = "Oups, le grimoire a eu un souci. Réessaye !";
    } finally {
        btn.innerText = labelFini;
        btn.disabled = false;
    }
}

// =============================================
// IA 1 — LISTE DE COURSES
// =============================================

window.genererListeCourses = () => {
    const r = window._recetteCourante;
    if (!r) return;

    const prompt = `Tu es l'assistant culinaire du "Grimoire des Parents".
Génère une liste de courses claire et organisée par rayons pour cette recette.

Recette : ${r.nom}
Ingrédients : ${r.ingredients}

Règles :
1. Organise par rayons avec un émoji (🥦 Fruits & Légumes, 🥖 Épicerie sèche, 🥛 Crèmerie/Frais, 🥩 Boucherie/Poissonnerie, 🧴 Condiments, etc.)
2. Un ingrédient par ligne avec un petit émoji devant
3. Supprime les doublons
4. Commence directement par les rayons, sans introduction ni conclusion`;

    appellerClaude(prompt, "btnGenererListe", "zoneRenduListe",
        "🔮 Génération en cours...", "✨ Régénérer la liste de courses (IA)");
};

// =============================================
// IA 2 — CONSEILS DU CHEF
// =============================================

window.genererConseils = () => {
    const r = window._recetteCourante;
    if (!r) return;

    const prompt = `Tu es un chef cuisinier bienveillant qui aide des parents à cuisiner pour leur famille.
Donne des conseils pratiques pour réussir cette recette.

Recette : ${r.nom}
Catégorie : ${r.univers} - ${r.sousCategorie}
Ingrédients : ${r.ingredients}
Étapes : ${r.etapes}

Donne 4 à 6 conseils concrets :
- Astuces pour ne pas rater
- Variantes possibles
- Conseils de conservation
- Accompagnements suggérés si pertinent
Format : une ligne par conseil avec un émoji, sans introduction ni conclusion.`;

    appellerClaude(prompt, "btnConseils", "zoneRenduConseils",
        "🌿 Analyse en cours...", "🌿 Obtenir des conseils de préparation (IA)");
};

// =============================================
// IA 3 — RECETTES SIMILAIRES
// =============================================

window.genererSimilaires = () => {
    const r = window._recetteCourante;
    if (!r) return;

    const nomsExistants = toutesLesRecettes.map(x => x.nom).join(', ');

    const prompt = `Tu es un chef passionné de cuisine familiale française.
Suggère 4 recettes similaires à celle-ci que la famille pourrait aimer.

Recette de référence : ${r.nom} (${r.univers} - ${r.sousCategorie})
Ingrédients principaux : ${r.ingredients}
Recettes déjà dans le grimoire (à éviter) : ${nomsExistants || 'aucune'}

Pour chaque suggestion :
🍽️ **Nom de la recette** — Courte description en 1 phrase et pourquoi c'est similaire.

Format : 4 suggestions, directement sans introduction.`;

    appellerClaude(prompt, "btnSimilaires", "zoneRenduSimilaires",
        "🍽️ Recherche en cours...", "🍽️ Suggérer des recettes similaires (IA)");
};

// =============================================
// IA 4 — PHOTO DU FRIGO
// =============================================

window.previsualiserFrigo = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("frigoPreview");
        preview.src = e.target.result;
        preview.style.display = "block";

        frigoImageBase64 = e.target.result.split(',')[1];

        document.getElementById("frigo-ia-zone").style.display = "block";
        document.getElementById("frigo-ingredients").style.display = "none";
        document.getElementById("frigo-recettes").style.display = "none";
    };
    reader.readAsDataURL(file);
};

window.analyserFrigo = async () => {
    if (!frigoImageBase64) return;

    const btn = document.getElementById("btnAnalyseFrigo");
    btn.innerText = "🔮 Analyse du frigo en cours...";
    btn.disabled = true;

    const nomsRecettes = toutesLesRecettes.map(r => r.nom).join(', ');

    const prompt = `Tu es l'assistant culinaire du "Grimoire des Parents", une app de recettes familiales.
Analyse cette photo de frigo et réponds en JSON valide UNIQUEMENT, sans texte autour, sans balises markdown.

Format attendu :
{
  "ingredients": ["ingrédient 1", "ingrédient 2"],
  "recettes": [
    { "emoji": "🍳", "titre": "Nom de la recette", "description": "Courte description et ingrédients utilisés" }
  ]
}

Règles :
- Liste tous les ingrédients visibles dans le frigo
- Propose 3 à 5 recettes réalisables avec ces ingrédients
- Donne la priorité aux recettes de type : ${nomsRecettes || 'cuisine familiale française'}
- Reste simple et familial`;

    try {
        const response = await fetch(CLAUDE_PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: frigoImageBase64
                            }
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }]
            })
        });

        if (!response.ok) throw new Error("Erreur serveur");

        const data = await response.json();
        const texte = data.content[0].text;
        const json = JSON.parse(texte.replace(/```json|```/g, '').trim());

        afficherResultatsFrigo(json);

    } catch (error) {
        console.error("Erreur analyse frigo:", error);
        alert("Impossible d'analyser la photo. Vérifie ta connexion et réessaye !");
    } finally {
        btn.innerText = "✨ Ré-analyser le frigo (IA)";
        btn.disabled = false;
    }
};

function afficherResultatsFrigo(json) {
    const zoneIngredients = document.getElementById("frigo-ingredients");
    const tagsEl = document.getElementById("frigo-tags");
    tagsEl.innerHTML = json.ingredients.map(i => `<span class="tag-ingredient">🌿 ${i}</span>`).join('');
    zoneIngredients.style.display = "block";

    const zoneRecettes = document.getElementById("frigo-recettes");
    const listeEl = document.getElementById("frigo-recettes-liste");
    listeEl.innerHTML = json.recettes.map(r => `
        <div class="frigo-recette-card">
            <div class="emoji">${r.emoji}</div>
            <div>
                <div class="titre">${r.titre}</div>
                <div class="sous">${r.description}</div>
            </div>
        </div>
    `).join('');
    zoneRecettes.style.display = "block";
}

// =============================================
// INIT & PWA
// =============================================

window.majSousCategories();

let deferredPrompt;
const installContainer = document.getElementById('pwa-install-container');
const installBtn = document.getElementById('btn-pwa-install');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW Error:", err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installContainer) installContainer.style.display = 'block';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (installContainer) installContainer.style.display = 'none';
    });
}
