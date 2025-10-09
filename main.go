package main

import (
	"html/template"
	"net/http"
)

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
	tmpl.Execute(w, data)
}

func game(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("page_web/power4_jeu.html"))
	tmpl.Execute(w, nil)
}

// création du serveur
func main() {
	fs := http.FileServer(http.Dir("page_web/"))
	http.Handle("/page_web/", http.StripPrefix("/page_web/", fs))
	http.HandleFunc("/", home)
	http.HandleFunc("/power4_jeu", game)
	http.ListenAndServe(":5500", nil)
}
