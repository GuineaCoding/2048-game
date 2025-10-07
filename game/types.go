package game

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
