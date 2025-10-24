// Configuration du jeu (constantes logiques)
const config = {
    colonnes: 7,
    lignes: 6,
    paddingRatio: 0.15, // padding relative à la taille de cellule
    radiusRatio: 0.42,   // radius relative à la taille de cellule
};

const structureCanvas = document.getElementById("structure");
const structureCtx = structureCanvas.getContext("2d");
const jetonsCanvas = document.getElementById("jetons");
const jetonsCtx = jetonsCanvas.getContext("2d");

// État initial de la grille
let grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
// Debug mode activated when URL contains #debug
const DEBUG = window.location.hash === '#debug';
let lastClick = null; // {x,y}

// Container and aspect ratio handling
const gameContainer = document.getElementById('game-container');
// Use the HTML intrinsic aspect ratio as default (height / width)
const DEFAULT_ASPECT = 750 / 1600;

// Resize canvas to match displayed size and devicePixelRatio
function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    // Decide CSS size based on container width and aspect ratio
    const cssW = Math.max(100, Math.min(gameContainer.clientWidth, window.innerWidth));
    const cssH = Math.round(cssW * DEFAULT_ASPECT);

    // Apply the same CSS size to both canvases so they overlap exactly
    [structureCanvas, jetonsCanvas].forEach((c) => {
        c.style.width = cssW + 'px';
        c.style.height = cssH + 'px';
        // set internal resolution according to DPR
        c.width = Math.round(cssW * dpr);
        c.height = Math.round(cssH * dpr);
        const ctx = c.getContext('2d');
        // map drawing to CSS pixels
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
}

// Compute drawing dimensions based on current CSS size (not internal px)
function getDimensions() {
    const cssW = structureCanvas.clientWidth;
    const cssH = structureCanvas.clientHeight;
    // choose cell size to fit both directions with some padding
    const maxCellW = cssW / (config.colonnes + 2); // leave room for padding
    const maxCellH = cssH / (config.lignes + 2);
    const cellSize = Math.floor(Math.min(maxCellW, maxCellH));
    const plateauWidth = cellSize * config.colonnes;
    const plateauHeight = cellSize * config.lignes;
    const startX = Math.round((cssW - plateauWidth) / 2);
    const startY = Math.round((cssH - plateauHeight) / 2);
    const padding = Math.round(cellSize * config.paddingRatio);
    const radius = Math.round(cellSize * config.radiusRatio);

    return {
        cssW, cssH, cellSize, plateauWidth, plateauHeight, startX, startY, padding, radius
    };
}

// Dessiner la structure
function dessinerStructure() {
    resizeCanvases();
    const dim = getDimensions();

    // Dessiner le plateau (fond)
    structureCtx.beginPath();
    structureCtx.fillStyle = "#ADD8E6";
    structureCtx.rect(dim.startX, dim.startY, dim.plateauWidth, dim.plateauHeight);
    structureCtx.fill();
    structureCtx.closePath();

    // Dessiner les trous
    structureCtx.fillStyle = "white";
    for (let i = 0; i < config.lignes; i++) {
        for (let j = 0; j < config.colonnes; j++) {
            structureCtx.beginPath();
            const cx = dim.startX + j * dim.cellSize + Math.floor(dim.cellSize / 2);
            const cy = dim.startY + i * dim.cellSize + Math.floor(dim.cellSize / 2);
            structureCtx.arc(
                cx,
                cy,
                dim.radius,
                0,
                Math.PI * 2,
                false
            );
            structureCtx.fill();
            structureCtx.closePath();
        }
    }

    // Debug overlay: bounding box and grid lines
    if (DEBUG) {
        structureCtx.save();
        structureCtx.strokeStyle = 'red';
        structureCtx.lineWidth = 1;
        // bounding box
        structureCtx.strokeRect(dim.startX + 0.5, dim.startY + 0.5, dim.plateauWidth, dim.plateauHeight);
        // vertical grid lines
        for (let c = 0; c <= config.colonnes; c++) {
            const x = dim.startX + c * dim.cellSize + 0.5;
            structureCtx.beginPath(); structureCtx.moveTo(x, dim.startY); structureCtx.lineTo(x, dim.startY + dim.plateauHeight); structureCtx.stroke();
        }
        // horizontal grid lines
        for (let r = 0; r <= config.lignes; r++) {
            const y = dim.startY + r * dim.cellSize + 0.5;
            structureCtx.beginPath(); structureCtx.moveTo(dim.startX, y); structureCtx.lineTo(dim.startX + dim.plateauWidth, y); structureCtx.stroke();
        }
        structureCtx.restore();
    }
}

// Dessiner les jetons
function dessinerJetons(grille) {
    const dim = getDimensions();
    // jetonsCtx uses CSS pixels (because of setTransform in resizeCanvases)
    jetonsCtx.clearRect(0, 0, jetonsCanvas.clientWidth, jetonsCanvas.clientHeight);
    for (let i = 0; i < config.lignes; i++) {
        for (let j = 0; j < config.colonnes; j++) {
            if (grille[i][j] !== 0) {
                jetonsCtx.beginPath();
                jetonsCtx.fillStyle = grille[i][j] === 1 ? "red" : "yellow";
                const cx = dim.startX + j * dim.cellSize + Math.floor(dim.cellSize / 2);
                const cy = dim.startY + i * dim.cellSize + Math.floor(dim.cellSize / 2);
                jetonsCtx.arc(cx, cy, dim.radius, 0, Math.PI * 2, false);
                jetonsCtx.fill();
                jetonsCtx.closePath();
            }
        }
    }

    // draw debug last click
    if (DEBUG && lastClick) {
        jetonsCtx.save();
        jetonsCtx.fillStyle = 'rgba(255,0,0,0.8)';
        jetonsCtx.beginPath();
        jetonsCtx.arc(lastClick.x, lastClick.y, 6, 0, Math.PI * 2);
        jetonsCtx.fill();
        jetonsCtx.font = '12px Arial';
        jetonsCtx.fillText(`(${lastClick.x.toFixed(0)},${lastClick.y.toFixed(0)})`, lastClick.x + 8, lastClick.y - 8);
        jetonsCtx.restore();
    }
}

// Gérer le clic sur une colonne
jetonsCanvas.addEventListener("click", async (e) => {
    const rect = jetonsCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastClick = { x, y };
    const dim = getDimensions();

    // Vérifier si le clic est dans la zone de jeu
    if (x >= dim.startX && x <= dim.startX + dim.plateauWidth &&
        y >= dim.startY && y <= dim.startY + dim.plateauHeight) {
        const colonne = Math.floor((x - dim.startX) / dim.cellSize);
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
                // Mettre à jour la grille locale et redessiner
                grille = data.Cases;
                dessinerJetons(grille);

                if (data.Winner > 0) {
                    // Si quelqu'un a gagné
                    document.getElementById("tour").textContent =
                        `Le joueur ${data.Winner} a gagné ! (${data.Winner === 1 ? "rouge" : "jaune"})`;
                    // Désactiver les clics sur la grille
                    jetonsCanvas.style.pointerEvents = "none";
                } else {
                    // Si la partie continue
                    document.getElementById("tour").textContent =
                        `Tour du joueur ${data.JoueurActuel} (${data.JoueurActuel === 1 ? "rouge" : "jaune"})`;
                }
            } else {
                console.error("Erreur serveur placer-pion:", response.status);
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    }
});

// Gestion du bouton recommencer
document.getElementById("recommencer")?.addEventListener("click", async () => {
    try {
        // Appeler l'endpoint de réinitialisation
        const response = await fetch("/reinitialiser", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Effacer les canvas (utiliser CSS pixels)
            structureCtx.clearRect(0, 0, structureCanvas.clientWidth, structureCanvas.clientHeight);
            jetonsCtx.clearRect(0, 0, jetonsCanvas.clientWidth, jetonsCanvas.clientHeight);
            
            // Réinitialiser la grille locale
            grille = data.Cases;
            
            // Redessiner la grille vide
            dessinerStructure();
            
            // Réactiver les clics
            jetonsCanvas.style.pointerEvents = "auto";
            
            // Réinitialiser le message du tour
            document.getElementById("tour").textContent = "Tour du joueur 1 (rouge)";
        }
    } catch (error) {
        console.error("Erreur lors de la réinitialisation:", error);
    }
});

// Gestion du bouton quitter
document.getElementById("quitter")?.addEventListener("click", () => {
    window.location.href = "/";  // Retour à la page d'accueil
});

// Initialiser le jeu
async function initialiserJeu() {
    try {
        // Réinitialiser la grille locale
        grille = Array(config.lignes).fill().map(() => Array(config.colonnes).fill(0));
        
        const response = await fetch("/power4_jeu", {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Mettre à jour la grille avec les données du serveur
            grille = data.Cases;
            // Dessiner tout le jeu
            redessinerJeu();
            // Réactiver les clics
            jetonsCanvas.style.pointerEvents = "auto";
            // Réinitialiser le message du tour
            document.getElementById("tour").textContent = "Tour du joueur 1 (rouge)";
        } else {
            console.error("Erreur serveur:", response.status);
            redessinerJeu();
        }
    } catch (error) {
        console.error("Erreur d'initialisation:", error);
        redessinerJeu();
    }
}

// Fonction pour redessiner tout le jeu
function redessinerJeu() {
    const dim = getDimensions();
    // Effacer les deux canvas
    structureCtx.clearRect(0, 0, structureCanvas.clientWidth, structureCanvas.clientHeight);
    jetonsCtx.clearRect(0, 0, jetonsCanvas.clientWidth, jetonsCanvas.clientHeight);
    // Redessiner dans l'ordre : structure puis jetons
    dessinerStructure();
    dessinerJetons(grille);
}

// Gérer le redimensionnement de la fenêtre avec un debounce
let timeout;
window.addEventListener('resize', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        redessinerJeu();
    }, 100); // Attendre 100ms après le dernier événement de resize
});

// Initialisation
initialiserJeu();

// Gérer le zoom
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault(); // Empêcher le zoom par défaut
        setTimeout(redessinerJeu, 100); // Redessiner après le zoom
    }
}, { passive: false });

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
        }).then(response => {
            if (response.ok) {
                window.location.href = "power4_jeu";  // Enlève le / au début
            } else {
                alert("Erreur lors de l'envoi des données");
            }
        }).catch(error => {
            console.error("Erreur:", error);
            alert("Une erreur s'est produite");
        });
    } else {
        alert("Veuillez choisir vos pseudos.");
    }
}