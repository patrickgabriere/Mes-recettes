import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const UNSPLASH_KEY = "aJKziiIrqJf56a0HgZ0XeqBRmycg716cCNPxB5vt7Ig";

// Traductions et mots-clés par recette pour de meilleures recherches
const TRADUCTIONS = {
    "millefeuille": "mille-feuille pastry cream puff pastry",
    "tarte tatin": "tarte tatin caramelized apple tart",
    "clafoutis aux cerises": "clafoutis cherry french dessert",
    "quatre-quarts": "quatre quarts pound cake french",
    "madeleine": "madeleine french cake cookie",
    "financiers": "financier french almond cake",
    "profiteroles": "profiteroles cream puffs chocolate",
    "paris-brest": "paris brest praline choux pastry",
    "gâteau basque": "gateau basque french cake",
    "baklava": "baklava honey pastry",
    "churros": "churros spanish fried dough",
    "tiramisu": "tiramisu italian dessert",
    "cheesecake new-yorkais": "new york cheesecake",
    "brownies": "chocolate brownies",
    "mousse au chocolat": "chocolate mousse dessert",
    "crème brûlée": "creme brulee french dessert",
    "tarte au citron": "lemon tart french pastry",
    "tarte aux pommes": "apple tart french",
    "tarte aux fraises": "strawberry tart french pastry",
    "soufflé au grand marnier": "souffle grand marnier dessert",
    "galette bretonne": "galette bretonne french butter cake",
    "kouign amann": "kouign amann breton pastry",
    "cannelés bordelais": "cannele bordeaux french pastry",
    "tarte tropézienne": "tarte tropezienne french cake",
    "brioche": "brioche french bread",
    "pain maison": "homemade bread loaf",
    "naan au beurre": "naan bread butter",
    "crêpes sucrées": "french crepes sweet",
};

// Suffixes par univers/catégorie
const SUFFIXES = {
    "pâtisserie": "dessert pastry food photography",
    "gâteau": "cake dessert food",
    "tarte": "tart pie dessert",
    "biscuit": "cookie biscuit pastry",
    "viennoiserie": "pastry french bakery",
    "confiture": "jam preserve food",
    "pain": "bread bakery",
    "cuisine": "food dish meal",
    "plat": "main dish food",
    "soupe": "soup bowl food",
    "entrée": "appetizer starter food",
    "dessert": "dessert sweet food",
};

async function chercherImage(nom, univers, sousCategorie) {
    try {
        const nomMin = nom.toLowerCase();
        // Utiliser la traduction si disponible, sinon construire la recherche
        let query;
        if (TRADUCTIONS[nomMin]) {
            query = TRADUCTIONS[nomMin];
        } else {
            const suffixe = SUFFIXES[sousCategorie] || SUFFIXES[univers] || "food dish";
            // Translittération simple des noms français
            const nomEn = nomMin
                .replace(/é|è|ê|ë/g, 'e')
                .replace(/à|â/g, 'a')
                .replace(/ô/g, 'o')
                .replace(/û|ù/g, 'u')
                .replace(/î/g, 'i')
                .replace(/ç/g, 'c');
            query = `${nomEn} ${suffixe}`;
        }

        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&client_id=${UNSPLASH_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.errors) {
            console.error(`Rate limit ou erreur API`);
            return null;
        }

        if (data.results && data.results.length > 0) {
            // Prendre la photo avec le plus de likes (meilleure qualité)
            const best = data.results.reduce((a, b) => (a.likes > b.likes ? a : b));
            return best.urls.regular;
        }
    } catch(e) {
        console.error(`Erreur pour ${nom}:`, e.message);
    }
    return null;
}

async function main() {
    const snap = await db.collection("recettes").get();
    // Traiter TOUTES les recettes (pas seulement celles sans image) pour corriger les mauvaises
    const recettes = snap.docs;
    console.log(`${recettes.length} recettes à traiter...`);

    let ok = 0, raté = 0;
    for (const docSnap of recettes) {
        const r = docSnap.data();
        const imageUrl = await chercherImage(r.nom, r.univers, r.sousCategorie);
        if (imageUrl) {
            await db.collection("recettes").doc(docSnap.id).update({ image: imageUrl });
            console.log(`✅ ${r.nom}`);
            ok++;
        } else {
            console.log(`⚠️  [quota?] ${r.nom}`);
            raté++;
        }
        await new Promise(r => setTimeout(r, 400));
    }
    console.log(`\nTerminé ! ✅${ok} OK  ⚠️${raté} non trouvées`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
