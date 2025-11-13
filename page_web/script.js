// Configuration du jeu selon la difficulté
const configurations = {
    'facile': { lignes: 6, colonnes: 7 },
    'moyen': { lignes: 6, colonnes: 9 },
    'difficile': { lignes: 7, colonnes: 8 }
};

let config = { lignes: 6, colonnes: 7 };
let grille = [];
let joueurActuel = 1;
let partieTerminee = false;

// ========== PAGE D'ACCUEIL ==========

// Fonction pour démarrer une partie
function startGame() {
    const player1 = document.getElementById("player1")?.value?.trim() || "";
    const player2 = document.getElementById("player2")?.value?.trim() || "";

    // Validation des pseudos : non vides, moins de 12 caractères, et différents
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
    } else {
        alert("Veuillez entrer des pseudos pour les deux joueurs.");
    }
}

// ========== PAGE DE JEU ==========

// Créer la grille HTML
function creerGrille() {
    const table = document.getElementById('grille');
    if (!table) return;
    
    // Récupérer les dimensions depuis les data attributes
    const lignes = parseInt(table.dataset.lignes) || 6;
    const colonnes = parseInt(table.dataset.colonnes) || 7;
    
    config = { lignes, colonnes };
    table.innerHTML = '';

    for (let ligne = 0; ligne < config.lignes; ligne++) {
        const tr = document.createElement('tr');
        for (let colonne = 0; colonne < config.colonnes; colonne++) {
            const td = document.createElement('td');
            td.className = 'cellule';
            td.dataset.ligne = ligne;
            td.dataset.colonne = colonne;
            td.addEventListener('click', () => jouerCoup(colonne));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}

// Jouer un coup
async function jouerCoup(colonne) {
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
            afficherGrille();

            if (data.Winner > 0) {
                const couleur = data.Winner === 1 ? "rouge" : "jaune";
                document.getElementById("tour").textContent = 
                    `Le joueur ${data.Winner} a gagné ! (${couleur})`;
                partieTerminee = true;
                highlightWinner(data.Winner);
            } else {
                const couleur = data.JoueurActuel === 1 ? "rouge" : "jaune";
                document.getElementById("tour").textContent = 
                    `Tour du joueur ${data.JoueurActuel} (${couleur})`;
                joueurActuel = data.JoueurActuel;
            }
        } else {
            console.error("Erreur serveur:", response.status);
        }
    } catch (error) {
        console.error("Erreur:", error);
    }
}

// Afficher la grille
function afficherGrille() {
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

// Mettre en évidence les jetons gagnants
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

// Recommencer la partie
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
            afficherGrille();
            document.getElementById("tour").textContent = "Tour du joueur 1 (rouge)";
        }
    } catch (error) {
        console.error("Erreur lors de la réinitialisation:", error);
    }
});

// Quitter et retourner à l'accueil
document.getElementById("quitter")?.addEventListener("click", () => {
    window.location.href = "/";
});

// Initialiser le jeu
async function initialiserJeu() {
    const table = document.getElementById('grille');
    if (!table) return; // On est sur la page d'accueil
    
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
            
            // Initialiser la grille vide
            grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
            
            // Si le serveur envoie une grille, l'utiliser
            if (data.Cases && Array.isArray(data.Cases)) {
                grille = data.Cases;
            }
        } else {
            grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
        }
    } catch (error) {
        console.error("Erreur d'initialisation:", error);
        grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
    }
    
    creerGrille();
    afficherGrille();
    joueurActuel = 1;
    partieTerminee = false;
}

// Démarrer le jeu au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    initialiserJeu();
});