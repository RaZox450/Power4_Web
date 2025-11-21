# Puissance 4 Web

C'est un jeu de Puissance 4 classique, jouable à deux joueurs dans un navigateur web sur le même ordinateur.

Il est construit avec un serveur en **Go** qui gère les règles, et une interface en **JavaScript** (HTML/CSS).

## Règles du jeu

* Le jeu se joue à deux joueurs.
* Chaque joueur joue à tour de rôle en cliquant sur une colonne pour y laisser tomber son pion.
* Le pion tombe jusqu'à la position libre la plus basse dans la colonne choisie (gravité).
* Le but est d'être le premier à aligner **4 pions** de sa couleur.
* L'alignement peut être horizontal, vertical ou diagonal.

## Comment lancer le jeu

Prérequis : Avoir **Go** installé sur votre machine.

1.  Ouvrez un terminal dans le dossier principal du projet (où se trouve le fichier `main.go`).
2.  Lancez le serveur avec la commande :
    ```
    go run main.go
    ```
3.  Une fois le serveur démarré, ouvrez votre navigateur web et allez à l'adresse :
    ```
    http://localhost:5500
    ```