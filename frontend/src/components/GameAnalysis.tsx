import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './GameAnalysis.css';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { MoveAnalysis, GameAnalysisResult } from '../utils/analysisTypes';

export const GameAnalysis: React.FC = () => {
  const { t } = useTranslation();
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<any>(null);
  const [moves, setMoves] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<GameAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [currentPosition, setCurrentPosition] = useState('');
  const [currentMove, setCurrentMove] = useState('');
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [boardPosition, setBoardPosition] = useState('');
  const [highlightSquares, setHighlightSquares] = useState<{[key: string]: any}>({});
  const [arrows, setArrows] = useState<Array<[string, string, string]>>([]);
  const [analysisBoardWidth, setAnalysisBoardWidth] = useState(800);
  const [loadingBoardWidth, setLoadingBoardWidth] = useState(400);

  const getStartFen = () => game?.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Load game and its moves
  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;
      try {
        setLoading(true);
        const gameData = await apiService.getGame(gameId);
        const movesData = await apiService.getGameMoves(gameId);
        // Enrich game data with player names
        const enrichedGame = {
          ...gameData,
          whitePlayerName: gameData.whiteUsername,
          blackPlayerName: gameData.blackUsername,
        };
        setGame(enrichedGame);
        setMoves(movesData);
      } catch (err) {
        setError(t('analysisLoadError'));
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, [gameId]);

  useEffect(() => {
    const updateBoardWidths = () => {
      if (typeof window === 'undefined') return;
      const isMobile = window.innerWidth <= 768;
      // For mobile, use almost full width; for desktop, cap at 650px
      const maxBoardWidth = isMobile 
        ? window.innerWidth  // полная ширина
        : Math.min(650, Math.max(280, window.innerWidth - 40));
      const maxLoadingWidth = isMobile
        ? window.innerWidth / 2
        : Math.min(325, Math.max(140, (window.innerWidth - 40) / 2));
      setAnalysisBoardWidth(maxBoardWidth);
      setLoadingBoardWidth(maxLoadingWidth);
    };

    updateBoardWidths();
    window.addEventListener('resize', updateBoardWidths);
    return () => window.removeEventListener('resize', updateBoardWidths);
  }, []);

  // Scroll selected move into view within moves table
  useEffect(() => {
    if (selectedMoveIndex !== null) {
      const selectedRow = document.querySelector('.table-row.selected') as HTMLElement;
      const movesTable = document.querySelector('.moves-table') as HTMLElement;
      if (selectedRow && movesTable) {
        const tableHeader = movesTable.querySelector('.table-header') as HTMLElement;
        const headerHeight = tableHeader ? tableHeader.offsetHeight : 0;
        
        // Position selected row at the top, accounting for header height
        const scrollPosition = selectedRow.offsetTop - headerHeight;
        movesTable.scrollTop = scrollPosition;
      }
    }
  }, [selectedMoveIndex]);

  // Analyze game using backend Stockfish
  const startAnalysis = async () => {
    if (!game || moves.length === 0) {
      setError(t('analysisInsufficientData'));
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setError('');

    try {
      // Extract moves in SAN format
      const sanMoves = moves.map((m: any) => m.san || m.move || '');
      
      // Setup chess instance for visualizing progress
      const chess = new Chess();
      if (game?.startFen) {
        chess.load(game.startFen);
      }
      setCurrentPosition(chess.fen());
      
      // Simulate progress with move-by-move visualization
      let moveIndex = 0;
      const progressInterval = setInterval(() => {
        if (moveIndex < sanMoves.length) {
          try {
            chess.move(sanMoves[moveIndex]);
            setCurrentPosition(chess.fen());
            const moveNum = Math.floor(moveIndex / 2) + 1;
            const color = moveIndex % 2 === 0 ? '.' : '...';
            setCurrentMove(`${moveNum}${color} ${sanMoves[moveIndex]}`);
            moveIndex++;
            setProgress(Math.floor((moveIndex / sanMoves.length) * 95));
          } catch (e) {
            console.error('Invalid move during visualization:', sanMoves[moveIndex]);
            moveIndex++;
          }
        }
      }, 300); // Update every 300ms for smooth visualization

      // Call backend API for analysis
      const response = await apiService.analyzeGame(
        gameId!,
        sanMoves,
        game.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        20 // depth
      );

      clearInterval(progressInterval);
      setProgress(100);

      // Transform backend response to frontend format
      const analysisResults: MoveAnalysis[] = response.moves.map((m: any) => ({
        moveNumber: m.moveNumber,
        isWhiteMove: m.whiteMove,
        move: m.move,
        evaluation: m.evaluation,
        bestMove: m.bestMove,
        isMistake: m.mistake,
        isInaccuracy: m.inaccuracy,
        isBlunder: m.blunder,
      }));

      setAnalysis({
        gameId: gameId!,
        totalMoves: response.totalMoves,
        whiteAccuracy: response.whiteAccuracy,
        blackAccuracy: response.blackAccuracy,
        whiteMistakes: response.whiteMistakes,
        blackMistakes: response.blackMistakes,
        whiteBlunders: response.whiteBlunders,
        blackBlunders: response.blackBlunders,
        moves: analysisResults,
        analysisProgress: 100,
      });
      
      // Set initial board to starting position
      const initialChess = new Chess();
      if (game?.startFen) {
        initialChess.load(game.startFen);
      }
      setBoardPosition(initialChess.fen());
    } catch (err) {
      setError(`${t('analysisErrorPrefix')}${err instanceof Error ? err.message : t('analysisUnknownError')}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle clicking on a move in the analysis table
  const handleMoveClick = (moveIndex: number) => {
    if (!analysis) return;
    
    setSelectedMoveIndex(moveIndex);
    
    // Replay game up to this move
    const chess = new Chess();
    if (game?.startFen) {
      chess.load(game.startFen);
    }
    const sanMoves = moves.map((m: any) => m.san || m.move || '');
    
    for (let i = 0; i <= moveIndex; i++) {
      try {
        const moveResult = chess.move(sanMoves[i]);
        
        // On the selected move, highlight squares
        if (i === moveIndex && moveResult) {
          const highlights: {[key: string]: any} = {};
          const nextArrows: Array<[string, string, string]> = [];

          // Highlight the move that was made (yellow: from light, to dark)
          highlights[moveResult.from] = {
            background: 'rgba(255, 220, 50, 0.5)'
          };
          highlights[moveResult.to] = {
            background: 'rgba(255, 200, 0, 0.75)'
          };

          // Show best move as arrow if different
          const bestMove = analysis.moves[moveIndex]?.bestMove;
          if (bestMove && bestMove.length >= 4) {
            const bestFrom = bestMove.substring(0, 2);
            const bestTo = bestMove.substring(2, 4);

            if (bestFrom !== moveResult.from || bestTo !== moveResult.to) {
              nextArrows.push([bestFrom, bestTo, 'rgba(96, 165, 250, 0.9)']);
            }
          }

          setHighlightSquares(highlights);
          setArrows(nextArrows);
        }
      } catch (e) {
        console.error('Error replaying move:', sanMoves[i]);
      }
    }
    
    setBoardPosition(chess.fen());
  };

  const goToStart = () => {
    const startChess = new Chess();
    if (game?.startFen) {
      startChess.load(game.startFen);
    }
    setSelectedMoveIndex(null);
    setHighlightSquares({});
    setArrows([]);
    setBoardPosition(startChess.fen());
  };

  const goToPrev = () => {
    if (!analysis) return;
    if (selectedMoveIndex === null) return;
    const nextIndex = selectedMoveIndex - 1;
    if (nextIndex < 0) {
      goToStart();
      return;
    }
    handleMoveClick(nextIndex);
  };

  const goToNext = () => {
    if (!analysis) return;
    const nextIndex = selectedMoveIndex === null ? 0 : selectedMoveIndex + 1;
    if (nextIndex >= analysis.moves.length) return;
    handleMoveClick(nextIndex);
  };

  const goToLatest = () => {
    if (!analysis) return;
    handleMoveClick(analysis.moves.length - 1);
  };


  if (loading) {
    return <div className="game-analysis-container">{t('analysisLoadingGame')}</div>;
  }

  if (!game) {
    return <div className="game-analysis-container error">{t('analysisGameNotFound')}</div>;
  }

  return (
    <div className="game-analysis-container">
      {error && <div className="error-message">{error}</div>}

      {!analysis ? (
        <div className="analysis-start">
          {!analyzing ? (
            <>
              <p>{t('analysisStartDescription')}</p>
              <button 
                onClick={startAnalysis} 
                disabled={analyzing}
                className="analyze-btn"
              >
                {t('analysisStartButton')}
              </button>
            </>
          ) : (
            <div className="analysis-in-progress">
              <h3>{t('analysisInProgress')}</h3>
              <div className="analysis-progress-info">
                <div className="current-move">{currentMove}</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">{progress}% {t('analysisProgressDone')}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="analysis-results">
          {/* Interactive Board */}
          <div className="analysis-board-section">
            <div className="analysis-result-board chess-board-wrapper">
              <Chessboard
                position={boardPosition}
                arePiecesDraggable={false}
                boardWidth={analysisBoardWidth}
                customDarkSquareStyle={{ backgroundColor: '#739552' }}
                customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
                customSquareStyles={highlightSquares}
                customArrows={arrows}
              />
            </div>
            <div className="analysis-board-controls">
              <button
                className="analysis-nav-btn"
                onClick={goToStart}
                disabled={!analysis || analysis.moves.length === 0 || selectedMoveIndex === null}
                title={t('toStart')}
              >
                ⏮
              </button>
              <button
                className="analysis-nav-btn"
                onClick={goToPrev}
                disabled={!analysis || analysis.moves.length === 0 || selectedMoveIndex === null}
                title={t('previous')}
              >
                ◀
              </button>
              <button
                className="analysis-nav-btn"
                onClick={goToNext}
                disabled={!analysis || analysis.moves.length === 0 || (selectedMoveIndex !== null && selectedMoveIndex >= analysis.moves.length - 1)}
                title={t('next')}
              >
                ▶
              </button>
              <button
                className="analysis-nav-btn"
                onClick={goToLatest}
                disabled={!analysis || analysis.moves.length === 0 || (selectedMoveIndex !== null && selectedMoveIndex >= analysis.moves.length - 1)}
                title={t('toLatest')}
              >
                ⏭
              </button>
            </div>
          </div>

          {/* Moves Table */}
          <div className="moves-analysis">
            <h3>{t('analysisMovesTitle')}</h3>
            <div className="moves-table">
              <div className="table-header">
                <div className="col-move">{t('analysisMoveCol')}</div>
                <div className="col-eval">{t('analysisEvalCol')}</div>
                <div className="col-type">{t('analysisTypeCol')}</div>
                <div className="col-best">{t('analysisBestCol')}</div>
              </div>
              {analysis.moves.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`table-row ${m.isBlunder ? 'blunder' : m.isMistake ? 'mistake' : ''} ${selectedMoveIndex === idx ? 'selected' : ''}`}
                  onClick={() => handleMoveClick(idx)}
                >
                  <div className="col-move">{m.moveNumber}{m.isWhiteMove ? '.' : '...'} {m.move}</div>
                  <div className="col-eval">{(m.evaluation / 100).toFixed(1)}</div>
                  <div className="col-type">
                    {m.isBlunder ? '💣' : m.isMistake ? '❌' : '✓'}
                  </div>
                  <div className="col-best">{m.bestMove || '-'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy Summary */}
          <div className="accuracy-summary">
            <h3>{t('analysisTitle')} - Аккуратность</h3>
            <div className="accuracy-cards">
              <div className="accuracy-card">
                <div className="accuracy-player-header">
                  <span>♔</span>
                  <span>White</span>
                </div>
                <div className="accuracy-player-name">{game.whitePlayerName || game.whitePlayerId}</div>
                <div className="accuracy-percent">{Math.round(analysis.whiteAccuracy)}%</div>
                <div className="accuracy-details">
                  <span>❌ {analysis.whiteMistakes}</span>
                  <span>💣 {analysis.whiteBlunders}</span>
                </div>
              </div>

              <div className="accuracy-card">
                <div className="accuracy-player-header">
                  <span>♚</span>
                  <span>Black</span>
                </div>
                <div className="accuracy-player-name">{game.blackPlayerName || game.blackPlayerId}</div>
                <div className="accuracy-percent">{Math.round(analysis.blackAccuracy)}%</div>
                <div className="accuracy-details">
                  <span>❌ {analysis.blackMistakes}</span>
                  <span>💣 {analysis.blackBlunders}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
