let cuisine = document.getElementById("liste-cuisine");
let patisserie = document.getElementById("liste-patisserie");

async function chargerRecettes() {
  const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
  const snapshot = await getDocs(collection(window.db, "recettes"));
  let recettes = [];
  snapshot.forEach(doc => {
    recettes.push({ id: doc.id, ...doc.data() });
  });
  afficherRecettes(recettes);
}

function afficherRecettes(recettes) {
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
        <button onclick="supprimerRecette('${recettes[i].id}')">Supprimer</button>
      </div>
    `;
    if (recettes[i].categorie === "pâtisserie") {
      patisserie.innerHTML += html;
    } else {
      cuisine.innerHTML += html;
    }
  }
}

async function ajouterRecette() {
  const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
  let nom = document.getElementById("nom").value;
  let ingredients = document.getElementById("ingredients").value.split(",");
  let etapes = document.getElementById("etapes").value.split(",");
  let categorie = document.getElementById("categorie").value;

  await addDoc(collection(window.db, "recettes"), { nom, categorie, ingredients, etapes });
  
  document.getElementById("nom").value = "";
  document.getElementById("ingredients").value = "";
  document.getElementById("etapes").value = "";
  
  chargerRecettes();
}

async function supprimerRecette(id) {
  const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
  await deleteDoc(doc(window.db, "recettes", id));
  chargerRecettes();
}

function rechercherRecette() {
  let recherche = document.getElementById("recherche").value.toLowerCase();
  const { getDocs, collection } = window;
}

chargerRecettes();
