import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const CLAUDE_PROXY = "https://grimoire-proxy.patrick-gabriere.workers.dev";
const MODEL = "claude-sonnet-4-6";

let toutesLesRecettes = [];
let frigoImageBase64 = null;

// =============================================
// TOAST
// =============================================

function showToast(msg, type = "") {
    const t = document.getElementById("toast");
    t.className = "toast" + (type ? " " + type : "");
    const icon = type === "success" ? "✅ " : type === "error" ? "❌ " : "ℹ️ ";
    t.textContent = icon + msg;
    t.classList.add("show");
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

// =============================================
// IMAGE — Emojis propres (fiable à 100%)
// =============================================

const EMOJI_CAT = {
    soupe: "🥣", plat: "🍽️", accompagnement: "🥗", "entrée": "🥗",
    sauce: "🫕", apéro: "🥂", salade: "🥙", gâteau: "🎂",
    tarte: "🥧", biscuit: "🍪", viennoiserie: "🥐", "crème/mousse": "🍮",
    confiture: "🫙", pain: "🍞"
};

// Couleurs de fond par catégorie — chaque carte a une belle couleur cohérente
const BG_CAT = {
    soupe:        ["#FFF3E0", "#E65100"],
    plat:         ["#FBE9E7", "#BF360C"],
    accompagnement:["#E8F5E9", "#2E7D32"],
    "entrée":     ["#E3F2FD", "#1565C0"],
    sauce:        ["#FCE4EC", "#880E4F"],
    apéro:        ["#F3E5F5", "#6A1B9A"],
    salade:       ["#E8F5E9", "#1B5E20"],
    gâteau:       ["#FFF8E1", "#F57F17"],
    tarte:        ["#FFF3E0", "#E65100"],
    biscuit:      ["#EFEBE9", "#4E342E"],
    viennoiserie: ["#FFF8E1", "#F9A825"],
    "crème/mousse":["#F3E5F5", "#4A148C"],
    confiture:    ["#FCE4EC", "#C62828"],
    pain:         ["#EFEBE9", "#5D4037"],
};

function getEmojiCategorie(cat) {
    return EMOJI_CAT[cat?.toLowerCase()] || "🍴";
}

function getBgCategorie(cat) {
    return BG_CAT[cat?.toLowerCase()] || ["#F5F0EB", "#6B4C3B"];
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
        <button class="btn-mic-field" onclick="window.demarrerVocalChamp(null, this)" title="Dicter">🎙️</button>
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
                <div class="skeleton skeleton-line tall" style="margin-left:0;margin-right:0;width:80%;"></div>
                <div class="skeleton skeleton-line short" style="margin-left:0;margin-right:0;margin-top:10px;"></div>
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
        document.getElementById("nomRecette").value = "";
        document.getElementById("imageLien").value = "";
        document.getElementById("tempsPrep").value = "";
        document.getElementById("tempsCuisson").value = "";
        document.getElementById("portions").value = "";
        document.getElementById("zone-ingredients").innerHTML = `<div class="field-row"><input type="text" class="ingredient-item" placeholder="Ex: 200g de farine"></div>`;
        document.getElementById("zone-etapes").innerHTML = `<div class="field-row"><input type="text" class="etape-item" placeholder="Ex: Préchauffer le four à 180°C"></div>`;
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
    const cats = [...new Set(recs.map(r => r.sousCategorie).filter(Boolean))];
    const categories = ["tous", ...cats.map(c => c.toLowerCase())];

    const options = categories.map(val => {
        const label = val === 'tous' ? 'Toutes les catégories' : val.charAt(0).toUpperCase() + val.slice(1);
        const emoji = val === 'tous' ? '🍴' : getEmojiCategorie(val);
        const selected = val === filtreActif[type] ? 'selected' : '';
        return `<option value="${val}" ${selected}>${emoji} ${label}</option>`;
    }).join('');

    zone.innerHTML = `
        <div class="select-filtre-wrap">
            <select class="select-filtre" onchange="window.setFiltre('${type}', this.value)">
                ${options}
            </select>
        </div>
    `;
};

window.setFiltre = (type, cat) => {
    filtreActif[type] = cat;
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
        const emoji = getEmojiCategorie(r.sousCategorie);
        const [bgColor, accentColor] = getBgCategorie(r.sousCategorie);
        const temps = [];
        if (r.tempsPrep) temps.push(`⏱ ${r.tempsPrep}min`);
        if (r.tempsCuisson) temps.push(`🔥 ${r.tempsCuisson}min`);
        const tempsHtml = temps.length ? `<span class="recette-time">${temps.join(' · ')}</span>` : '';
        const portionsHtml = r.portions ? `<span class="recette-time">👥 ${r.portions}p</span>` : '';

        // Si une vraie image est fournie, on l'utilise ; sinon emoji sur fond coloré
        const imageHtml = (r.image && r.image.trim())
            ? `<img class="recette-img" src="${r.image}" alt="${r.nom}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="recette-img-placeholder" style="display:none;background:${bgColor};font-size:4rem;">${emoji}</div>`
            : `<div class="recette-img-placeholder" style="background:${bgColor};font-size:4rem;">${emoji}</div>`;

        return `
            <div class="recette-card" onclick="window.ouvrirRecette('${r.id}')">
                ${imageHtml}
                <div class="recette-info">
                    <div class="recette-title">${r.nom}</div>
                    <div class="recette-meta">
                        <span class="recette-badge" style="background:${bgColor};color:${accentColor};">${emoji} ${r.sousCategorie?.toUpperCase() || ''}</span>
                        ${tempsHtml}${portionsHtml}
                    </div>
                    ${r.auteurNom && type === 'commu' ? `<div class="card-author">par ${r.auteurNom}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// =============================================
// MODAL
// =============================================

window.ouvrirRecette = (id) => {
    const r = toutesLesRecettes.find(x => x.id === id);
    if (!r) return;

    const estAuteur = auth.currentUser && r.auteurId === auth.currentUser.uid;
    window._recetteCourante = r;

    const emoji = getEmojiCategorie(r.sousCategorie);
    const [bgColor, accentColor] = getBgCategorie(r.sousCategorie);
    const tempsTotal = (r.tempsPrep || 0) + (r.tempsCuisson || 0);

    const chips = [
        r.univers ? `<span class="meta-chip">${r.univers === 'pâtisserie' ? '🥐' : '🍳'} ${r.univers}</span>` : '',
        r.sousCategorie ? `<span class="meta-chip orange">${emoji} ${r.sousCategorie}</span>` : '',
        r.tempsPrep ? `<span class="meta-chip">⏱ Prép: ${r.tempsPrep}min</span>` : '',
        r.tempsCuisson ? `<span class="meta-chip">🔥 Cuisson: ${r.tempsCuisson}min</span>` : '',
        tempsTotal ? `<span class="meta-chip gold">⏰ Total: ${tempsTotal}min</span>` : '',
        r.portions ? `<span class="meta-chip">👥 ${r.portions} portions</span>` : '',
    ].filter(Boolean).join('');

    document.getElementById("contenuRecetteHeader").innerHTML = `
        <div class="modal-title">${r.nom}</div>
        <div class="modal-meta-row">${chips || `<span class="meta-chip">🍽️ Recette</span>`}</div>
    `;

    const ingredientsList = (r.ingredients || "").split('\n').filter(Boolean).map(i => `<li>${i}</li>`).join('');
    const etapesList = (r.etapes || "").split('\n').filter(Boolean).map(e => `<li>${e}</li>`).join('');

    const notesList = (r.notes || []).map(n => `
        <div class="note-item">
            ${n.texte}
            <div class="note-author">— ${n.auteur || 'Anonyme'}</div>
        </div>
    `).join('') || '<p style="color:#b0a090;font-size:0.85rem;margin-bottom:8px;">Pas encore de notes. Sois le premier !</p>';

    let bodyHtml = `
        <div class="modal-section-title">🍓 Ingrédients</div>
        <ul class="list-ingredients">${ingredientsList || '<li>Non renseignés</li>'}</ul>

        ${etapesList ? `<div class="modal-section-title">🍳 Préparation</div><ol class="ol-etapes">${etapesList}</ol>` : ''}

        <div class="notes-zone">
            <div class="notes-title">📝 Notes & Astuces</div>
            <div class="notes-list" id="notes-list">${notesList}</div>
            ${auth.currentUser ? `
            <div class="note-input-row">
                <textarea id="noteInput" placeholder="Partage une astuce, une variante..."></textarea>
                <button onclick="window.ajouterNote('${r.id}')" class="btn-ia btn-ia-purple" style="width:auto;padding:10px 14px;">✉️</button>
            </div>` : `<p style="font-size:0.82rem;color:#b0a090;">Connecte-toi pour laisser une note.</p>`}
        </div>

        <div class="ia-box ia-box-purple">
            <p class="ia-box-title">🛒 Liste de courses</p>
            <button class="btn-ia btn-ia-purple" id="btnGenererListe" onclick="window.genererListeCourses()">✨ Générer ma liste de courses triée (IA)</button>
            <div id="zoneRenduListe" class="liste-rendu"></div>
        </div>
        <div class="ia-box ia-box-green">
            <p class="ia-box-title">👨‍🍳 Conseils du chef</p>
            <button class="btn-ia btn-ia-green" id="btnConseils" onclick="window.genererConseils()">🌿 Obtenir des conseils de préparation (IA)</button>
            <div id="zoneRenduConseils" class="liste-rendu"></div>
        </div>
        <div class="ia-box ia-box-orange">
            <p class="ia-box-title">🔍 Recettes similaires</p>
            <button class="btn-ia btn-ia-orange" id="btnSimilaires" onclick="window.genererSimilaires()">🍽️ Suggérer des recettes similaires (IA)</button>
            <div id="zoneRenduSimilaires" class="liste-rendu"></div>
        </div>

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

document.addEventListener('keydown', e => { if (e.key === 'Escape') window.fermerRecette(); });

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
    } catch (e) { showToast("Erreur lors de la suppression", "error"); }
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
        const r = toutesLesRecettes.find(x => x.id === recetteId);
        if (r) r.notes = [...(r.notes || []), note];
        input.value = "";
        document.getElementById("notes-list").innerHTML = (r.notes || []).map(n => `
            <div class="note-item">${n.texte}<div class="note-author">— ${n.auteur || 'Anonyme'}</div></div>
        `).join('');
        showToast("Note ajoutée !", "success");
    } catch (e) { showToast("Erreur lors de l'ajout de la note", "error"); }
};

// =============================================
// RECONNAISSANCE VOCALE
// =============================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconnaissance = null;

function creerReconnaissance() {
    if (!SpeechRecognition) {
        showToast("La reconnaissance vocale n'est pas disponible sur ce navigateur.", "error");
        return null;
    }
    const r = new SpeechRecognition();
    r.lang = 'fr-FR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    return r;
}

// Recherche vocale (barre de recherche)
window.demarrerVocal = (inputId, type) => {
    const input = document.getElementById(inputId);
    const btn = input.parentElement.querySelector('.btn-mic-search');
    if (!btn) return;

    if (reconnaissance) { reconnaissance.stop(); return; }

    const r = creerReconnaissance();
    if (!r) return;
    reconnaissance = r;

    btn.classList.add('recording');
    btn.textContent = '⏹️';

    r.onresult = (e) => {
        const texte = e.results[0][0].transcript;
        input.value = texte;
        window.filtrerRecettes(type);
        showToast(`🎙️ "${texte}"`, "success");
    };
    r.onerror = () => showToast("Impossible de reconnaître la voix. Réessaie !", "error");
    r.onend = () => {
        reconnaissance = null;
        btn.classList.remove('recording');
        btn.textContent = '🎙️';
    };
    r.start();
};

// Dictée vocale (champ de formulaire)
window.demarrerVocalChamp = (inputId, btnEl) => {
    const input = inputId
        ? document.getElementById(inputId)
        : btnEl.previousElementSibling;
    const btn = btnEl || (inputId ? document.querySelector(`[onclick*="${inputId}"]`) : null);

    if (reconnaissance) { reconnaissance.stop(); return; }

    const r = creerReconnaissance();
    if (!r) return;
    reconnaissance = r;

    if (btn) { btn.classList.add('recording'); btn.textContent = '⏹️'; }

    r.onresult = (e) => {
        const texte = e.results[0][0].transcript;
        // Capitalise la première lettre
        input.value = texte.charAt(0).toUpperCase() + texte.slice(1);
        input.focus();
    };
    r.onerror = () => showToast("Impossible de reconnaître la voix. Réessaie !", "error");
    r.onend = () => {
        reconnaissance = null;
        if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️'; }
    };
    r.start();
};

// =============================================
//  — GÉNÉRIQUE
// =============================================

async function appeller(prompt, btnId, zoneId, labelEnCours, labelFini) {
    const btn = document.getElementById(btnId);
    const rendu = document.getElementById(zoneId);
    if (!btn || !rendu) return;

    btn.innerHTML = `<span class="spinner"></span> ${labelEnCours}`;
    btn.disabled = true;
    rendu.style.display = "block";
    rendu.innerHTML = `<span class="ia-loading"><span class="spinner"></span> Magie en cours…</span>`;

    try {
        const response = await fetch(_PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
        });
        if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
        const data = await response.json();
        rendu.innerHTML = "";
        rendu.style.whiteSpace = "pre-line";
        rendu.textContent = data.content[0].text;
    } catch (error) {
        console.error("Erreur :", error);
        rendu.innerHTML = `<span style="color:#c0392b;">⚠️ Oups, le grimoire a eu un souci. Réessaye !</span>`;
    } finally {
        btn.innerHTML = labelFini;
        btn.disabled = false;
    }
}

window.genererListeCourses = () => {
    const r = window._recetteCourante; if (!r) return;
    appeller(
        `Tu es l'assistant culinaire du "Grimoire des Parents".\nGénère une liste de courses organisée par rayons.\n\nRecette : ${r.nom}\n${r.portions ? `Portions : ${r.portions} personnes\n` : ''}Ingrédients : ${r.ingredients}\n\nRègles :\n1. Organise par rayons avec émoji (🥦 Fruits & Légumes, 🥖 Épicerie, 🥛 Frais, 🥩 Boucherie, 🧴 Condiments…)\n2. Un ingrédient par ligne avec émoji\n3. Pas de doublons\n4. Commence directement, sans intro.`,
        "btnGenererListe", "zoneRenduListe", "Génération en cours…", "✨ Régénérer la liste de courses (IA)"
    );
};

window.genererConseils = () => {
    const r = window._recetteCourante; if (!r) return;
    appeller(
        `Tu es un chef bienveillant qui aide des parents à cuisiner.\n\nRecette : ${r.nom} (${r.univers} - ${r.sousCategorie})\n${r.portions ? `Portions : ${r.portions}\n` : ''}Ingrédients : ${r.ingredients}\nÉtapes : ${r.etapes}\n\nDonne 4 à 6 conseils pratiques (astuces, variantes, conservation, accompagnements).\nFormat : une ligne par conseil avec émoji, sans intro.`,
        "btnConseils", "zoneRenduConseils", "Analyse en cours…", "🌿 Obtenir des conseils de préparation (IA)"
    );
};

window.genererSimilaires = () => {
    const r = window._recetteCourante; if (!r) return;
    const nomsExistants = toutesLesRecettes.map(x => x.nom).join(', ');
    appeller(
        `Tu es un chef passionné de cuisine familiale.\nSuggère 4 recettes similaires à : ${r.nom} (${r.univers} - ${r.sousCategorie})\nIngrédients principaux : ${r.ingredients}\nÀ éviter (déjà dans le grimoire) : ${nomsExistants || 'aucune'}\n\nFormat : 🍽️ **Nom** — Description courte. 4 suggestions, sans intro.`,
        "btnSimilaires", "zoneRenduSimilaires", "Recherche en cours…", "🍽️ Suggérer des recettes similaires (IA)"
    );
};

// =============================================
// FRIGO
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

    try {
        const response = await fetch(_PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL, max_tokens: 1000,
                messages: [{ role: "user", content: [
                    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: frigoImageBase64 } },
                    { type: "text", text: `Analyse ce frigo. Réponds en JSON UNIQUEMENT (sans markdown).\n{"ingredients":["..."],"recettes":[{"emoji":"🍳","titre":"...","description":"..."}]}\nPropose 3-5 recettes familiales réalisables avec ces ingrédients.` }
                ]}]
            })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const json = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim());
        afficherResultatsFrigo(json);
    } catch (e) {
        showToast("Impossible d'analyser la photo. Vérifie ta connexion !", "error");
    } finally {
        btn.innerHTML = "✨ Ré-analyser le frigo (IA)";
        btn.disabled = false;
    }
};

