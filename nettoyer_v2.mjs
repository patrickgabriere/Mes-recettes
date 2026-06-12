import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

// =============================================
// 1. DOUBLONS À SUPPRIMER
// =============================================
const aSupprimer = [
  // Tarte à l'oignon
  "1ubiBvYN4i3PELllyXDh",
  // Soupe à l'oignon
  "PQCuAMp4z0aAFYpvw3K9",
  // Confiture de fraises
  "25bYoSCv8sS6ob3CiFpA",
  // Soupe de poireaux
  "8Y8EiHQuvImp5iXBdCqc", "8yE8EiHQuv1mp5iXBdCqc",
  // Quatre-quarts
  "7DLgKMowBmeDDZZRD7CN",
  // Cannelés bordelais
  "8cGfD00TOEK1UW7bg5s",
  // Spanakopita
  "8iNcY9VGYch20st8uxgY", "BgkDdVMLeuLplnDsVyGa",
  // Spaghetti Carbonara
  "8ywQm6FR7hIvW9nKzr2r",
  // Tarte aux pommes
  "wOLzgPLCEYApTq9OUw8A",
  // Taboulé
  "4LBYIDjaeXW5o79icWGO", "5cBSqSj2xZ7T6VveLEgB",
  // Velouté de butternut
  "4Ps2h4RXNs8t2pm4Xtsc", "5il1GcoVSwsiQdcwEopS",
  // Crêpes sucrées
  "4Tvx8JFvi1B1ljfsrmJi",
  // Houmous
  "4uRtnOmzmnZ8vt4iN2oE", "KUIFBaLe0XDMkH1GX8Aj",
  // Risotto aux champignons
  "56yk9tvh4efdIXGY3wn3",
  // Pulled Pork
  "5Az5pkojSJjoSYEtwj4o", "EPviMFVFR4sbr7CAzZcO",
  // Baklava
  "5Az5pkojSJjoSYEtwj5o",
  // Pad Thaï
  "5YnDzfcRY1b0GDlrSb7J", "6toJCUn2qM2bbVFY8XI9",
  // Shakshuka
  "5cBSqSj2xZ7T6VveLEgB",
  // Churros
  "5il8EVMLptVClwu5sg8s", "Fulh3A2QOHhAV4kODWFM",
  // Oeufs en meurette
  "6Bo9VgmHY3DqkAtBtari",
  // Moules marinières
  "6Q2yOBg0mLbkh9IGscAK",
  // Tarte au chocolat (doublon tarte)
  // Chili con Carne
  "AOWGCwGPX6iqVOXjntc5",
  // Blanquette de veau
  "EYepj9ZFX0mg5G7wg6hy", "GYABETi25VxXBBVU4ng7",
  // Couscous royal
  "E9Ex3G5ZICp35RxcXJKf", "FbsouWkGgFRpawHIMmn9d",
  // Moussaka
  "EObQQ5QQCZ3nMle71nnn", "ZaC1AJtRee5gOySZfAYc",
  // Butter Chicken
  "TyG2mHG97IHuNZWvCoiV",
  // Bibimbap
  "2IUHC6YAXjVL8b0EYzWD", "q6e323w3F8DRXUt8RbEb",
  // Ratatouille
  "3Z26q9ftyXQL2eA0v7Rf", "Aa3gHLn29UG5uLdICZxk",
  // Enchiladas
  "3G3thBBHVlYxVFkgAapR", "P21uUo802RjfIMcT61p1",
  // Poulet rôti
  "3N1ecPWDbM5zJlhxxIo7", "QuHUiJ9RP3jnfWHi5aKF",
  // Curry japonais
  "3Z26q9ftyXQL2eA0v7Rg", "FMqgEMe2LHIyIbs2PH9o",
  // Tacos al Pastor
  "BpsoF06Pw2fGStaOVpeB", "FXcn69TqggyJ6TsjvHIS",
  // Sushi Maki
  "BDpM6J3ixrwd53gaRsj6", "CvfXpA9paupOg9cSxUiK",
  // Risotto (2e doublon)
  "B71GIsPS3T7MXmSRDhsp",
  // Poulet tikka masala
  "BJYkWe7b15CyO6Q75J71", "gpb8DgRfvJ6NK14RdqXL",
  // Falafel
  "WQzvhzQeBO5s3BO7oJX2",
  // Quiche Lorraine
  "CvfXpA9paupOg9cSxUiK", "NyPVZveXzRGbSKRaqXiM",
  // Tapenade
  "OCO8c2t4BGfeUwGFdeLg",
  // Samosas
  "C0tOtqbKILU64hwCfbVj", "oFgcGInqoOmIko01Luel",
  // Brandade de morue
  "FugR85VxIkzrRAZhVLMy",
  // Patatas Bravas
  "GYax3SmsvoyNjFmRPcOz", "RBrwS4zGrwyJerPO3yoK",
  // Gratin Dauphinois
  "Gk8yKHBPqmFeH92ovQ7K", "HDFy6bALeMjIggjKZ7rW",
  // Tarte Tatin
  "GvOXiQTGz8zeXU24BCWy", "IbhtFnS9A5MoIc698ouf",
  // Pastilla au poulet
  "H7Sl4j8ZBXbbpKOzIjae", "r77sHFtUXoddzBL8Y1Xa",
  // Salade grecque
  "IGDsNz61p24vHVFdbwEQ", "oUgPkmJFiHeHWA0cAT56",
  // Pho Bo
  "XeaPloaC1HrBLSqbsU3l",
  // Tiramisu
  "KRAru89txPbDVSUXirVq", "X8Pcl10NBHUAA2UMri8",
  // Madeleine
  "L51hOWySRQIEUM4g2sDT", "fXEQU4jOKT7omV4EtiVF",
  // Ramen
  "LeNurfk0Yi2cZWSDRSA7",
  // Gâteau basque
  "Lgxz2H4yjaxKSQZrRJnN",
  // Mousse au chocolat
  "M8wuE6vQcs5aNVQrUWc2", "ztZRwWeh78tcnir5V8yS",
  // Mole Poblano
  "MQYlLCCiMPupgqxqyg9g", "tYxzLaJGOkCFVddDRVy6",
  // Galette bretonne
  "MQajVhvPFrn29dv0YXNX",
  // Gyoza
  "Mb5u5xGHsAzXFCpZj8QY",
  // Financiers
  "RG3VbYF6hxeejMqGGfzq", "UqhT7nVdls8az62nbPhB",
  // Salade Niçoise
  "RUNUaYw345AjdvKWXRP9",
  // Boeuf Bourguignon
  "RV2Yr7p4x3ofqzvkrSqs", "nmXlaj14q0nuPHNwrYio",
  // Sauce hollandaise
  "Sd7Jq33AvKKx8GtjLOwT", "ZWgWNxC57fwW0FwvF9Pq4",
  // Crème brûlée
  "SeuoeQsodlG2FzG0ESZo",
  // Naan au beurre
  "CmP8owvUpOyA605TKn3A", "w2eKryqcLImDheJJPv9Xq",
  // Dim Sum vapeur
  "0HzaXKHfoPPKxb7RaZV4", "y3bJHsNa5nmnuZS5d3WN",
  // Tartiflette
  "9njTzvgOF5MD2e6pTupg", "y3bJHsNa5nmnuZS5d3WO",
  // Quesadillas
  "yAWSHX12WXJxzcYpRSHk",
  // Pain maison
  "d9WYL9ZfHocaq0122DSE",
  // Cheesecake
  "dZTLbkv126ALAMcb8L0E", "uq7FxzoYgemcH6mpukGL",
  // Tarte aux fraises
  "XEuw1kNV5GXS3SIp6eLC", "e6qsNEw8iWTapn0vNISl",
  // Sushi Maki 2
  "DKqVowfIJLEH0ZUD7yge",
  // Guacamole
  "DrcTVVYa2HxJFMgZtKLk", "cipIQDSqtzmyMJbM91ml",
  // Hamburger
  "E9Ex3G5ZICp35RxcXJKg", "9a4EZuRRwaLdwWazyaQi",
  // Tarte au citron
  "MihYwXFwHrJN1QAR4XON", "MihYwXFwHrJN1QAR4XOP",
  // Pho Ga (doublon Pho Bo)
  "SM3E9BqlaoZ8AEemgFZK",
  // Soupe Tom Kha Gai doublon
  "wJAVwPfmGVOqfKTleeo4",
  // Profiteroles
  "6SaS3PnlrbqPI3eq0VrD9", "ZOiMVLQXGA4QZE62V7sU",
  // Brownies
  "LW3Y9ySOFg4hmNa96F7d",
  // Pesto Genovese
  "oQlTLPRKGXaCOFAeNNPH", "sHY2BVFFFvZ7Fdo8GAsd",
  // Gougères
  "UuvBQurp14XS8vpryIbY",
  // Bo Bun
  "Hi9MN4tTTYCo52KnpIQV", "VOmtNVQHUtltruRRtgfn",
  // Tajine poulet olives doublon
  "YnRNOG67wF73G3MgaV9X",
  // Clafoutis
  "YGd3E3cSLgNqWgwCqkk7", "gCkOJA1uU1q0JgZWL4Vd",
  // Quatre-quarts doublon
  "iUVjlLNYb9pythwSCjZhT",
  // Tom Yum doublon
  "x5hloIt1c9s2nld83MTR",
  // Empanadas
  "to2u9uSHKBDw10PO60an",
  // Gado Gado doublon
  "cyAlFNvl2wGF47X9Owqh",
];

