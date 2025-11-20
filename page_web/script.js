// Game setup depending of the difficulties.
const configurations = {
    'facile': { lignes: 6, colonnes: 7 },
    'moyen': { lignes: 6, colonnes: 9 },
    'difficile': { lignes: 7, colonnes: 8 }
};

let config = { lignes: 6, colonnes: 7 };
let grille = [];
let joueurActuel = 1;
let partieTerminee = false;

// To collect the pseudos early on.
const pseudoJoueur1 = sessionStorage.getItem("player1") || "Joueur 1";
const pseudoJoueur2 = sessionStorage.getItem("player2") || "Joueur 2";

// PAGE D'ACCUEIL.

// Function to start the game.
function startGame() {
    const player1 = document.getElementById("player1")?.value?.trim() || "";
    const player2 = document.getElementById("player2")?.value?.trim() || "";

    // Pseudo validations : no empty, less of twelve characters and differents.
    if (!player1 || !player2) {
        alert("Veuillez entrer des pseudos pour les deux joueurs.");
        return;
    }

    if (player1.length >= 12 || player2.length >= 12) {
        alert("Chaque pseudo doit contenir moins de 12 caractères.");
        return;
    }

    if (player1.toLowerCase() === player2.toLowerCase()) {
        alert("Les deux pseudos doivent être différents.");
        return;
    }

    if (player1 && player2) {
        const difficultyInput = document.querySelector('input[name="difficulty"]:checked');
        const difficulty = difficultyInput ? difficultyInput.value : 'facile';
        
        sessionStorage.setItem("player1", player1);
        sessionStorage.setItem("player2", player2);

        const formData = new FormData();
        formData.append("player1", player1);
        formData.append("player2", player2);
        formData.append("difficulty", difficulty);

        fetch("/", {
            method: "POST",
            body: formData
        }).then(response => {
            if (response.ok) {
                // Rediriger vers la page de jeu correspondante
                window.location.href = `/power4_jeu_${difficulty}`;
            } else {
                alert("Erreur lors de l'envoi des données au serveur.");
            }
        }).catch(error => {
            console.error("Erreur lors de la requête:", error);
            alert("Une erreur s'est produite lors de la connexion au serveur.");
        });
    }
}

// GAME PAGE.