function afficherResultatsFrigo(json) {
    document.getElementById("frigo-tags").innerHTML = json.ingredients.map(i => `<span class="tag-ingredient">🌿 ${i}</span>`).join('');
    document.getElementById("frigo-ingredients").style.display = "block";
    document.getElementById("frigo-recettes-liste").innerHTML = json.recettes.map(r => `
        <div class="frigo-recette-card">
            <div class="emoji">${r.emoji}</div>
            <div><div class="titre">${r.titre}</div><div class="sous">${r.description}</div></div>
        </div>
    `).join('');
    document.getElementById("frigo-recettes").style.display = "block";
}

// =============================================
// INIT & PWA
// =============================================

window.majSousCategories();

// =============================================
// PWA — Installation douce (Android + iPhone)
// =============================================

let deferredPrompt = null;

// Détection iPhone/iPad
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
// Détection si déjà installée (mode standalone)
const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Android : capturer l'événement natif
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // On affiche la bannière discrète en haut (pas la modale)
    const c = document.getElementById('pwa-install-container');
    if (c && !isInstalled) c.style.display = 'flex';
});

// Bouton bannière Android
const installBtn = document.getElementById('btn-pwa-install');
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        document.getElementById('pwa-install-container').style.display = 'none';
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
    });
}

// Contenu des étapes selon le type de téléphone
const STEPS_ANDROID = [
    "Appuie sur les <strong>trois petits points</strong> ⋮ en haut à droite de Chrome",
    "Puis sur <strong>« Ajouter à l'écran d'accueil »</strong>",
    "Et enfin <strong>Installer</strong> — c'est tout !"
];
const STEPS_IOS = [
    "Appuie sur le bouton <strong>Partager</strong> ⬆ en bas de Safari",
    "Fais défiler et appuie sur <strong>« Sur l'écran d'accueil »</strong>",
    "Puis <strong>Ajouter</strong> en haut à droite — et voilà !"
];

