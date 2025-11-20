package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// Structure for the part.
type Game struct {
	Cases        [][]int `json:"Cases"`
	JoueurActuel int     `json:"JoueurActuel"`
	Winner       int     `json:"Winner"`
	Difficulty   string  `json:"Difficulty"`
}

var currentGame *Game
var player1Name string
var player2Name string

// Initialize a new game.
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

// Homepage.
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

	http.ServeFile(w, r, "./page_web/power4_accueil.html")
}

// Game pages.
func EasyPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./page_web/power4_jeu_facile.html")
}

func MediumPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./page_web/power4_jeu_moyen.html")
}

func HardPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./page_web/power4_jeu_difficile.html")
}

// API - Retrieve the game state.
func getGame(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if currentGame == nil {
		currentGame = newGame(6, 7, "facile")
	}

	json.NewEncoder(w).Encode(currentGame)
}

// API - Place a pawn.
func PlacePawn(w http.ResponseWriter, r *http.Request) {
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

	// Find the available line.
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

	// Place the token.
	currentGame.Cases[ligne][colonne] = currentGame.JoueurActuel

	// Verify the victory.
	if checkWin(ligne, colonne) {
		currentGame.Winner = currentGame.JoueurActuel
	} else {
		// Change player.
		if currentGame.JoueurActuel == 1 {
			currentGame.JoueurActuel = 2
		} else {
			currentGame.JoueurActuel = 1
		}
	}

	json.NewEncoder(w).Encode(currentGame)
}

// Verify the victory.
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

// API - Reset part.
func reset(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	q := r.URL.Query()
	if diff := q.Get("difficulty"); diff != "" {
		switch diff {
		case "moyen":
			currentGame = newGame(6, 9, "moyen")
		case "difficile":
			currentGame = newGame(7, 8, "difficile")
		default:
			currentGame = newGame(6, 7, "facile")
		}
	} else if q.Get("lignes") != "" && q.Get("colonnes") != "" {
		var l, c int
		_, err1 := fmt.Sscanf(q.Get("lignes"), "%d", &l)
		_, err2 := fmt.Sscanf(q.Get("colonnes"), "%d", &c)
		if err1 == nil && err2 == nil && l > 0 && c > 0 {
			currentGame = newGame(l, c, "custom")
		} else {
			if currentGame != nil {
				lignes := len(currentGame.Cases)
				colonnes := len(currentGame.Cases[0])
				difficulty := currentGame.Difficulty
				currentGame = newGame(lignes, colonnes, difficulty)
			} else {
				currentGame = newGame(6, 7, "facile")
			}
		}
	} else {
		if currentGame != nil {
			lignes := len(currentGame.Cases)
			colonnes := len(currentGame.Cases[0])
			difficulty := currentGame.Difficulty
			currentGame = newGame(lignes, colonnes, difficulty)
		} else {
			currentGame = newGame(6, 7, "facile")
		}
	}

	json.NewEncoder(w).Encode(currentGame)
}

func main() {
	// HTML Routes
	// the root (/) serves as the homepage; keep the path explicit for compatibility
	http.HandleFunc("/", homePage)
	http.HandleFunc("/power4_accueil.html", homePage)
	http.HandleFunc("/power4_jeu_facile", EasyPage)
	http.HandleFunc("/power4_jeu_moyen", MediumPage)
	http.HandleFunc("/power4_jeu_difficile", HardPage)

	// API roads
	http.HandleFunc("/power4_jeu", getGame)
	http.HandleFunc("/placer-pion", PlacePawn)
	http.HandleFunc("/reset", reset)

	// Static files (serve from the page_web folder).
	http.Handle("/style.css", http.FileServer(http.Dir("./page_web")))
	http.Handle("/script.js", http.FileServer(http.Dir("./page_web")))
	// Images and other static resources.
	http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("./page_web/images"))))

	// Allows to replace the port via the environment variable PORT (useful for hosting or avoiding conflicts).
	port := os.Getenv("PORT")
	if port == "" {
		port = "5500"
	}

	fmt.Printf("Serveur démarré sur http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
