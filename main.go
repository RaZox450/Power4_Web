package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
)

// Structure pour la grille de jeu
type Grille struct {
	Cases        [6][7]int
	JoueurActuel int
	Pseudo1      string
	Pseudo2      string
}

var grille Grille

// Afficher page d'accueil
func home(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	tmpl := template.Must(template.ParseFiles("page_web/power4_accueil.html"))
	if r.Method != http.MethodPost {
		tmpl.Execute(w, nil)
		return
	}

	r.ParseForm()
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
	if r.URL.Path != "/power4_jeu" {
		http.NotFound(w, r)
		return
	}

	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(grille)
		return
	}

	tmpl := template.Must(template.ParseFiles("page_web/power4_jeu.html"))
	err := tmpl.Execute(w, grille)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
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
	grille.Cases[ligne][colonne] = grille.JoueurActuel

	// Changer de joueur
	if grille.JoueurActuel == 1 {
		grille.JoueurActuel = 2
	} else {
		grille.JoueurActuel = 1
	}

	// Renvoyer la grille mise à jour
	json.NewEncoder(w).Encode(grille)
}

// création du serveur
func main() {
	// Serveur de fichiers statiques
	fs := http.FileServer(http.Dir("page_web"))
	http.Handle("/page_web/", http.StripPrefix("/page_web/", fs))

	// Routes
	http.HandleFunc("/", home)
	http.HandleFunc("/power4_jeu", game)
	http.HandleFunc("/placer-pion", placerPion)

	// Initialisation de la grille
	grille = Grille{
		Cases:        [6][7]int{},
		JoueurActuel: 1,
	}

	fmt.Println("Serveur démarré sur http://localhost:5500")
	err := http.ListenAndServe(":5500", nil)
	if err != nil {
		fmt.Printf("Erreur serveur: %v\n", err)
	}
}