function remplirEtapesInstall() {
    const liste = document.getElementById('install-steps-list');
    const btn = document.getElementById('install-btn-main');
    if (!liste) return;
    const steps = isIOS ? STEPS_IOS : STEPS_ANDROID;
    liste.innerHTML = steps.map((s, i) => `
        <li>
            <span class="step-dot">${i + 1}</span>
            <span>${s}</span>
        </li>
    `).join('');
    // Sur iOS pas d'événement natif, le bouton explique juste (déjà visible dans les étapes)
    if (isIOS && btn) {
        btn.style.display = 'none'; // les étapes suffisent, pas de bouton
    }
}

window.actionInstall = async () => {
    if (deferredPrompt) {
        // Android avec prompt natif disponible
        document.getElementById('modal-install').style.display = 'none';
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
    }
    // Sur iOS : rien à faire, les étapes visuelles guident l'utilisateur
};

window.fermerModalInstall = (definitivement = false) => {
    document.getElementById('modal-install').style.display = 'none';
    if (definitivement) {
        // On se souvient du refus pour ne pas re-afficher à chaque visite
        try { localStorage.setItem('grimoire-install-refused', '1'); } catch(e) {}
    }
};

// Afficher la modale douce après 4s si :
// - pas déjà installée
// - pas déjà refusée
// - première ou deuxième visite (pas toutes les visites)
function tenterAfficherModalInstall() {
    if (isInstalled) return; // Déjà installée, on ne dérange pas

    try {
        if (localStorage.getItem('grimoire-install-refused')) return; // Refus mémorisé

        const visites = parseInt(localStorage.getItem('grimoire-visites') || '0') + 1;
        localStorage.setItem('grimoire-visites', visites);

        // On propose seulement à la 1ère et 3ème visite, pas à chaque fois
        if (visites !== 1 && visites !== 3) return;
    } catch(e) {}

    remplirEtapesInstall();
    setTimeout(() => {
        const modal = document.getElementById('modal-install');
        if (modal) modal.style.display = 'block';
    }, 4000); // 4 secondes après le chargement, pas agressif
}

// On attend que les recettes soient chargées avant de proposer
window.addEventListener('load', tenterAfficherModalInstall);
