let recettesBase = [
  {
    nom: "Tarte aux pommes",
    categorie: "pâtisserie",
    ingredients: ["pommes", "farine", "beurre", "sucre"],
    etapes: ["Préparer la pâte", "Éplucher et couper les pommes", "Garnir le moule", "Cuire 35 min à 180°"]
  },
  {
    nom: "Quiche lorraine",
    categorie: "cuisine",
    ingredients: ["œufs", "lardons", "crème", "gruyère"],
    etapes: ["Préparer la pâte", "Faire revenir les lardons", "Mélanger œufs et crème", "Verser sur la pâte et cuire 30 min"]
  },
  {
    nom: "Rigatoni bacon, créme de bleu & ciboulette",
    categorie: "cuisine",
    ingredients: ["oignon", "fromage bleu", "rigatoni", "tranche de poitrine fumée", "ciboulette", "crème fraîche", "noix concassées"],
    etapes: ["Cuire les pâtes", "Faire revenir l'oignon et la poitrine", "Ajouter la crème et le fromage bleu", "Mélanger avec les pâtes et garnir"]
  }
];

let sauvegarde = localStorage.getItem("recettes");
let recettes = sauvegarde ? JSON.parse(sauvegarde) : recettesBase;

let cuisine = document.getElementById("liste-cuisine");
let patisserie = document.getElementById("liste-patisserie");

function afficherRecettes() {
  cuisine.innerHTML = "";
  patisserie.innerHTML = "";
  for (let i = 0; i < recettes.length; i++) {
    let etapesHTML = "";
    if (recettes[i].etapes) {
      etapesHTML = "<ol>";
      for (let j = 0; j < recettes[i].etapes.length; j++) {
        etapesHTML += "<li>" + recettes[i].etapes[j] + "</li>";
      }
      etapesHTML += "</ol>";
    }
    let html = `
      <div class="recette">
        <h2>${recettes[i].nom}</h2>
        <span class="categorie">${recettes[i].categorie}</span>
        <p>Ingrédients : ${recettes[i].ingredients.join(", ")}</p>
        ${etapesHTML}
        <button onclick="supprimerRecette(${i})">Supprimer</button>
      </div>
    `;
    if (recettes[i].categorie === "pâtisserie") {
      patisserie.innerHTML += html;
    } else {
      cuisine.innerHTML += html;
    }
  }
}

function sauvegarder() {
  localStorage.setItem("recettes", JSON.stringify(recettes));
}

function supprimerRecette(i) {
  recettes.splice(i, 1);
  sauvegarder();
  afficherRecettes();
}

function ajouterRecette() {
  let nom = document.getElementById("nom").value;
  let ingredients = document.getElementById("ingredients").value.split(",");
  let categorie = document.getElementById("categorie").value;
  let etapes = document.getElementById("etapes").value.split(",");

  recettes.push({ nom: nom, categorie: categorie, ingredients: ingredients, etapes: etapes });
  sauvegarder();
  afficherRecettes();

  document.getElementById("nom").value = "";
  document.getElementById("ingredients").value = "";
  document.getElementById("etapes").value = "";
}

function rechercherRecette() {
  let recherche = document.getElementById("recherche").value.toLowerCase();
  let resultats = recettes.filter(function(recette) {
    return recette.nom.toLowerCase().includes(recherche);
  });
  cuisine.innerHTML = "";
  patisserie.innerHTML = "";
  for (let i = 0; i < resultats.length; i++) {
    let html = `
      <div class="recette">
        <h2>${resultats[i].nom}</h2>
     <span class="categorie">${resultats[i].categorie}</span>
        <p>Ingrédients : ${resultats[i].ingredients.join(", ")}</p>
      </div>
    `;
    if (resultats[i].categorie === "pâtisserie") {
      patisserie.innerHTML += html;
    } else {
      cuisine.innerHTML += html;
    }
  }
}

afficherRecettes();