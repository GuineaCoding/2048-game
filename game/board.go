package game

import (
	"math/rand"
	"time"
)

// Initialize new game
func NewGame() *Game {
	game := &Game{}
	game.initializeBoard()
	return game
}

func (g *Game) initializeBoard() {
	// Start with empty board
	g.Board = [4][4]int{}
	g.Score = 0
	g.GameOver = false
	g.Won = false

	// Add two initial tiles
	g.addRandomTile()
	g.addRandomTile()
}

func (g *Game) addRandomTile() {
	// Find all empty cells
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

	// Pick random empty cell
	rand.Seed(time.Now().UnixNano())
	cell := emptyCells[rand.Intn(len(emptyCells))]

	// 90% chance for 2, 10% chance for 4
	value := 2
	if rand.Float64() < 0.1 {
		value = 4
	}

	g.Board[cell[0]][cell[1]] = value
}
