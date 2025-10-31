package main

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
)

// Structure pour la grille de jeu
type Grille struct {
	Cases        [][]int
	JoueurActuel int
	Pseudo1      string
	Pseudo2      string
	Winner       int    // 0 = pas de gagnant, 1 ou 2 pour le gagnant
	Difficulty   string // "facile", "moyen", "difficile"
}

var grille Grille

// Afficher page d'accueil
func home(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("page_web/power4_accueil.html"))
	if r.Method != http.MethodPost {
		tmpl.Execute(w, nil)
		return
	}

	type Joueur struct {
		Pseudo1 string
		Pseudo2 string
	}

	r.ParseForm()
	difficulty := r.FormValue("difficulty")
	data := Joueur{
		Pseudo1: r.FormValue("player1"),
		Pseudo2: r.FormValue("player2"),
	}

	// Journaliser les données reçues
	log.Printf("Données reçues : Pseudo1=%s, Pseudo2=%s, Difficulty=%s", data.Pseudo1, data.Pseudo2, difficulty)

	// Choisir la taille en fonction de la difficulté
	rows, cols := 6, 7 // par défaut facile
	switch difficulty {
	case "facile":
		rows, cols = 6, 7
	case "moyen":
		rows, cols = 6, 9
	case "difficile":
		rows, cols = 7, 8
	}

	// Initialiser la grille vide dynamique
	cases := make([][]int, rows)
	for i := 0; i < rows; i++ {
		cases[i] = make([]int, cols)
	}

	grille = Grille{
		Cases:        cases,
		JoueurActuel: 1,
		Pseudo1:      data.Pseudo1,
		Pseudo2:      data.Pseudo2,
		Difficulty:   difficulty,
	}

	// Journaliser l'URL de redirection
	redirectURL := "/power4_jeu_" + difficulty
	log.Printf("Redirection vers : %s", redirectURL)

	// Rediriger vers la page appropriée selon la difficulté
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func game(w http.ResponseWriter, r *http.Request) {
	// Déterminer la difficulté à partir du chemin (ex: /power4_jeu_moyen)
	path := r.URL.Path
	difficulty := "facile"
	switch path {
	case "/power4_jeu_facile":
		difficulty = "facile"
	case "/power4_jeu_moyen":
		difficulty = "moyen"
	case "/power4_jeu_difficile":
		difficulty = "difficile"
	case "/power4_jeu":
		// endpoint JSON pour l'initialisation depuis le client
		// laisser difficulty tel quel (sera géré ci-dessous)
	default:
		// si route inconnue, garder la difficulté actuelle ou défaut
		if grille.Difficulty != "" {
			difficulty = grille.Difficulty
		}
	}

	// Si la grille n'est pas initialisée ou si la difficulté demandée diffère,
	// initialiser une nouvelle grille adaptée à la difficulté
	rows, cols := 6, 7
	switch difficulty {
	case "facile":
		rows, cols = 6, 7
	case "moyen":
		rows, cols = 6, 9
	case "difficile":
		rows, cols = 7, 8
	}

	if len(grille.Cases) == 0 || grille.Difficulty != difficulty {
		cases := make([][]int, rows)
		for i := 0; i < rows; i++ {
			cases[i] = make([]int, cols)
		}
		grille.Cases = cases
		grille.JoueurActuel = 1
		grille.Winner = 0
		grille.Difficulty = difficulty
	}

	// Désactiver la mise en cache
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	// Si la requête demande du JSON, on renvoie la grille en JSON
	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(grille)
		return
	}

	// Si on veut la page HTML, servir le fichier statique correspondant à la difficulté
	file := "page_web/power4_jeu_facile.html"
	switch grille.Difficulty {
	case "moyen":
		file = "page_web/power4_jeu_moyen.html"
	case "difficile":
		file = "page_web/power4_jeu_difficile.html"
	}

	http.ServeFile(w, r, file)
}

