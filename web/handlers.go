package main

import (
	"encoding/json"
	"net/http"
)

var currentGame *Game

type MoveRequest struct {
	Direction string `json:"direction"`
}

type GameResponse struct {
	Board    [4][4]int `json:"board"`
	Score    int       `json:"score"`
	GameOver bool      `json:"gameOver"`
	Won      bool      `json:"won"`
}

func handleNewGame(w http.ResponseWriter, r *http.Request) {
	currentGame = NewGame()
	sendGameResponse(w, currentGame)
}

func handleMove(w http.ResponseWriter, r *http.Request) {
	if currentGame == nil {
		currentGame = NewGame()
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var moveReq MoveRequest
	if err := json.NewDecoder(r.Body).Decode(&moveReq); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var dir Direction
	switch moveReq.Direction {
	case "up":
		dir = Up
	case "down":
		dir = Down
	case "left":
		dir = Left
	case "right":
		dir = Right
	default:
		http.Error(w, "Invalid direction", http.StatusBadRequest)
		return
	}

	currentGame.Move(dir)
	sendGameResponse(w, currentGame)
}

func handleGetState(w http.ResponseWriter, r *http.Request) {
	if currentGame == nil {
		currentGame = NewGame()
	}
	sendGameResponse(w, currentGame)
}

func sendGameResponse(w http.ResponseWriter, g *Game) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(GameResponse{
		Board:    g.Board,
		Score:    g.Score,
		GameOver: g.GameOver,
		Won:      g.Won,
	})
}
