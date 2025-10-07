package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"time"
)

// Game types and logic
type Direction int

const (
	Up Direction = iota
	Down
	Left
	Right
)

type Game struct {
	Board    [4][4]int
	Score    int
	GameOver bool
	Won      bool
}

type MoveRequest struct {
	Direction string `json:"direction"`
}

type GameResponse struct {
	Board    [4][4]int `json:"board"`
	Score    int       `json:"score"`
	GameOver bool      `json:"gameOver"`
	Won      bool      `json:"won"`
}

var currentGame *Game

// Game logic functions
func NewGame() *Game {
	game := &Game{}
	game.initializeBoard()
	return game
}

func (g *Game) initializeBoard() {
	g.Board = [4][4]int{}
	g.Score = 0
	g.GameOver = false
	g.Won = false
	g.addRandomTile()
	g.addRandomTile()
}

func (g *Game) addRandomTile() {
	var emptyCells [][2]int
	for i := 0; i < 4; i++ {
		for j := 0; j < 4; j++ {
			if g.Board[i][j] == 0 {
				emptyCells = append(emptyCells, [2]int{i, j})
			}
		}
	}

	if len(emptyCells) == 0 {
		return
	}

	rand.Seed(time.Now().UnixNano())
	cell := emptyCells[rand.Intn(len(emptyCells))]

	value := 2
	if rand.Float64() < 0.1 {
		value = 4
	}

	g.Board[cell[0]][cell[1]] = value
}

func (g *Game) Move(dir Direction) bool {
	boardBefore := g.Board

	switch dir {
	case Left:
		g.moveLeft()
	case Right:
		g.moveRight()
	case Up:
		g.moveUp()
	case Down:
		g.moveDown()
	}

	if g.Board == boardBefore {
		return false
	}

	g.addRandomTile()
	g.checkGameStatus()
	return true
}

func (g *Game) moveLeft() {
	for i := 0; i < 4; i++ {
		row := g.Board[i]
		merged := make([]bool, 4)

		for j := 1; j < 4; j++ {
			if row[j] == 0 {
				continue
			}

			k := j
			for k > 0 && row[k-1] == 0 {
				row[k-1], row[k] = row[k], row[k-1]
				k--
			}

			if k > 0 && row[k-1] == row[k] && !merged[k-1] {
				row[k-1] *= 2
				row[k] = 0
				g.Score += row[k-1]
				merged[k-1] = true
			}
		}
		g.Board[i] = row
	}
}

func (g *Game) moveRight() {
	for i := 0; i < 4; i++ {
		row := g.Board[i]
		merged := make([]bool, 4)

		for j := 2; j >= 0; j-- {
			if row[j] == 0 {
				continue
			}

			k := j
			for k < 3 && row[k+1] == 0 {
				row[k+1], row[k] = row[k], row[k+1]
				k++
			}

			if k < 3 && row[k+1] == row[k] && !merged[k+1] {
				row[k+1] *= 2
				row[k] = 0
				g.Score += row[k+1]
				merged[k+1] = true
			}
		}
		g.Board[i] = row
	}
}

func (g *Game) moveUp() {
	for j := 0; j < 4; j++ {
		merged := make([]bool, 4)

		for i := 1; i < 4; i++ {
			if g.Board[i][j] == 0 {
				continue
			}

			k := i
			for k > 0 && g.Board[k-1][j] == 0 {
				g.Board[k-1][j], g.Board[k][j] = g.Board[k][j], g.Board[k-1][j]
				k--
			}

			if k > 0 && g.Board[k-1][j] == g.Board[k][j] && !merged[k-1] {
				g.Board[k-1][j] *= 2
				g.Board[k][j] = 0
				g.Score += g.Board[k-1][j]
				merged[k-1] = true
			}
		}
	}
}

func (g *Game) moveDown() {
	for j := 0; j < 4; j++ {
		merged := make([]bool, 4)

		for i := 2; i >= 0; i-- {
			if g.Board[i][j] == 0 {
				continue
			}

			k := i
			for k < 3 && g.Board[k+1][j] == 0 {
				g.Board[k+1][j], g.Board[k][j] = g.Board[k][j], g.Board[k+1][j]
				k++
			}

			if k < 3 && g.Board[k+1][j] == g.Board[k][j] && !merged[k+1] {
				g.Board[k+1][j] *= 2
				g.Board[k][j] = 0
				g.Score += g.Board[k+1][j]
				merged[k+1] = true
			}
		}
	}
}

func (g *Game) checkGameStatus() {
	for i := 0; i < 4; i++ {
		for j := 0; j < 4; j++ {
			if g.Board[i][j] == 2048 {
				g.Won = true
				return
			}
		}
	}

	if !g.hasEmptyCells() && !g.hasPossibleMoves() {
		g.GameOver = true
	}
}

func (g *Game) hasEmptyCells() bool {
	for i := 0; i < 4; i++ {
		for j := 0; j < 4; j++ {
			if g.Board[i][j] == 0 {
				return true
			}
		}
	}
	return false
}

func (g *Game) hasPossibleMoves() bool {
	for i := 0; i < 4; i++ {
		for j := 0; j < 3; j++ {
			if g.Board[i][j] == g.Board[i][j+1] {
				return true
			}
		}
	}

	for j := 0; j < 4; j++ {
		for i := 0; i < 3; i++ {
			if g.Board[i][j] == g.Board[i+1][j] {
				return true
			}
		}
	}

	return false
}

// HTTP Handlers
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

// Main function
func main() {
	// Serve static files from the web/static directory
	fs := http.FileServer(http.Dir("./web/static"))
	http.Handle("/", fs)

	// Game API routes
	http.HandleFunc("/api/new-game", handleNewGame)
	http.HandleFunc("/api/move", handleMove)
	http.HandleFunc("/api/state", handleGetState)

	log.Println("🚀 2048 Web Server starting on http://localhost:8080")
	log.Println("📁 Open your browser and go to: http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