// Fonction pour placer un pion
func placerPion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	var colonne int
	err := json.NewDecoder(r.Body).Decode(&colonne)
	if err != nil {
		http.Error(w, "Erreur de décodage JSON", http.StatusBadRequest)
		return
	}

	// Vérifier si la colonne est valide en fonction de la grille actuelle
	rows := len(grille.Cases)
	if rows == 0 {
		http.Error(w, "Grille non initialisée", http.StatusInternalServerError)
		return
	}
	cols := len(grille.Cases[0])
	if colonne < 0 || colonne >= cols {
		http.Error(w, "Colonne invalide", http.StatusBadRequest)
		return
	}

	// Trouver la première case vide dans la colonne (depuis le bas)
	ligne := -1
	for i := rows - 1; i >= 0; i-- {
		if grille.Cases[i][colonne] == 0 {
			ligne = i
			break
		}
	}

	if ligne == -1 {
		http.Error(w, "Colonne pleine", http.StatusBadRequest)
		return
	}

	// Placer le pion
	currentPlayer := grille.JoueurActuel
	grille.Cases[ligne][colonne] = currentPlayer

	// Vérifier si le joueur courant a gagné
	if checkVictory(currentPlayer) {
		grille.Winner = currentPlayer
		// Ne pas changer de joueur si la partie est terminée
	} else {
		// Changer de joueur seulement si personne n'a gagné
		if grille.JoueurActuel == 1 {
			grille.JoueurActuel = 2
		} else {
			grille.JoueurActuel = 1
		}
	}

	// Renvoyer la grille mise à jour
	json.NewEncoder(w).Encode(grille)
}

// Vérifie si le joueur 'player' a 4 jetons alignés
func checkVictory(player int) bool {
	if player == 0 {
		return false
	}
	directions := [][2]int{{0, 1}, {1, 0}, {1, 1}, {1, -1}} // droite, bas, diag bas-droite, diag bas-gauche
	rows := len(grille.Cases)
	if rows == 0 {
		return false
	}
	cols := len(grille.Cases[0])

	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			if grille.Cases[i][j] != player {
				continue
			}
			// tester chaque direction
			for _, d := range directions {
				count := 1
				x := i + d[0]
				y := j + d[1]
				for count < 4 && x >= 0 && x < rows && y >= 0 && y < cols && grille.Cases[x][y] == player {
					count++
					x += d[0]
					y += d[1]
				}
				if count >= 4 {
					return true
				}
			}
		}
	}
	return false
}

// création du serveur
// Réinitialise complètement la partie
func reinitialiser(w http.ResponseWriter, r *http.Request) {
	// Créer une nouvelle grille vide
	// garder dimensions actuelles
	rows := 6
	cols := 7
	if len(grille.Cases) > 0 {
		rows = len(grille.Cases)
		cols = len(grille.Cases[0])
	}
	cases := make([][]int, rows)
	for i := 0; i < rows; i++ {
		cases[i] = make([]int, cols)
	}
	grille = Grille{
		Cases:        cases,
		JoueurActuel: 1,
		Winner:       0,
		Pseudo1:      grille.Pseudo1,
		Pseudo2:      grille.Pseudo2,
		Difficulty:   grille.Difficulty,
	}

	// Renvoyer la nouvelle grille en JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(grille)
}

func main() {
	fs := http.FileServer(http.Dir("page_web/"))
	http.Handle("/page_web/", http.StripPrefix("/page_web/", fs))
	http.HandleFunc("/", home)
	// Routes pour chaque difficulté
	http.HandleFunc("/power4_jeu_facile", game)
	http.HandleFunc("/power4_jeu_moyen", game)
	http.HandleFunc("/power4_jeu_difficile", game)
	http.HandleFunc("/power4_jeu", game) // endpoint JSON pour initialisation client
	http.HandleFunc("/placer-pion", placerPion)
	http.HandleFunc("/reinitialiser", reinitialiser)
	http.ListenAndServe(":5500", nil)
}
