import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCXO-I5ZaXd_qdp5dC0hVle-pnr_3TAK_E",
    authDomain: "recipearl-911f4.firebaseapp.com",
    projectId: "recipearl-911f4",
    storageBucket: "recipearl-911f4.appspot.com",
    messagingSenderId: "568239681350",
    appId: "1:568239681350:web:28ced296uhehf3sca7v1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function supprimerDoublons() {
    console.log("📚 Chargement des recettes...");
    const snap = await getDocs(collection(db, "recettes"));
    const recettes = [];
    snap.forEach(d => recettes.push({ id: d.id, ...d.data() }));
    console.log(`✅ ${recettes.length} recettes trouvées.`);

    // Grouper par nom (insensible à la casse et aux espaces)
    const groupes = {};
    for (const r of recettes) {
        const cle = (r.nom || "").trim().toLowerCase();
        if (!groupes[cle]) groupes[cle] = [];
        groupes[cle].push(r);
    }

    // Trouver les doublons
    let totalDoublons = 0;
    const aSupprimer = [];

    for (const [nom, liste] of Object.entries(groupes)) {
        if (liste.length > 1) {
            console.log(`\n🔁 Doublon : "${nom}" (${liste.length} copies)`);
            // On garde le premier, on supprime les autres
            const aGarder = liste[0];
            const aJeter = liste.slice(1);
            console.log(`   ✅ Gardé : ${aGarder.id}`);
            aJeter.forEach(r => {
                console.log(`   🗑️  Supprimé : ${r.id}`);
                aSupprimer.push(r.id);
            });
            totalDoublons += aJeter.length;
        }
    }

    if (aSupprimer.length === 0) {
        console.log("\n✨ Aucun doublon trouvé !");
        return;
    }

    console.log(`\n🗑️  Suppression de ${totalDoublons} doublon(s)...`);
    for (const id of aSupprimer) {
        await deleteDoc(doc(db, "recettes", id));
        console.log(`   ✅ ${id} supprimé`);
    }

    console.log(`\n🎉 Terminé ! ${totalDoublons} doublon(s) supprimé(s).`);
}

supprimerDoublons().catch(console.error);
