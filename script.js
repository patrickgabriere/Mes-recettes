import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Claude proxy (Cloudflare Worker)
const CLAUDE_PROXY = "https://grimoire-proxy.patrick-gabriere.workers.dev";
const MODEL = "claude-sonnet-4-20250514"; // Modèle unifié partout

let toutesLesRecettes = [];
let frigoImageBase64 = null;
let isLoading = false;

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(msg, type = "") {
    const t = document.getElementById("toast");
    t.textContent = "";
    t.className = "toast" + (type ? " " + type : "");
    const icon = type === "success" ? "✅ " : type === "error" ? "❌ " : "ℹ️ ";
    t.textContent = icon + msg;
    t.classList.add("show");
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

// =============================================
// ONGLETS & CHAMPS
// =============================================

window.changerOnglet = (page, el) => {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (el) el.classList.add('active');
};

window.ajouterChamp = (id, cl, placeholder = "Ajouter un élément...") => {
    const c = document.getElementById(id);
    const d = document.createElement("div");
    d.className = "field-row";
    d.innerHTML = `
        <input type="text" class="${cl}" placeholder="${placeholder}">
        <button onclick="this.parentElement.remove()" class="btn-remove-field" title="Supprimer">×</button>
    `;
    c.appendChild(d);
    d.querySelector('input').focus();
};

const sousCatMapping = {
    cuisine: ["Entrée", "Soupe", "Plat", "Accompagnement", "Sauce", "Apéro", "Salade"],
    pâtisserie: ["Gâteau", "Tarte", "Biscuit", "Viennoiserie", "Crème/Mousse", "Confiture", "Pain"]
};

window.majSousCategories = () => {
    const u = document.getElementById("univers").value;
    const s = document.getElementById("sousCategorie");
    s.innerHTML = sousCatMapping[u].map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join('');
};

// =============================================
// IMAGE HELPER — Pexels (Unsplash source. cassé)
// =============================================

function getImageUrl(recette) {
    if (recette.image && recette.image.trim()) return recette.image;
    // Pexels : images libres sans quota
    const queries = {
        soupe: "soup bowl", plat: "dinner plate food", accompagnement: "side dish",
        entrée: "appetizer food", sauce: "sauce cooking", apéro: "appetizer snack",
        salade: "salad bowl", gâteau: "cake dessert", tarte: "pie tart pastry",
        biscuit: "cookies biscuits", viennoiserie: "croissant pastry", "crème/mousse": "mousse dessert",
        confiture: "jam preserve", pain: "bread loaf"
    };
    const q = encodeURIComponent(queries[recette.sousCategorie] || recette.nom.split(' ').slice(0,2).join(' '));
    // Utilise picsum avec seed basé sur le nom pour une image stable et reproductible
    const seed = recette.nom.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return `https://picsum.photos/seed/${seed}/400/300`;
}

function getEmojiCategorie(sousCategorie) {
    const map = {
        soupe: "🥣", plat: "🍽️", accompagnement: "🥗", entrée: "🥗", sauce: "🫕",
        apéro: "🥂", salade: "🥙", gâteau: "🎂", tarte: "🥧", biscuit: "🍪",
        viennoiserie: "🥐", "crème/mousse": "🍮", confiture: "🫙", pain: "🍞"
    };
    return map[sousCategorie?.toLowerCase()] || "🍴";
}

// =============================================
// FIREBASE — CHARGEMENT
// =============================================

async function chargerRecettes() {
    afficherSkeletons();
    try {
        const snap = await getDocs(collection(db, "recettes"));
        toutesLesRecettes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.genererFiltres('commu');
        window.genererFiltres('perso');
        window.filtrerRecettes('commu');
        window.filtrerRecettes('perso');
    } catch (e) {
        console.error("Erreur chargement:", e);
        showToast("Impossible de charger les recettes", "error");
    }
}

function afficherSkeletons(n = 6) {
    const html = Array(n).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div style="padding:16px;">
                <div class="skeleton skeleton-line tall" style="margin-left:0; margin-right:0; width:80%;"></div>
                <div class="skeleton skeleton-line short" style="margin-left:0; margin-right:0; margin-top:10px;"></div>
            </div>
        </div>
    `).join('');
    document.getElementById('grille-commu').innerHTML = html;
}

// =============================================
// FIREBASE — AJOUT / SUPPRESSION
// =============================================

window.ajouterRecette = async () => {
    const nom = document.getElementById("nomRecette").value.trim();
    const ing = Array.from(document.querySelectorAll('.ingredient-item')).map(i => i.value.trim()).filter(Boolean).join('\n');
    const eta = Array.from(document.querySelectorAll('.etape-item')).map(e => e.value.trim()).filter(Boolean).join('\n');
    const tempsPrep = parseInt(document.getElementById("tempsPrep").value) || 0;
    const tempsCuisson = parseInt(document.getElementById("tempsCuisson").value) || 0;
    const portions = parseInt(document.getElementById("portions").value) || 0;

    if (!nom) { showToast("Le nom de la recette est requis !", "error"); return; }
    if (!ing) { showToast("Ajoute au moins un ingrédient !", "error"); return; }

    const btn = document.getElementById("btnSauvegarder");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enregistrement...';

    try {
        await addDoc(collection(db, "recettes"), {
            nom, ingredients: ing, etapes: eta,
            tempsPrep, tempsCuisson, portions,
            univers: document.getElementById("univers").value,
            sousCategorie: document.getElementById("sousCategorie").value,
            image: document.getElementById("imageLien").value.trim() || "",
            auteurId: auth.currentUser ? auth.currentUser.uid : "anonyme",
            auteurNom: auth.currentUser ? auth.currentUser.displayName : "Anonyme",
            estPublic: document.getElementById("public").checked,
            notes: [],
            createdAt: Date.now()
        });
        showToast("Recette ajoutée au Grimoire !", "success");
        // Reset form
        document.getElementById("nomRecette").value = "";
        document.getElementById("imageLien").value = "";
        document.getElementById("tempsPrep").value = "";
        document.getElementById("tempsCuisson").value = "";
        document.getElementById("portions").value = "";
        document.getElementById("zone-ingredients").innerHTML = `<div class="field-row"><input type="text" class="ingredient-item" placeholder="Ex: 200g de farine"></div>`;
        document.getElementById("zone-etapes").innerHTML = `<div class="field-row"><input type="text" class="etape-item" placeholder="Ex: Préchauffer le four à 180°C"></div>`;
        // Recharger sans reload complet
        await chargerRecettes();
        window.changerOnglet('mes-recettes', document.querySelectorAll('.tab')[1]);
    } catch (e) {
        console.error("Erreur ajout:", e);
        showToast("Erreur lors de l'enregistrement", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📖 Enregistrer dans le Grimoire';
    }
};

window.connexionGoogle = () => signInWithPopup(auth, provider).catch(e => {
    console.error(e);
    showToast("Erreur de connexion Google", "error");
});

window.deconnexion = () => signOut(auth).then(() => showToast("Déconnecté !"));

onAuthStateChanged(auth, async (user) => {
    document.getElementById("info-user").style.display = user ? "flex" : "none";
    document.getElementById("btn-login").style.display = user ? "none" : "block";
    if (user) {
        document.getElementById("txt-user").innerText = user.displayName;
        const avatar = document.getElementById("avatar-user");
        if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = "block"; }
    }
    await chargerRecettes();
});

// =============================================
// FILTRES & AFFICHAGE
// =============================================

let filtreActif = { commu: "tous", perso: "tous" };

window.genererFiltres = (type) => {
    const zone = document.getElementById('filtres-' + type);
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    const recs = toutesLesRecettes.filter(r => type === 'commu' ? r.estPublic : r.auteurId === uid);
    const categories = ["Tous", ...new Set(recs.map(r => r.sousCategorie).filter(Boolean).map(c => c.charAt(0).toUpperCase() + c.slice(1)))];
    zone.innerHTML = categories.map(c => {
        const val = c.toLowerCase();
        const cl = val === filtreActif[type] ? 'active' : '';
        const emoji = getEmojiCategorie(val);
        return `<button class="btn-filter ${cl}" onclick="window.setFiltre('${type}','${val}',this)">${emoji} ${c}</button>`;
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
    const inputId = type === 'commu' ? 'rechercheCommu' : 'recherchePerso';
    const txt = document.getElementById(inputId).value.toLowerCase().trim();
    const fCat = filtreActif[type];

    let res = toutesLesRecettes.filter(r => type === 'commu' ? r.estPublic : r.auteurId === uid);
    if (txt) res = res.filter(r =>
        r.nom.toLowerCase().includes(txt) ||
        (r.ingredients || "").toLowerCase().includes(txt)
    );
    if (fCat !== "tous") res = res.filter(r => r.sousCategorie?.toLowerCase() === fCat);

    const grille = document.getElementById('grille-' + type);

    if (!res.length) {
        grille.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-state-icon">${type === 'commu' ? '🌍' : '📚'}</div>
                <h3>${type === 'commu' ? 'Aucune recette publique' : 'Pas encore de recettes'}</h3>
                <p>${type === 'commu' ? 'Aucune recette ne correspond à ta recherche.' : 'Commence par en ajouter une !'}</p>
            </div>
        `;
        return;
    }

    grille.innerHTML = res.map(r => {
        const imgUrl = getImageUrl(r);
        const emoji = getEmojiCategorie(r.sousCategorie);
        const temps = [];
        if (r.tempsPrep) temps.push(`⏱ Prép: ${r.tempsPrep}min`);
        if (r.tempsCuisson) temps.push(`🔥 Cuisson: ${r.tempsCuisson}min`);
        const tempsHtml = temps.length ? `<span class="recette-time">${temps.join(' · ')}</span>` : '';
        const portionsHtml = r.portions ? `<span class="recette-time">👥 ${r.portions} pers.</span>` : '';

        return `
            <div class="recette-card" onclick="window.ouvrirRecette('${r.id}')">
                <img class="recette-img" src="${imgUrl}" alt="${r.nom}"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="recette-img-placeholder" style="display:none;">${emoji}</div>
                <div class="recette-info">
                    <div class="recette-title">${r.nom}</div>
                    <div class="recette-meta">
                        <span class="recette-badge">${emoji} ${r.sousCategorie?.toUpperCase() || ''}</span>
                        ${tempsHtml}
                        ${portionsHtml}
                    </div>
                    ${r.auteurNom && type === 'commu' ? `<div class="card-author">par ${r.auteurNom}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// =============================================
// MODAL DÉTAIL RECETTE
// =============================================

window.ouvrirRecette = (id) => {
    const r = toutesLesRecettes.find(x => x.id === id);
    if (!r) return;

    const estAuteur = auth.currentUser && r.auteurId === auth.currentUser.uid;
    window._recetteCourante = r;

    // Header
    const tempsTotal = (r.tempsPrep || 0) + (r.tempsCuisson || 0);
    const chips = [
        r.univers ? `<span class="meta-chip">${r.univers === 'pâtisserie' ? '🥐' : '🍳'} ${r.univers}</span>` : '',
        r.sousCategorie ? `<span class="meta-chip orange">${getEmojiCategorie(r.sousCategorie)} ${r.sousCategorie}</span>` : '',
        r.tempsPrep ? `<span class="meta-chip">⏱ Prép: ${r.tempsPrep}min</span>` : '',
        r.tempsCuisson ? `<span class="meta-chip">🔥 Cuisson: ${r.tempsCuisson}min</span>` : '',
        tempsTotal ? `<span class="meta-chip gold">⏰ Total: ${tempsTotal}min</span>` : '',
        r.portions ? `<span class="meta-chip">👥 ${r.portions} portions</span>` : '',
    ].filter(Boolean).join('');

    document.getElementById("contenuRecetteHeader").innerHTML = `
        <div class="modal-title">${r.nom}</div>
        <div class="modal-meta-row">${chips || '<span class="meta-chip">🍽️ Recette</span>'}</div>
    `;

    // Body
    const ingredientsList = (r.ingredients || "").split('\n').filter(Boolean)
        .map(i => `<li>${i}</li>`).join('');

    const etapesList = (r.etapes || "").split('\n').filter(Boolean)
        .map(e => `<li>${e}</li>`).join('');

    const notesList = (r.notes || []).map(n => `
        <div class="note-item">
            ${n.texte}
            <div class="note-author">— ${n.auteur || 'Anonyme'}</div>
        </div>
    `).join('') || '<p style="color:#b0a090; font-size:0.85rem; margin-bottom:8px;">Pas encore de notes. Sois le premier !</p>';

    const peutAjouterNote = !!auth.currentUser;

    let bodyHtml = `
        <div class="modal-section-title">🍓 Ingrédients</div>
        <ul class="list-ingredients">${ingredientsList || '<li>Non renseignés</li>'}</ul>

        ${etapesList ? `
        <div class="modal-section-title">🍳 Préparation</div>
        <ol class="ol-etapes">${etapesList}</ol>
        ` : ''}

        <!-- NOTES -->
        <div class="notes-zone">
            <div class="notes-title">📝 Notes & Astuces</div>
            <div class="notes-list" id="notes-list">${notesList}</div>
            ${peutAjouterNote ? `
            <div class="note-input-row">
                <textarea id="noteInput" placeholder="Partage une astuce, une variante..."></textarea>
                <button onclick="window.ajouterNote('${r.id}')" class="btn-ia btn-ia-purple" style="width:auto; padding:10px 14px;">✉️</button>
            </div>
            ` : `<p style="font-size:0.82rem; color:#b0a090;">Connecte-toi pour laisser une note.</p>`}
        </div>

        <!-- IA BOXES -->
        <div class="ia-box ia-box-purple">
            <p class="ia-box-title">🛒 Liste de courses</p>
            <button class="btn-ia btn-ia-purple" id="btnGenererListe" onclick="window.genererListeCourses()">
                ✨ Générer ma liste de courses triée (IA)
            </button>
            <div id="zoneRenduListe" class="liste-rendu"></div>
        </div>

        <div class="ia-box ia-box-green">
            <p class="ia-box-title">👨‍🍳 Conseils du chef</p>
            <button class="btn-ia btn-ia-green" id="btnConseils" onclick="window.genererConseils()">
                🌿 Obtenir des conseils de préparation (IA)
            </button>
            <div id="zoneRenduConseils" class="liste-rendu"></div>
        </div>

        <div class="ia-box ia-box-orange">
            <p class="ia-box-title">🔍 Recettes similaires</p>
            <button class="btn-ia btn-ia-orange" id="btnSimilaires" onclick="window.genererSimilaires()">
                🍽️ Suggérer des recettes similaires (IA)
            </button>
            <div id="zoneRenduSimilaires" class="liste-rendu"></div>
        </div>

        <!-- ACTIONS -->
        <button class="btn-print" onclick="window.print()">🖨️ Imprimer cette recette</button>
    `;

    if (estAuteur) {
        bodyHtml += `<button onclick="window.supprimerRecette('${r.id}')" class="btn-delete">🗑️ Supprimer cette recette</button>`;
    }

    document.getElementById("contenuRecette").innerHTML = bodyHtml;
    document.getElementById("modalRecette").style.display = "flex";
    document.body.style.overflow = "hidden";
};

window.fermerRecette = () => {
    document.getElementById("modalRecette").style.display = "none";
    document.body.style.overflow = "";
    window._recetteCourante = null;
};

// Fermer avec Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.fermerRecette();
});

window.supprimerRecette = async (id) => {
    if (!confirm("Supprimer définitivement cette recette ?")) return;
    try {
        await deleteDoc(doc(db, "recettes", id));
        window.fermerRecette();
        toutesLesRecettes = toutesLesRecettes.filter(r => r.id !== id);
        window.genererFiltres('commu');
        window.genererFiltres('perso');
        window.filtrerRecettes('commu');
        window.filtrerRecettes('perso');
        showToast("Recette supprimée", "success");
    } catch (e) {
        showToast("Erreur lors de la suppression", "error");
    }
};

// =============================================
// NOTES
// =============================================

window.ajouterNote = async (recetteId) => {
    const input = document.getElementById("noteInput");
    const texte = input.value.trim();
    if (!texte) return;
    if (!auth.currentUser) { showToast("Connecte-toi pour laisser une note", "error"); return; }

    const note = { texte, auteur: auth.currentUser.displayName, ts: Date.now() };
    try {
        await updateDoc(doc(db, "recettes", recetteId), { notes: arrayUnion(note) });
        // Mise à jour locale
        const r = toutesLesRecettes.find(x => x.id === recetteId);
        if (r) { r.notes = [...(r.notes || []), note]; }
        window._recetteCourante = r;
        input.value = "";
        // Refresh notes list
        const notesList = (r.notes || []).map(n => `
            <div class="note-item">
                ${n.texte}
                <div class="note-author">— ${n.auteur || 'Anonyme'}</div>
            </div>
        `).join('');
        document.getElementById("notes-list").innerHTML = notesList;
        showToast("Note ajoutée !", "success");
    } catch (e) {
        showToast("Erreur lors de l'ajout de la note", "error");
    }
};

// =============================================
// APPEL CLAUDE — GÉNÉRIQUE
// =============================================

async function appellerClaude(prompt, btnId, zoneId, labelEnCours, labelFini) {
    const btn = document.getElementById(btnId);
    const rendu = document.getElementById(zoneId);
    if (!btn || !rendu) return;

    btn.innerHTML = `<span class="spinner"></span> ${labelEnCours}`;
    btn.disabled = true;
    rendu.style.display = "block";
    rendu.innerHTML = `<span class="ia-loading"><span class="spinner"></span> Magie en cours…</span>`;

    try {
        const response = await fetch(CLAUDE_PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
        const data = await response.json();
        rendu.innerHTML = "";
        rendu.style.whiteSpace = "pre-line";
        rendu.textContent = data.content[0].text;

    } catch (error) {
        console.error("Erreur Claude:", error);
        rendu.innerHTML = `<span style="color:#c0392b;">⚠️ Oups, le grimoire a eu un souci. Réessaye !</span>`;
    } finally {
        btn.innerHTML = labelFini;
        btn.disabled = false;
    }
}

// =============================================
// IA 1 — LISTE DE COURSES
// =============================================

window.genererListeCourses = () => {
    const r = window._recetteCourante;
    if (!r) return;

    const tempsInfo = [r.tempsPrep && `Préparation : ${r.tempsPrep}min`, r.tempsCuisson && `Cuisson : ${r.tempsCuisson}min`]
        .filter(Boolean).join(', ');

    const prompt = `Tu es l'assistant culinaire du "Grimoire des Parents".
Génère une liste de courses claire et organisée par rayons pour cette recette.

Recette : ${r.nom}
${tempsInfo ? `Temps : ${tempsInfo}` : ''}
${r.portions ? `Portions : ${r.portions} personnes` : ''}
Ingrédients : ${r.ingredients}

Règles :
1. Organise par rayons avec un émoji (🥦 Fruits & Légumes, 🥖 Épicerie sèche, 🥛 Crèmerie/Frais, 🥩 Boucherie/Poissonnerie, 🧴 Condiments, etc.)
2. Un ingrédient par ligne avec un petit émoji devant
3. Supprime les doublons
4. Commence directement par les rayons, sans introduction ni conclusion`;

    appellerClaude(prompt, "btnGenererListe", "zoneRenduListe",
        "Génération en cours…", "✨ Régénérer la liste de courses (IA)");
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
${r.portions ? `Portions : ${r.portions} personnes` : ''}
Ingrédients : ${r.ingredients}
Étapes : ${r.etapes}

Donne 4 à 6 conseils concrets :
- Astuces pour ne pas rater
- Variantes possibles
- Conseils de conservation
- Accompagnements suggérés si pertinent
Format : une ligne par conseil avec un émoji, sans introduction ni conclusion.`;

    appellerClaude(prompt, "btnConseils", "zoneRenduConseils",
        "Analyse en cours…", "🌿 Obtenir des conseils de préparation (IA)");
};

// =============================================
// IA 3 — RECETTES SIMILAIRES
// =============================================

window.genererSimilaires = () => {
    const r = window._recetteCourante;
    if (!r) return;

    const nomsExistants = toutesLesRecettes.map(x => x.nom).join(', ');

    const prompt = `Tu es un chef passionné de cuisine familiale.
Suggère 4 recettes similaires à celle-ci que la famille pourrait aimer.

Recette de référence : ${r.nom} (${r.univers} - ${r.sousCategorie})
Ingrédients principaux : ${r.ingredients}
Recettes déjà dans le grimoire (à éviter) : ${nomsExistants || 'aucune'}

Pour chaque suggestion :
🍽️ **Nom de la recette** — Courte description en 1 phrase et pourquoi c'est similaire.

Format : 4 suggestions, directement sans introduction.`;

    appellerClaude(prompt, "btnSimilaires", "zoneRenduSimilaires",
        "Recherche en cours…", "🍽️ Suggérer des recettes similaires (IA)");
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
    btn.innerHTML = `<span class="spinner"></span> Analyse du frigo en cours…`;
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
                model: MODEL,
                max_tokens: 1000,
                messages: [{
                    role: "user",
                    content: [
                        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: frigoImageBase64 } },
                        { type: "text", text: prompt }
                    ]
                }]
            })
        });

        if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
        const data = await response.json();
        const texte = data.content[0].text;
        const json = JSON.parse(texte.replace(/```json|```/g, '').trim());
        afficherResultatsFrigo(json);

    } catch (error) {
        console.error("Erreur analyse frigo:", error);
        showToast("Impossible d'analyser la photo. Vérifie ta connexion !", "error");
    } finally {
        btn.innerHTML = "✨ Ré-analyser le frigo (IA)";
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
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn("SW Error:", err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installContainer) installContainer.style.display = 'flex';
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
