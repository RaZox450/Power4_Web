package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// Structure pour la partie
type Game struct {
	Cases        [][]int `json:"Cases"`
	JoueurActuel int     `json:"JoueurActuel"`
	Winner       int     `json:"Winner"`
	Difficulty   string  `json:"Difficulty"`
}

var currentGame *Game
var player1Name string
var player2Name string

// Initialiser une nouvelle partie
func newGame(lignes, colonnes int, difficulty string) *Game {
	cases := make([][]int, lignes)
	for i := range cases {
		cases[i] = make([]int, colonnes)
	}

	return &Game{
		Cases:        cases,
		JoueurActuel: 1,
		Winner:       0,
		Difficulty:   difficulty,
	}
}

// Page d'accueil
func homePage(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		r.ParseForm()
		player1Name = r.FormValue("player1")
		player2Name = r.FormValue("player2")
		difficulty := r.FormValue("difficulty")

		// Créer une nouvelle partie selon la difficulté
		switch difficulty {
		case "moyen":
			currentGame = newGame(6, 9, difficulty)
		case "difficile":
			currentGame = newGame(7, 8, difficulty)
		default:
			currentGame = newGame(6, 7, "facile")
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	http.ServeFile(w, r, "./accueil.html")
}

// Pages de jeu
func facilePage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./facile.html")
}

func moyenPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./moyen.html")
}

func difficilePage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./difficile.html")
}

// API - Récupérer l'état du jeu
func getGame(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if currentGame == nil {
		currentGame = newGame(6, 7, "facile")
	}

	json.NewEncoder(w).Encode(currentGame)
}

// API - Placer un pion
func placerPion(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var colonne int
	err := json.NewDecoder(r.Body).Decode(&colonne)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if currentGame == nil {
		http.Error(w, "Aucune partie en cours", http.StatusBadRequest)
		return
	}

	// Trouver la ligne disponible
	ligne := -1
	for i := len(currentGame.Cases) - 1; i >= 0; i-- {
		if currentGame.Cases[i][colonne] == 0 {
			ligne = i
			break
		}
	}

	if ligne == -1 {
		http.Error(w, "Colonne pleine", http.StatusBadRequest)
		return
	}

	// Placer le pion
	currentGame.Cases[ligne][colonne] = currentGame.JoueurActuel

	// Vérifier la victoire
	if checkWin(ligne, colonne) {
		currentGame.Winner = currentGame.JoueurActuel
	} else {
		// Changer de joueur
		if currentGame.JoueurActuel == 1 {
			currentGame.JoueurActuel = 2
		} else {
			currentGame.JoueurActuel = 1
		}
	}

	json.NewEncoder(w).Encode(currentGame)
}

// Vérifier la victoire
func checkWin(ligne, colonne int) bool {
	joueur := currentGame.Cases[ligne][colonne]
	directions := [][2][2]int{
		{{0, 1}, {0, -1}},  // Horizontal
		{{1, 0}, {-1, 0}},  // Vertical
		{{1, 1}, {-1, -1}}, // Diagonale \
		{{1, -1}, {-1, 1}}, // Diagonale /
	}

	for _, direction := range directions {
		count := 1

		for _, d := range direction {
			l, c := ligne+d[0], colonne+d[1]
			for l >= 0 && l < len(currentGame.Cases) &&
				c >= 0 && c < len(currentGame.Cases[0]) &&
				currentGame.Cases[l][c] == joueur {
				count++
				l += d[0]
				c += d[1]
			}
		}

		if count >= 4 {
			return true
		}
	}

	return false
}

// API - Réinitialiser la partie
func reinitialiser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if currentGame != nil {
		lignes := len(currentGame.Cases)
		colonnes := len(currentGame.Cases[0])
		difficulty := currentGame.Difficulty
		currentGame = newGame(lignes, colonnes, difficulty)
	} else {
		currentGame = newGame(6, 7, "facile")
	}

	json.NewEncoder(w).Encode(currentGame)
}

func main() {
	// Routes HTML
	http.HandleFunc("/", homePage)
	http.HandleFunc("/power4_jeu_facile", facilePage)
	http.HandleFunc("/power4_jeu_moyen", moyenPage)
	http.HandleFunc("/power4_jeu_difficile", difficilePage)

	// Routes API
	http.HandleFunc("/power4_jeu", getGame)
	http.HandleFunc("/placer-pion", placerPion)
	http.HandleFunc("/reinitialiser", reinitialiser)

	// Fichiers statiques
	http.Handle("/style.css", http.FileServer(http.Dir(".")))
	http.Handle("/script.js", http.FileServer(http.Dir(".")))

	fmt.Println("Serveur démarré sur http://localhost:5500")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
