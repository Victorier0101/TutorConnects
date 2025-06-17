import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  SportsEsports as GameIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type Player = 1 | 2;
type Cell = Player | null;
type Board = Cell[][];

interface GameStats {
  playerWins: number;
  aiWins: number;
  draws: number;
}

const ROWS = 6;
const COLS = 7;
const CONNECT = 4;

const Connect4 = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [isGameActive, setIsGameActive] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winningCells, setWinningCells] = useState<Array<[number, number]>>([]);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({
    playerWins: 0,
    aiWins: 0,
    draws: 0,
  });
  const [dropAnimation, setDropAnimation] = useState<{col: number, row: number} | null>(null);

  // Check for winner
  const checkWinner = useCallback((board: Board): { winner: Player | null, cells: Array<[number, number]> } => {
    // Check horizontal
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= COLS - CONNECT; col++) {
        const player = board[row][col];
        if (player && 
            Array.from({length: CONNECT}, (_, i) => board[row][col + i]).every(cell => cell === player)) {
          return {
            winner: player,
            cells: Array.from({length: CONNECT}, (_, i) => [row, col + i] as [number, number])
          };
        }
      }
    }

    // Check vertical
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      for (let col = 0; col < COLS; col++) {
        const player = board[row][col];
        if (player && 
            Array.from({length: CONNECT}, (_, i) => board[row + i][col]).every(cell => cell === player)) {
          return {
            winner: player,
            cells: Array.from({length: CONNECT}, (_, i) => [row + i, col] as [number, number])
          };
        }
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      for (let col = 0; col <= COLS - CONNECT; col++) {
        const player = board[row][col];
        if (player && 
            Array.from({length: CONNECT}, (_, i) => board[row + i][col + i]).every(cell => cell === player)) {
          return {
            winner: player,
            cells: Array.from({length: CONNECT}, (_, i) => [row + i, col + i] as [number, number])
          };
        }
      }
    }

    // Check diagonal (top-right to bottom-left)
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      for (let col = CONNECT - 1; col < COLS; col++) {
        const player = board[row][col];
        if (player && 
            Array.from({length: CONNECT}, (_, i) => board[row + i][col - i]).every(cell => cell === player)) {
          return {
            winner: player,
            cells: Array.from({length: CONNECT}, (_, i) => [row + i, col - i] as [number, number])
          };
        }
      }
    }

    return { winner: null, cells: [] };
  }, []);

  // Check if board is full
  const isBoardFull = useCallback((board: Board): boolean => {
    return board[0].every(cell => cell !== null);
  }, []);

  // Get available moves
  const getAvailableMoves = useCallback((board: Board): number[] => {
    return Array.from({length: COLS}, (_, col) => col)
      .filter(col => board[0][col] === null);
  }, []);

  // Make move
  const makeMove = useCallback((board: Board, col: number, player: Player): Board | null => {
    if (board[0][col] !== null) return null;

    const newBoard = board.map(row => [...row]);
    for (let row = ROWS - 1; row >= 0; row--) {
      if (newBoard[row][col] === null) {
        newBoard[row][col] = player;
        setDropAnimation({ col, row });
        setTimeout(() => setDropAnimation(null), 500);
        return newBoard;
      }
    }
    return null;
  }, []);

  // Minimax AI algorithm with alpha-beta pruning
  const minimax = useCallback((
    board: Board, 
    depth: number, 
    isMaximizing: boolean, 
    alpha: number = -Infinity, 
    beta: number = Infinity
  ): number => {
    const { winner } = checkWinner(board);
    
    if (winner === 2) return 1000 - depth; // AI wins
    if (winner === 1) return -1000 + depth; // Player wins
    if (isBoardFull(board) || depth === 0) return evaluatePosition(board); // Draw or depth limit

    const availableMoves = getAvailableMoves(board);
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of availableMoves) {
        const newBoard = makeMove(board, col, 2);
        if (newBoard) {
          const eval_score = minimax(newBoard, depth - 1, false, alpha, beta);
          maxEval = Math.max(maxEval, eval_score);
          alpha = Math.max(alpha, eval_score);
          if (beta <= alpha) break; // Beta cutoff
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of availableMoves) {
        const newBoard = makeMove(board, col, 1);
        if (newBoard) {
          const eval_score = minimax(newBoard, depth - 1, true, alpha, beta);
          minEval = Math.min(minEval, eval_score);
          beta = Math.min(beta, eval_score);
          if (beta <= alpha) break; // Alpha cutoff
        }
      }
      return minEval;
    }
  }, [checkWinner, isBoardFull, getAvailableMoves, makeMove]);

  // Simple position evaluation function
  const evaluatePosition = useCallback((board: Board): number => {
    let score = 0;
    
    // Center column preference
    const centerCol = Math.floor(COLS / 2);
    for (let row = 0; row < ROWS; row++) {
      if (board[row][centerCol] === 2) score += 3;
      else if (board[row][centerCol] === 1) score -= 3;
    }
    
    // Evaluate horizontal windows
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= COLS - CONNECT; col++) {
        const window = Array.from({length: CONNECT}, (_, i) => board[row][col + i]);
        score += evaluateWindow(window);
      }
    }
    
    // Evaluate vertical windows
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      for (let col = 0; col < COLS; col++) {
        const window = Array.from({length: CONNECT}, (_, i) => board[row + i][col]);
        score += evaluateWindow(window);
      }
    }
    
    // Evaluate diagonal windows
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      for (let col = 0; col <= COLS - CONNECT; col++) {
        const window = Array.from({length: CONNECT}, (_, i) => board[row + i][col + i]);
        score += evaluateWindow(window);
      }
    }
    
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      for (let col = CONNECT - 1; col < COLS; col++) {
        const window = Array.from({length: CONNECT}, (_, i) => board[row + i][col - i]);
        score += evaluateWindow(window);
      }
    }
    
    return score;
  }, []);

  // Simple window evaluation
  const evaluateWindow = useCallback((window: Cell[]): number => {
    let score = 0;
    const aiCount = window.filter(cell => cell === 2).length;
    const playerCount = window.filter(cell => cell === 1).length;
    const emptyCount = window.filter(cell => cell === null).length;
    
    if (aiCount === 4) score += 100;
    else if (aiCount === 3 && emptyCount === 1) score += 10;
    else if (aiCount === 2 && emptyCount === 2) score += 2;
    
    if (playerCount === 4) score -= 100;
    else if (playerCount === 3 && emptyCount === 1) score -= 80; // Block threats
    else if (playerCount === 2 && emptyCount === 2) score -= 5;
    
    return score;
  }, []);

  // Get best move for AI
  const getBestMove = useCallback((board: Board): number => {
    const availableMoves = getAvailableMoves(board);
    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    // Check for immediate wins first
    for (const col of availableMoves) {
      const newBoard = makeMove(board, col, 2);
      if (newBoard) {
        const { winner } = checkWinner(newBoard);
        if (winner === 2) return col;
      }
    }
    
    // Check for blocking immediate player wins
    for (const col of availableMoves) {
      const newBoard = makeMove(board, col, 1);
      if (newBoard) {
        const { winner } = checkWinner(newBoard);
        if (winner === 1) {
          bestMove = col; // Must block
        }
      }
    }

    // Minimax search with reasonable depth
    for (const col of availableMoves) {
      const newBoard = makeMove(board, col, 2);
      if (newBoard) {
        const score = minimax(newBoard, 5, false); // Back to depth 5
        if (score > bestScore) {
          bestScore = score;
          bestMove = col;
        }
      }
    }

    return bestMove;
  }, [getAvailableMoves, makeMove, checkWinner, minimax]);

  // Handle player move
  const handleColumnClick = useCallback((col: number) => {
    if (!isGameActive || currentPlayer !== 1 || isAiThinking) return;

    const newBoard = makeMove(board, col, 1);
    if (!newBoard) return;

    setBoard(newBoard);
    
    const { winner: gameWinner, cells } = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      setWinningCells(cells);
      setIsGameActive(false);
      setShowWinDialog(true);
      setGameStats(prev => ({ ...prev, playerWins: prev.playerWins + 1 }));
      return;
    }

    if (isBoardFull(newBoard)) {
      setWinner('draw');
      setIsGameActive(false);
      setShowWinDialog(true);
      setGameStats(prev => ({ ...prev, draws: prev.draws + 1 }));
      return;
    }

    setCurrentPlayer(2);
  }, [board, currentPlayer, isGameActive, isAiThinking, makeMove, checkWinner, isBoardFull]);

  // AI move effect
  useEffect(() => {
    if (currentPlayer === 2 && isGameActive) {
      setIsAiThinking(true);
      
      const aiMoveTimer = setTimeout(() => {
        const aiMove = getBestMove(board);
        const newBoard = makeMove(board, aiMove, 2);
        
        if (newBoard) {
          setBoard(newBoard);
          
          const { winner: gameWinner, cells } = checkWinner(newBoard);
          if (gameWinner) {
            setWinner(gameWinner);
            setWinningCells(cells);
            setIsGameActive(false);
            setShowWinDialog(true);
            setGameStats(prev => ({ ...prev, aiWins: prev.aiWins + 1 }));
          } else if (isBoardFull(newBoard)) {
            setWinner('draw');
            setIsGameActive(false);
            setShowWinDialog(true);
            setGameStats(prev => ({ ...prev, draws: prev.draws + 1 }));
          } else {
            setCurrentPlayer(1);
          }
        }
        
        setIsAiThinking(false);
      }, 1000 + Math.random() * 1000); // Random delay for more natural feel

      return () => clearTimeout(aiMoveTimer);
    }
  }, [currentPlayer, isGameActive, board, getBestMove, makeMove, checkWinner, isBoardFull]);

  // Reset game
  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer(1);
    setWinner(null);
    setIsGameActive(true);
    setIsAiThinking(false);
    setWinningCells([]);
    setShowWinDialog(false);
    setDropAnimation(null);
  };

  // Get cell color
  const getCellColor = (row: number, col: number) => {
    const cell = board[row][col];
    const isWinning = winningCells.some(([r, c]) => r === row && c === col);
    
    if (!cell) return 'rgba(255, 255, 255, 0.9)';
    
    if (cell === 1) {
      return isWinning 
        ? 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    } else {
      return isWinning
        ? 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)'
        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
                width: 60,
                height: 60,
              }}
            >
              <GameIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Connect 4
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Challenge the AI and connect four in a row!
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ borderRadius: '12px' }}
            >
              Back to Home
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={resetGame}
              sx={{
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
              }}
            >
              New Game
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Game Board */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {/* Game Status */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                {isAiThinking ? (
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                      AI is thinking...
                    </Typography>
                    <LinearProgress 
                      sx={{ 
                        borderRadius: '8px',
                        height: 8,
                        background: 'rgba(16, 185, 129, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        }
                      }} 
                    />
                  </Box>
                ) : winner ? (
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {winner === 'draw' ? "It's a Draw!" : 
                     winner === 1 ? "You Win! 🎉" : "AI Wins! 🤖"}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        background: currentPlayer === 1 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {currentPlayer === 1 ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {currentPlayer === 1 ? "Your Turn" : "AI's Turn"}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Connect 4 Board */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                  gap: 1,
                  p: 3,
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(30, 58, 138, 0.3)',
                }}
              >
                {/* Column hover indicators */}
                {Array.from({length: COLS}, (_, col) => (
                  <Box
                    key={`hover-${col}`}
                    sx={{
                      gridColumn: col + 1,
                      gridRow: 1,
                      height: '60px',
                      borderRadius: '50%',
                      background: hoverColumn === col && currentPlayer === 1 && isGameActive && !isAiThinking
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'transparent',
                      opacity: 0.7,
                      cursor: currentPlayer === 1 && isGameActive && !isAiThinking ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      zIndex: 1,
                    }}
                    onMouseEnter={() => setHoverColumn(col)}
                    onMouseLeave={() => setHoverColumn(null)}
                    onClick={() => handleColumnClick(col)}
                  />
                ))}

                {/* Game cells */}
                {board.map((row, rowIndex) => 
                  row.map((cell, colIndex) => (
                    <motion.div
                      key={`${rowIndex}-${colIndex}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (rowIndex + colIndex) * 0.05 }}
                      style={{
                        gridColumn: colIndex + 1,
                        gridRow: rowIndex + 2, // +2 to account for hover row
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: getCellColor(rowIndex, colIndex),
                          border: '3px solid rgba(255, 255, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: currentPlayer === 1 && isGameActive && !isAiThinking ? 'pointer' : 'default',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          boxShadow: cell ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'inset 0 2px 8px rgba(0, 0, 0, 0.2)',
                          transform: dropAnimation?.col === colIndex && dropAnimation?.row === rowIndex ? 'scale(1.1)' : 'scale(1)',
                          ...(winningCells.some(([r, c]) => r === rowIndex && c === colIndex) && {
                            animation: 'pulse 1s infinite',
                            '@keyframes pulse': {
                              '0%': { transform: 'scale(1)' },
                              '50%': { transform: 'scale(1.05)' },
                              '100%': { transform: 'scale(1)' },
                            }
                          })
                        }}
                        onClick={() => handleColumnClick(colIndex)}
                      />
                    </motion.div>
                  ))
                )}
              </Box>
            </Paper>
          </Box>

          {/* Sidebar */}
          <Box sx={{ width: { xs: '100%', lg: '300px' } }}>
            {/* Player Info */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Players
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Card sx={{ 
                  background: currentPlayer === 1 && isGameActive 
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                    : 'transparent',
                  border: currentPlayer === 1 && isGameActive ? '2px solid #667eea' : '1px solid rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          width: 32,
                          height: 32,
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          You
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Blue pieces
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ 
                  background: currentPlayer === 2 && isGameActive 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                    : 'transparent',
                  border: currentPlayer === 2 && isGameActive ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          width: 32,
                          height: 32,
                        }}
                      >
                        <BotIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          AI Bot
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Green pieces
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Paper>

            {/* Game Stats */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrophyIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Game Stats
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Your Wins:</Typography>
                  <Chip 
                    label={gameStats.playerWins} 
                    size="small" 
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">AI Wins:</Typography>
                  <Chip 
                    label={gameStats.aiWins} 
                    size="small" 
                    color="success"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Draws:</Typography>
                  <Chip 
                    label={gameStats.draws} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </motion.div>

      {/* Win Dialog */}
      <Dialog 
        open={showWinDialog} 
        onClose={() => setShowWinDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <TrophyIcon 
                sx={{ 
                  fontSize: 60,
                  color: winner === 1 ? '#667eea' : winner === 2 ? '#10b981' : '#f59e0b'
                }} 
              />
            </motion.div>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {winner === 'draw' ? "It's a Draw!" : 
               winner === 1 ? "You Win! ��" : "AI Wins! 🤖"}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {winner === 'draw' ? "Nobody wins this time. Try again!" :
             winner === 1 ? "You defeated the AI! Well played!" : 
             "The AI won this round. Challenge it again!"}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={resetGame}
            sx={{
              px: 4,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
            }}
          >
            Play Again
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowWinDialog(false)}
            sx={{ px: 4, borderRadius: '12px' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Connect4; 