let structureCanvas = document.getElementById("structure");
let structureCtx = structureCanvas.getContext("2d");
let jetonsCanvas = document.getElementById("jetons");
let jetonsCtx = jetonsCanvas.getContext("2d");

// État initial de la grille
let grille = Array(6).fill().map(() => Array(7).fill(0));

// Dessiner la structure
function dessinerStructure() {
    structureCtx.beginPath();
    structureCtx.fillStyle = "#ADD8E6";
    structureCtx.lineWidth = "10";
    structureCtx.rect(500, 50, 600, 515);
    structureCtx.fill();
    structureCtx.closePath();

    structureCtx.beginPath();
    structureCtx.fillStyle = "white";
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            structureCtx.arc(545 + 85 * j, 95 + 85 * i, 35, 0, Math.PI * 2, false);
            structureCtx.fill();
            structureCtx.beginPath();
        }
    }
}

// Dessiner les jetons
function dessinerJetons(grille) {
    jetonsCtx.clearRect(0, 0, jetonsCanvas.width, jetonsCanvas.height);
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            if (grille[i][j] !== 0) {
                jetonsCtx.beginPath();
                jetonsCtx.fillStyle = grille[i][j] === 1 ? "red" : "yellow";
                jetonsCtx.arc(545 + 85 * j, 95 + 85 * i, 35, 0, Math.PI * 2, false);
                jetonsCtx.fill();
                jetonsCtx.closePath();
            }
        }
    }
}

// Gérer le clic sur une colonne
jetonsCanvas.addEventListener("click", async (e) => {
    const rect = jetonsCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Vérifier si le clic est dans la zone de jeu
    if (x >= 500 && x <= 1100 && y >= 50 && y <= 565) {
        const colonne = Math.floor((x - 500) / (600 / 7));
        
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
                dessinerJetons(data.Cases);
                document.getElementById("tour").textContent = 
                    `Tour du joueur ${data.JoueurActuel} (${data.JoueurActuel === 1 ? "rouge" : "jaune"})`;
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    }
});

// Gestion du bouton recommencer
document.getElementById("recommencer")?.addEventListener("click", async () => {
    window.location.href = "/page_web/power4_jeu.html";
});

// Gestion du bouton quitter
document.getElementById("quitter")?.addEventListener("click", () => {
    window.location.href = "/page_web/power4_accueil.html";
});

// Initialiser le jeu
async function initialiserJeu() {
    try {
        const response = await fetch("/power4_jeu", {
            headers: {
                'Accept': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            grille = data.Cases;
            dessinerStructure();
            dessinerJetons(grille);
            document.getElementById("tour").textContent = 
                `Tour du joueur ${data.JoueurActuel} (${data.JoueurActuel === 1 ? "rouge" : "jaune"})`;
        } else {
            console.error("Erreur serveur:", response.status);
        }
    } catch (error) {
        console.error("Erreur d'initialisation:", error);
        dessinerStructure(); // Au moins afficher la grille vide
    }
}

// Initialisation
initialiserJeu();

function startGame() {
    const player1 = document.getElementById("player1")?.value;
    const player2 = document.getElementById("player2")?.value;

    if (player1 && player2) {
        const formData = new FormData();
        formData.append("player1", player1);
        formData.append("player2", player2);
        
        fetch("/", {
            method: "POST",
            body: formData
        }).then(() => {
            window.location.href = "/power4_jeu";
        });
    } else {
        alert("Veuillez choisir vos pseudos.");
    }
}