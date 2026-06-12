import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

// Dictionnaire nom → origine
const ORIGINES_PAR_NOM = {
    // Françaises
    "tarte à l'oignon": "française", "quiche lorraine": "française", "boeuf bourguignon": "française",
    "blanquette de veau": "française", "ratatouille": "française", "soupe à l'oignon": "française",
    "gratin dauphinois": "française", "tartiflette": "française", "poulet rôti": "française",
    "moules marinières": "française", "brandade de morue": "française", "oeufs en meurette": "française",
    "sauce hollandaise": "française", "soufflé au fromage": "française", "crêpes sucrées": "française",
    "galette bretonne": "française", "tarte tatin": "française", "tarte au citron": "française",
    "tarte aux pommes": "française", "tarte aux fraises": "française", "crème brûlée": "française",
    "mousse au chocolat": "française", "profiteroles": "française", "madeleine": "française",
    "financiers": "française", "gougères": "française", "clafoutis aux cerises": "française",
    "quatre-quarts": "française", "pain maison": "française", "brioche": "française",
    "salade niçoise": "française", "vichyssoise": "française", "pot-au-feu": "française",
    "cassoulet": "française", "bouillabaisse": "française", "tapenade": "française",
    "soupe de poireaux": "française", "velouté de butternut": "française", "soupe à la tomate": "française",
    "gâteau basque": "française", "kouign amann": "française", "cannelés bordelais": "française",
    "paris-brest": "française", "millefeuille": "française", "tarte tropézienne": "française",
    "bunyetes catalanes": "française", "mousseline de poireaux": "française",

    // Italiennes
    "spaghetti carbonara": "italienne", "pizza margherita": "italienne", "risotto aux champignons": "italienne",
    "tiramisu": "italienne", "osso buco": "italienne", "pesto genovese": "italienne",
    "pasta cacio e pepe": "italienne", "gnocchi à la romaine": "italienne",

    // Espagnoles
    "paella valenciana": "espagnole", "gazpacho": "espagnole", "churros": "espagnole",
    "patatas bravas": "espagnole", "empanadas": "espagnole",

    // Mexicaines
    "tacos al pastor": "mexicaine", "quesadillas": "mexicaine", "guacamole": "mexicaine",
    "enchiladas": "mexicaine", "chili con carne": "mexicaine", "mole poblano": "mexicaine",

    // Japonaises
    "sushi maki": "japonaise", "ramen": "japonaise", "gyoza": "japonaise",
    "okonomiyaki": "japonaise", "curry japonais": "japonaise", "gyudon": "japonaise",
    "tteokbokki": "coréenne",

    // Chinoises
    "dumplings chinois": "chinoise", "dim sum vapeur": "chinoise", "nasi goreng": "asiatique",
    "bao farcis au porc": "chinoise",

    // Asiatiques
    "pad thaï": "thaïlandaise", "curry vert thaï": "thaïlandaise", "tom yum goong": "thaïlandaise",
    "soupe tom kha gai": "thaïlandaise", "pho bo": "vietnamienne", "bo bun": "vietnamienne",
    "soupe pho ga": "vietnamienne", "bibimbap": "coréenne",

    // Indiennes
    "butter chicken": "indienne", "poulet tikka masala": "indienne", "dal de lentilles": "indienne",
    "saag paneer": "indienne", "naan au beurre": "indienne", "samosas": "indienne",

    // Méditerranéennes
    "moussaka": "grecque", "spanakopita": "grecque", "salade grecque": "grecque",
    "houmous": "libanaise", "falafel": "libanaise", "taboulé": "libanaise",
    "shakshuka": "méditerranéenne", "tajine d'agneau aux pruneaux": "marocaine",
    "tajine de poulet aux olives": "marocaine", "couscous royal": "marocaine",
    "pastilla au poulet": "marocaine", "tajine de kefta aux oeufs": "marocaine",
    "börek aux épinards": "méditerranéenne",

    // Américaines
    "hamburger maison": "américaine", "pulled pork": "américaine", "cheesecake new-yorkais": "américaine",
    "brownies": "américaine", "arepas au fromage": "américaine", "brigadeiro brésilien": "brésilienne",

    // Autres
    "baklava": "méditerranéenne", "ceviche": "autre", "mafe sénégalais": "autre",
};

async function main() {
    const snap = await db.collection("recettes").get();
    let ok = 0, skip = 0;

    for (const docSnap of snap.docs) {
        const r = docSnap.data();
        const nomMin = (r.nom || "").toLowerCase().trim();

        // Chercher dans le dictionnaire
        const origine = ORIGINES_PAR_NOM[nomMin];

        if (origine && (!r.origine || r.origine === "autre" || r.origine === "")) {
            await db.collection("recettes").doc(docSnap.id).update({ origine });
            console.log(`✅ ${r.nom} → ${origine}`);
            ok++;
        } else if (!origine && !r.origine) {
            console.log(`⚠️  Pas d'origine connue pour: ${r.nom}`);
            skip++;
        } else {
            skip++;
        }
    }

    console.log(`\nTerminé ! ✅ ${ok} mises à jour, ⏭ ${skip} ignorées`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