// HTML gride's creation.
function GridCreation() {
    const table = document.getElementById('grille');
    if (!table) return;
    
    // Récupérer les dimensions depuis les data attributes.
    const lignes = parseInt(table.dataset.lignes) || 7;
    const colonnes = parseInt(table.dataset.colonnes) || 9;
    
    config = { lignes, colonnes };
    table.innerHTML = '';

    for (let ligne = 0; ligne < config.lignes; ligne++) {
        const tr = document.createElement('tr');
        for (let colonne = 0; colonne < config.colonnes; colonne++) {
            const td = document.createElement('td');
            td.className = 'cellule';
            td.dataset.ligne = ligne;
            td.dataset.colonne = colonne;
            td.addEventListener('click', () => PlayToken(colonne));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}

// To play a token.
async function PlayToken(colonne) {
    if (partieTerminee) return;

    try {
        const response = await fetch("/placer-pion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(colonne)
        });

        if (response.ok) {
            const data = await response.json();
            grille = data.Cases;
            ShowGrille();

            if (data.Winner > 0) {
                const couleur = data.Winner === 1 ? "rouge" : "jaune";
                const gagnantPseudo = data.Winner === 1 ? pseudoJoueur1 : pseudoJoueur2;
                document.getElementById("tour").textContent = 
                    `${gagnantPseudo} a gagné ! (${couleur})`;

    
                partieTerminee = true;
                highlightWinner(data.Winner);
            } else {
                const couleur = data.JoueurActuel === 1 ? "rouge" : "jaune";
                const pseudoActuel = data.JoueurActuel === 1 ? pseudoJoueur1 : pseudoJoueur2;
                document.getElementById("tour").textContent = 
                    `Tour de ${pseudoActuel} (${couleur})`;
                joueurActuel = data.JoueurActuel;
            }
        } else {
            console.error("Erreur serveur:", response.status);
        }
    } catch (error) {
        console.error("Erreur:", error);
    }
}

// To show the gride.
function ShowGrille() {
    for (let i = 0; i < config.lignes; i++) {
        for (let j = 0; j < config.colonnes; j++) {
            const cellule = document.querySelector(`[data-ligne="${i}"][data-colonne="${j}"]`);
            if (cellule) {
                cellule.className = 'cellule';
                
                if (grille[i] && grille[i][j] === 1) {
                    cellule.classList.add('joueur1');
                } else if (grille[i] && grille[i][j] === 2) {
                    cellule.classList.add('joueur2');
                }
            }
        }
    }
}

// Flash the winning tokens.
function highlightWinner(joueur) {
    for (let i = 0; i < config.lignes; i++) {
        for (let j = 0; j < config.colonnes; j++) {
            if (grille[i] && grille[i][j] === joueur) {
                const directions = [
                    [[0, 1], [0, -1]],   // Horizontal
                    [[1, 0], [-1, 0]],   // Vertical
                    [[1, 1], [-1, -1]],  // Diagonale \
                    [[1, -1], [-1, 1]]   // Diagonale /
                ];

                for (const direction of directions) {
                    const alignement = [[i, j]];
                    
                    for (const [dl, dc] of direction) {
                        let l = i + dl;
                        let c = j + dc;
                        while (l >= 0 && l < config.lignes && 
                               c >= 0 && c < config.colonnes && 
                               grille[l] && grille[l][c] === joueur) {
                            alignement.push([l, c]);
                            l += dl;
                            c += dc;
                        }
                    }

                    if (alignement.length >= 4) {
                        alignement.forEach(([l, c]) => {
                            const cellule = document.querySelector(`[data-ligne="${l}"][data-colonne="${c}"]`);
                            if (cellule) cellule.classList.add('gagnant');
                        });
                        return;
                    }
                }
            }
        }
    }
}

// To restart the game.
document.getElementById("recommencer")?.addEventListener("click", async () => {
    try {
        const response = await fetch("/reinitialiser", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (response.ok) {
            const data = await response.json();
            grille = data.Cases;
            joueurActuel = 1;
            partieTerminee = false;
            ShowGrille();
            document.getElementById("tour").textContent = `Tour de ${pseudoJoueur1} (rouge)`;
        }
    } catch (error) {
        console.error("Erreur lors de la réinitialisation:", error);
    }
});

// To leave and to return home page.
document.getElementById("quitter")?.addEventListener("click", () => {
    window.location.href = "/";
});

// Initialize the game.
async function GameInitialization() {
    const table = document.getElementById('grille');
    if (!table) return; // On est sur la page d'accueil
    // Read the dimensions indicated by the page first (default values).
    const attrLignes = parseInt(table.dataset.lignes, 10) || config.lignes;
    const attrColonnes = parseInt(table.dataset.colonnes, 10) || config.colonnes;
    config = { lignes: attrLignes, colonnes: attrColonnes };

    try {
        const response = await fetch("/power4_jeu", {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // If the servor send a grid, examine it.
            if (data.Cases && Array.isArray(data.Cases) && data.Cases.length > 0) {
                const serverLignes = data.Cases.length;
                const serverColonnes = data.Cases[0].length;

                // If the server size differs from the size requested by the page, ask the server to reset.
                if (serverLignes !== attrLignes || serverColonnes !== attrColonnes) {
                    // Ask to the servor to create a grid with the wanting dimensions.
                    try {
                        await fetch(`/reinitialiser?lignes=${attrLignes}&colonnes=${attrColonnes}`);
                        // To collect the update grid.
                        const refreshed = await fetch('/power4_jeu', { method: 'GET', headers: { 'Accept': 'application/json' } });
                        if (refreshed.ok) {
                            const newData = await refreshed.json();
                            if (newData.Cases && Array.isArray(newData.Cases) && newData.Cases.length > 0) {
                                config = { lignes: newData.Cases.length, colonnes: newData.Cases[0].length };
                                table.dataset.lignes = String(config.lignes);
                                table.dataset.colonnes = String(config.colonnes);
                                grille = newData.Cases;
                            } else {
                                grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
                            }
                        }
                    } catch (err) {
                        console.error('Erreur lors de la synchronisation du serveur :', err);
                        grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
                    }
                } else {
                    // matching sizes: use the server grid.
                    config = { lignes: serverLignes, colonnes: serverColonnes };
                    table.dataset.lignes = String(config.lignes);
                    table.dataset.colonnes = String(config.colonnes);
                    grille = data.Cases;
                }
            } else {
                // Otherwise initialize a blank grid based on the page attributes.
                grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
            }
        } else {
            grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
        }
    } catch (error) {
        console.error("Erreur d'initialisation:", error);
        grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
    }

    // Generate the DOM grid and display it.
    GridCreation();
    ShowGrille();
    joueurActuel = 1;
    partieTerminee = false;
    document.getElementById("tour").textContent = `Tour de ${pseudoJoueur1} (rouge)`;
}

// Start the game when the page loads.
window.addEventListener('DOMContentLoaded', () => {
    // Immediately display the nickname if you are on a game page.
    const tourElement = document.getElementById("tour");
    if (tourElement) {
        tourElement.textContent = `Tour de ${pseudoJoueur1} (rouge)`;
    }
    GameInitialization();
});