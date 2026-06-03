import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const UNSPLASH_KEY = "aJKziiIrqJf56a0HgZ0XeqBRmycg716cCNPxB5vt7Ig";

async function chercherImage(nomRecette) {
    try {
        const query = encodeURIComponent(nomRecette + " food dish");
        const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&client_id=${UNSPLASH_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].urls.regular;
        }
    } catch(e) {
        console.error(`Erreur pour ${nomRecette}:`, e.message);
    }
    return null;
}

async function main() {
    const snap = await db.collection("recettes").get();
    const recettes = snap.docs.filter(d => !d.data().image || d.data().image.trim() === "");
    console.log(`${recettes.length} recettes sans image à traiter...`);

    for (const docSnap of recettes) {
        const nom = docSnap.data().nom;
        const imageUrl = await chercherImage(nom);
        if (imageUrl) {
            await db.collection("recettes").doc(docSnap.id).update({ image: imageUrl });
            console.log(`✅ ${nom}`);
        } else {
            console.log(`⚠️  Pas d'image trouvée pour: ${nom}`);
        }
        // Petite pause pour ne pas dépasser la limite API
        await new Promise(r => setTimeout(r, 300));
    }
    console.log("\nTerminé !");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
