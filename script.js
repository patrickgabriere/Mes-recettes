function afficherRecettes(liste) {
    const cuisineCtn = document.getElementById("liste-cuisine");
    const patisserieCtn = document.getElementById("liste-patisserie");
    
    if (!cuisineCtn || !patisserieCtn) return;

    cuisineCtn.innerHTML = ""; 
    patisserieCtn.innerHTML = "";

    liste.forEach(r => {
        const card = document.createElement("div");
        card.className = "recette";
        const img = r.image || "https://via.placeholder.com/300x150?text=Pas+d'image";

        // IMPORTANT : Nettoyage pour éviter que les apostrophes cassent le onclick
        const nomEsc = r.nom ? r.nom.replace(/'/g, "\\'") : "Sans nom";
        const ingEsc = r.ingredients ? r.ingredients.replace(/'/g, "\\'").replace(/\n/g, " ") : "";
        const etaEsc = r.etapes ? r.etapes.replace(/'/g, "\\'").replace(/\n/g, " ") : "";

        card.innerHTML = `
            <div class="card-link" style="cursor:pointer">
                <img src="${img}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
                <h2>${r.nom}</h2>
            </div>
            <div style="display:flex; justify-content: space-between; align-items: center; margin-top:10px;">
                <span class="badge-sous-cat">${r.sousCategorie || ''}</span>
                <div>
                    <button class="btn-edit" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                    <button class="btn-delete" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;">×</button>
                </div>
            </div>
        `;

        // Écouteur de clic pour ouvrir la modale
        card.querySelector(".card-link").addEventListener("click", () => {
            window.ouvrirRecette(nomEsc, ingEsc, etaEsc, img);
        });

        // Écouteur pour modifier
        card.querySelector(".btn-edit").addEventListener("click", (e) => {
            e.stopPropagation();
            window.preparerModif(r.id, nomEsc, ingEsc, etaEsc, r.univers, r.sousCategorie, img);
        });

        // Écouteur pour supprimer
        card.querySelector(".btn-delete").addEventListener("click", (e) => {
            e.stopPropagation();
            window.supprimerRecette(r.id);
        });

        if (r.univers === "pâtisserie") patisserieCtn.appendChild(card);
        else cuisineCtn.appendChild(card);
    });
}