// =============================================
// 2. CORRECTION BUNYETES
// =============================================
const ID_BUNYETES = "IyJI5MoZ7BenwL69zvme";
const BUNYETES_CORRIGEE = {
    nom: "Bunyetes catalanes",
    univers: "pâtisserie",
    sousCategorie: "biscuit",
    origine: "française",
    portions: 50,
    tempsPrep: 30,
    tempsCuisson: 20,
    ingredients: "1 kg de farine\n1 bol de farine supplémentaire\n3 citrons (zeste)\n1 bouteille de fleur d'oranger\n1 cube de levure fraîche (40g)\n6 gros oeufs\n400 g de beurre ramolli\n2 litres d'huile pour friture\nSucre fin\n5 g de sel",
    etapes: "Mettez la farine et le sel dans un grand récipient. Mélangez bien.\nFaites dissoudre le cube de levure fraîche dans un peu d'eau tiède.\nAjoutez les oeufs, le zeste des 3 citrons et un peu plus de la moitié de la fleur d'oranger. Incorporez le beurre ramolli coupé en morceaux puis la levure dissoute.\nTravaillez la pâte en la repliant pour y incorporer de l'air. Utilisez le bol de farine supplémentaire pour décoller la pâte collante. Elle ne doit plus adhérer aux parois.\nCouvrez d'un linge humide puis d'un torchon. Laissez lever toute la matinée (idéalement préparer le matin pour cuire en fin de journée).\nPrélevez de petits morceaux de pâte et étalez-les au rouleau à pâtisserie en disques fins.\nFaites frire dans l'huile chaude sur une face puis retournez. Les bunyetes doivent être légèrement dorées.\nSortez-les de la friture, posez sur du papier absorbant et saupoudrez généreusement de sucre fin.",
    image: ""
};

async function main() {
    // Suppression des doublons
    console.log(`Suppression de ${aSupprimer.length} doublons...`);
    const batchSize = 400;
    for (let i = 0; i < aSupprimer.length; i += batchSize) {
        const batch = db.batch();
        aSupprimer.slice(i, i + batchSize).forEach(id => {
            batch.delete(db.collection("recettes").doc(id));
        });
        await batch.commit();
        console.log(`Supprimé ${Math.min(i + batchSize, aSupprimer.length)}/${aSupprimer.length}`);
    }

    // Correction Bunyetes
    console.log("\nCorrection des Bunyetes catalanes...");
    await db.collection("recettes").doc(ID_BUNYETES).update(BUNYETES_CORRIGEE);
    console.log("✅ Bunyetes corrigées !");

    console.log("\nTerminé !");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
