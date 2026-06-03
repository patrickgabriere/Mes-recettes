import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const CLAUDE_PROXY = "https://grimoire-proxy.patrick-gabriere.workers.dev";

async function detaillerEtapes(nom, ingredients, etapes) {
    const ing = Array.isArray(ingredients) ? ingredients.join(', ') : ingredients;
    const eta = Array.isArray(etapes) ? etapes.join('\n') : etapes;

    const prompt = `Tu es un chef cuisinier professionnel et pédagogue.
Réécris les étapes de cette recette de façon très détaillée et pratique.

Recette : ${nom}
Ingrédients : ${ing}
Étapes actuelles :
${eta}

Pour chaque étape donne la technique précise, la température, les signes visuels, la durée et une astuce si pertinent.
Format : une étape par ligne, commençant par un numéro. Sans introduction ni conclusion.`;

    const response = await fetch(CLAUDE_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
        })
    });

    const data = await response.json();
    return data.content[0].text;
}

async function main() {
    const snap = await db.collection("recettes").get();
    console.log(`${snap.docs.length} recettes à traiter...`);

    let i = 0;
    for (const docSnap of snap.docs) {
        const r = docSnap.data();
        i++;
        
        // Sauter les recettes qui ont déjà des étapes détaillées (plus de 200 chars)
        const etapesText = Array.isArray(r.etapes) ? r.etapes.join('\n') : (r.etapes || '');
        if (etapesText.length > 300) {
            console.log(`[${i}/${snap.docs.length}] SKIP (déjà détaillé): ${r.nom}`);
            continue;
        }

        try {
            console.log(`[${i}/${snap.docs.length}] Traitement: ${r.nom}...`);
            const nouvellesEtapes = await detaillerEtapes(r.nom, r.ingredients, r.etapes);
            await docSnap.ref.update({ etapes: nouvellesEtapes });
            console.log(`✅ ${r.nom}`);
            // Pause pour éviter le rate limiting
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.log(`❌ Erreur pour ${r.nom}: ${e.message}`);
        }
    }

    console.log("Terminé !");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
