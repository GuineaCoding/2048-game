package game

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

	// Check if board changed
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

		// First pass: merge tiles
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
	// Check for win
	for i := 0; i < 4; i++ {
		for j := 0; j < 4; j++ {
			if g.Board[i][j] == 2048 {
				g.Won = true
				return
			}
		}
	}

	// Check for game over (no empty cells and no possible moves)
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
	// Check horizontal moves
	for i := 0; i < 4; i++ {
		for j := 0; j < 3; j++ {
			if g.Board[i][j] == g.Board[i][j+1] {
				return true
			}
		}
	}

	// Check vertical moves
	for j := 0; j < 4; j++ {
		for i := 0; i < 3; i++ {
			if g.Board[i][j] == g.Board[i+1][j] {
				return true
			}
		}
	}

	return false
}
