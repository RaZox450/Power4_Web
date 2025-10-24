package main

import (
	"encoding/json"
	"html/template"
	"net/http"
)

// Structure pour la grille de jeu
type Grille struct {
	Cases        [6][7]int
	JoueurActuel int
	Pseudo1      string
	Pseudo2      string
	Winner       int // 0 = pas de gagnant, 1 ou 2 pour le gagnant
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

	data := Joueur{
		Pseudo1: r.FormValue("player1"),
		Pseudo2: r.FormValue("player2"),
	}

	// Initialiser la grille pour une nouvelle partie
	grille = Grille{
		Cases:        [6][7]int{},
		JoueurActuel: 1,
		Pseudo1:      data.Pseudo1,
		Pseudo2:      data.Pseudo2,
	}

	tmpl.Execute(w, data)
}

func game(w http.ResponseWriter, r *http.Request) {
	// Réinitialiser complètement la grille pour une nouvelle partie
	grille = Grille{
		Cases:        [6][7]int{},
		JoueurActuel: 1,
		Winner:       0,
		Pseudo1:      grille.Pseudo1, // Garder les pseudos
		Pseudo2:      grille.Pseudo2,
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

	// Sinon on renvoie la page HTML
	tmpl := template.Must(template.ParseFiles("page_web/power4_jeu.html"))
	tmpl.Execute(w, grille)
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

	// Vérifier si la colonne est valide
	if colonne < 0 || colonne >= 7 {
		http.Error(w, "Colonne invalide", http.StatusBadRequest)
		return
	}

	// Trouver la première case vide dans la colonne
	ligne := -1
	for i := 5; i >= 0; i-- {
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

	for i := 0; i < 6; i++ {
		for j := 0; j < 7; j++ {
			if grille.Cases[i][j] != player {
				continue
			}
			// tester chaque direction
			for _, d := range directions {
				count := 1
				x := i + d[0]
				y := j + d[1]
				for count < 4 && x >= 0 && x < 6 && y >= 0 && y < 7 && grille.Cases[x][y] == player {
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
	grille = Grille{
		Cases:        [6][7]int{},
		JoueurActuel: 1,
		Winner:       0,
		Pseudo1:      grille.Pseudo1,
		Pseudo2:      grille.Pseudo2,
	}

	// Renvoyer la nouvelle grille en JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(grille)
}

func main() {
	fs := http.FileServer(http.Dir("page_web/"))
	http.Handle("/page_web/", http.StripPrefix("/page_web/", fs))
	http.HandleFunc("/", home)
	http.HandleFunc("/power4_jeu", game)
	http.HandleFunc("/placer-pion", placerPion)
	http.HandleFunc("/reinitialiser", reinitialiser)
	http.ListenAndServe(":5500", nil)
}
