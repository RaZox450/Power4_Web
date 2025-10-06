package main

import (
	"net/http"
	"fmt"
)

func main(){
	fmt.Println("oui oui")
	if err := http.ListenAndServe(":5500", nil); err !=nil {
		fmt.Println("non non")
	}
}

