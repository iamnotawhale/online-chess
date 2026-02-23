import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoardWrapper } from './common';
import './GameAnalysis.css';
import { apiService, User } from '../api';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMove, setCurrentMove] = useState('');
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [boardPosition, setBoardPosition] = useState('');
  const [chessInstance, setChessInstance] = useState<Chess | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<{[key: string]: any}>({});
  const [arrows, setArrows] = useState<any[]>([]);
  const [analysisBoardWidth, setAnalysisBoardWidth] = useState(800);
  const moveRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredMoveIndex, setHoveredMoveIndex] = useState<number | null>(null);

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
    const loadCurrentUser = async () => {
      try {
        const user = await apiService.getMe();
        setCurrentUser(user);
      } catch (err) {
        setCurrentUser(null);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    const updateBoardWidths = () => {
      if (typeof window === 'undefined') return;
      const isMobile = window.innerWidth <= 768;
      // For mobile, use almost full width; for desktop, cap at 800px
      const maxBoardWidth = isMobile 
        ? window.innerWidth  // full width
        : Math.min(800, Math.max(280, window.innerWidth - 40));
      setAnalysisBoardWidth(maxBoardWidth);
    };

    updateBoardWidths();
    window.addEventListener('resize', updateBoardWidths);
    return () => window.removeEventListener('resize', updateBoardWidths);
  }, []);

  // Scroll selected move into view within moves table
  useEffect(() => {
    const movesTable = document.querySelector('.moves-table') as HTMLElement;
    if (!movesTable) return;

    if (selectedMoveIndex === null) {
      // Scroll to top when at starting position
      movesTable.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else if (selectedMoveIndex !== null && moveRowRefs.current[selectedMoveIndex]) {
      const selectedRow = moveRowRefs.current[selectedMoveIndex];
      
      if (selectedRow) {
        // Use getBoundingClientRect for accurate positioning
        const rowRect = selectedRow.getBoundingClientRect();
        const tableRect = movesTable.getBoundingClientRect();
        const headerElement = movesTable.querySelector('.table-header') as HTMLElement;
        const headerHeight = headerElement?.offsetHeight || 0;
        
        // Calculate position of row within scrollable container
        // rowRect.top - tableRect.top gives position relative to table viewport
        // Add current scrollTop to get absolute position within container
        const elementTopRelativeToContainer = rowRect.top - tableRect.top + movesTable.scrollTop;
        
        // Set scroll position to show the element below the header
        const desiredScroll = Math.max(0, elementTopRelativeToContainer - headerHeight - 5);
        
        movesTable.scrollTo({
          top: desiredScroll,
          behavior: 'smooth'
        });
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
      
      // Simulate progress with move-by-move visualization
      let moveIndex = 0;
      const progressInterval = setInterval(() => {
        if (moveIndex < sanMoves.length) {
          try {
            chess.move(sanMoves[moveIndex]);
            // Update position visualization
            const moveNum = Math.floor(moveIndex / 2) + 1;
            const color = moveIndex % 2 === 0 ? '.' : '...';
            setCurrentMove(`${moveNum}${color} ${sanMoves[moveIndex]}`);
            moveIndex++;
            // Cap visualization at 90% - remaining 10% after API response
            setProgress(Math.min(90, Math.floor((moveIndex / sanMoves.length) * 90)));
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

      // Update to show actual last analyzed move
      if (analysisResults.length > 0) {
        const lastMove = analysisResults[analysisResults.length - 1];
        setCurrentMove(`${lastMove.moveNumber}${lastMove.isWhiteMove ? '.' : '...'} ${lastMove.move}`);
      }
      
      setProgress(100);

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
      setChessInstance(initialChess);
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

          // Highlight the move that was made (blue: from light, to dark)
          highlights[moveResult.from] = {
            background: 'rgba(52, 152, 219, 0.18)'
          };
          highlights[moveResult.to] = {
            background: 'rgba(52, 152, 219, 0.28)'
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
    
    setChessInstance(chess);
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
    setChessInstance(startChess);
    setBoardPosition(startChess.fen());
    
    // Scroll moves table to top
    const movesTable = document.querySelector('.moves-table') as HTMLElement;
    if (movesTable) {
      movesTable.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
  const getEvalDeltas = (analysisMoves: MoveAnalysis[]) => {
    if (analysisMoves.length === 0) return [];
    return analysisMoves.map((move, index) => {
      if (index === 0) {
        return move.evaluation;
      }
      return move.evaluation - analysisMoves[index - 1].evaluation;
    });
  };

  const getPhaseValue = (chess: Chess) => {
    const board = chess.board();
    let phase = 0;
    let queens = 0;

    for (const row of board) {
      for (const piece of row) {
        if (!piece) continue;
        switch (piece.type) {
          case 'n':
          case 'b':
            phase += 1;
            break;
          case 'r':
            phase += 2;
            break;
          case 'q':
            phase += 4;
            queens += 1;
            break;
          default:
            break;
        }
      }
    }

    return { phase, queens };
  };

  const getPhaseStage = (phase: number, queens: number, moveIndex: number) => {
    const maxPhase = 24;
    const phaseRatio = Math.max(0, Math.min(1, phase / maxPhase));

    if (queens === 0 || phaseRatio <= 0.25) {
      return 'endgame';
    }

    if (phaseRatio <= 0.6 || moveIndex >= 16) {
      return 'middlegame';
    }

    return 'opening';
  };

  const getPhaseBoundaries = (moveCount: number, evals: number[]) => {
    const stageByMove: Array<'opening' | 'middlegame' | 'endgame'> = [];
    const chess = new Chess();
    if (game?.startFen) {
      chess.load(game.startFen);
    }

    const sanMoves = moves.map((m: any) => m.san || m.move || '').slice(0, moveCount);

    for (const sanMove of sanMoves) {
      try {
        chess.move(sanMove);
      } catch (error) {
        // Keep the last known phase if move cannot be applied
      }
      const { phase, queens } = getPhaseValue(chess);
      const stage = getPhaseStage(phase, queens, stageByMove.length + 1);
      stageByMove.push(stage);
    }

    const midStartRaw = stageByMove.findIndex((stage) => stage === 'middlegame');
    const endStartRaw = stageByMove.findIndex((stage) => stage === 'endgame');

    const advantageThreshold = 500;
    const advantageWindow = 4;
    const advantageStartRaw = evals.findIndex((_, index) => {
      if (index + advantageWindow > evals.length) return false;
      for (let offset = 0; offset < advantageWindow; offset++) {
        if (Math.abs(evals[index + offset]) < advantageThreshold) {
          return false;
        }
      }
      return true;
    });
    const advantageEndStart = advantageStartRaw >= 0 ? advantageStartRaw : null;

    const fallbackMid = moveCount > 0 ? Math.min(moveCount - 1, 23) : null; // ~move 12
    const fallbackEnd = moveCount > 0 ? Math.min(moveCount - 1, 79) : null; // ~move 40

    const resolvedMid = midStartRaw >= 0 ? midStartRaw : fallbackMid;
    const resolvedEnd = endStartRaw >= 0 ? endStartRaw : (advantageEndStart ?? fallbackEnd);

    let normalizedMid = resolvedMid !== null && resolvedMid > 0 ? resolvedMid : null;
    let normalizedEnd = resolvedEnd !== null && resolvedEnd > 0 ? resolvedEnd : null;

    if (normalizedMid === null && moveCount > 1) {
      normalizedMid = Math.min(moveCount - 1, Math.floor(moveCount * 0.35));
    }
    if (normalizedEnd === null && moveCount > 1) {
      normalizedEnd = moveCount - 1;
    }
    if (normalizedMid !== null && normalizedEnd !== null) {
      const minGap = 6;
      if (normalizedEnd <= normalizedMid + minGap) {
        normalizedEnd = Math.min(moveCount - 1, normalizedMid + minGap);
      }
    }

    return {
      midStart: normalizedMid,
      endStart: normalizedEnd,
    };
  };

  const boardOrientation = currentUser && game
    ? (game.whitePlayerId === currentUser.id
        ? 'white'
        : game.blackPlayerId === currentUser.id
          ? 'black'
          : 'white')
    : 'white';

  const analysisEvalDeltas = analysis ? getEvalDeltas(analysis.moves) : [];

  const renderEvalChart = (extraClassName: string) => {
    if (!analysis || analysis.moves.length === 0) {
      return null;
    }

    const evalDeltas = getEvalDeltas(analysis.moves);
    const cumulativeValues = evalDeltas.reduce<number[]>((acc, value, index) => {
      const previous = index === 0 ? 0 : acc[index - 1];
      acc.push(previous + value);
      return acc;
    }, []);
    const chartValues = cumulativeValues;
    const width = 600;
    const height = 140;
    const padding = 12;
    const baseline = height / 2;
    const rawMaxAbs = Math.max(100, ...chartValues.map((value) => Math.abs(value)));
    const maxAbs = Math.min(1200, rawMaxAbs);
    const scale = (height / 2 - padding) / maxAbs;

    const points = chartValues.map((value, index) => {
      const x = analysis.moves.length === 1 ? width / 2 : (width * index) / (analysis.moves.length - 1);
      const y = baseline - value * scale;
      return { x, y, value };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const segments: Array<{ sign: 'pos' | 'neg'; points: Array<{ x: number; y: number }> }> = [];
    let currentSegment: { sign: 'pos' | 'neg'; points: Array<{ x: number; y: number }> } | null = null;

    const getSign = (value: number) => (value >= 0 ? 'pos' : 'neg');
    const startSegment = (sign: 'pos' | 'neg', point: { x: number; y: number }) => {
      currentSegment = { sign, points: [point] };
      segments.push(currentSegment);
    };
    const addPoint = (point: { x: number; y: number }) => {
      if (!currentSegment) return;
      currentSegment.points.push(point);
    };

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const currentSign = getSign(current.value);
      const nextSign = getSign(next.value);

      if (!currentSegment) {
        startSegment(currentSign, { x: current.x, y: current.y });
      }

      if (currentSign === nextSign) {
        addPoint({ x: next.x, y: next.y });
        continue;
      }

      const t = current.value / (current.value - next.value);
      const crossX = current.x + (next.x - current.x) * t;
      const crossPoint = { x: crossX, y: baseline };

      addPoint(crossPoint);
      startSegment(nextSign, crossPoint);
      addPoint({ x: next.x, y: next.y });
    }

    const buildAreaPath = (segmentPoints: Array<{ x: number; y: number }>) => {
      if (segmentPoints.length === 0) return '';
      const first = segmentPoints[0];
      const last = segmentPoints[segmentPoints.length - 1];
      const line = segmentPoints
        .map((point, index) => `${index === 0 ? 'L' : 'L'} ${point.x} ${point.y}`)
        .join(' ');
      return `M ${first.x} ${baseline} ${line} L ${last.x} ${baseline} Z`;
    };

    const positiveAreas = segments
      .filter((segment) => segment.sign === 'pos')
      .map((segment) => buildAreaPath(segment.points));
    const negativeAreas = segments
      .filter((segment) => segment.sign === 'neg')
      .map((segment) => buildAreaPath(segment.points));

    const { midStart, endStart } = getPhaseBoundaries(analysis.moves.length, cumulativeValues);
    const selectedIndex = selectedMoveIndex ?? null;
    const hoverIndex = hoveredMoveIndex ?? null;
    const activeIndex = hoverIndex !== null ? hoverIndex : selectedIndex;
    const activePoint = activeIndex !== null ? points[activeIndex] : null;

    const getLabelLeft = (index: number) => {
      const minX = 8;
      const maxX = width - 16;
      const clampedX = Math.min(Math.max(points[index].x, minX), maxX);
      return `${(clampedX / width) * 100}%`;
    };

    const handleChartMove = (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      const ratio = rect.width === 0 ? 0 : relativeX / rect.width;
      const index = Math.round(ratio * (analysis.moves.length - 1));
      setHoveredMoveIndex(index);
    };

    const handleChartClick = (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      const ratio = rect.width === 0 ? 0 : relativeX / rect.width;
      const index = Math.round(ratio * (analysis.moves.length - 1));
      handleMoveClick(index);
    };

    return (
      <div className={`panel eval-chart ${extraClassName}`}>
        <div className="eval-chart-header">
          <span>{t('analysisAdvantage')}</span>
        </div>
        <div className="eval-chart-container">
          <svg
            className="eval-chart-svg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={handleChartMove}
            onMouseLeave={() => setHoveredMoveIndex(null)}
            onClick={handleChartClick}
            role="img"
            aria-label="Evaluation delta chart"
          >
            <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} className="eval-chart-guide" />
            <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} className="eval-chart-guide" />
            <line x1="0" y1={baseline} x2={width} y2={baseline} className="eval-chart-baseline" />

            {midStart !== null && midStart > 0 && (
              <line
                x1={points[midStart].x}
                y1="0"
                x2={points[midStart].x}
                y2={height}
                className="eval-chart-phase-line"
              />
            )}
            {endStart !== null && endStart > 0 && (
              <line
                x1={points[endStart].x}
                y1="0"
                x2={points[endStart].x}
                y2={height}
                className="eval-chart-phase-line"
              />
            )}

            {positiveAreas.map((path, index) => (
              <path key={`pos-${index}`} d={path} className="eval-chart-area eval-chart-area-pos" />
            ))}
            {negativeAreas.map((path, index) => (
              <path key={`neg-${index}`} d={path} className="eval-chart-area eval-chart-area-neg" />
            ))}

            <path d={linePath} className="eval-chart-line" />

            {activePoint && (
              <line x1={activePoint.x} y1="0" x2={activePoint.x} y2={height} className="eval-chart-cursor" />
            )}

          </svg>

          <div className="eval-chart-phase-label eval-chart-phase-opening">{t('analysisPhaseOpening')}</div>
          {midStart !== null && midStart > 0 && (
            <div
              className="eval-chart-phase-label"
              style={{ left: getLabelLeft(midStart) }}
            >
              {t('analysisPhaseMiddlegame')}
            </div>
          )}
          {endStart !== null && endStart > 0 && (
            <div
              className="eval-chart-phase-label"
              style={{ left: getLabelLeft(endStart) }}
            >
              {t('analysisPhaseEndgame')}
            </div>
          )}

          {hoverIndex !== null && activePoint && (
            <div
              className="eval-chart-tooltip"
              style={{ left: `${(activePoint.x / width) * 100}%` }}
            >
              <div>Move {analysis.moves[hoverIndex].moveNumber}{analysis.moves[hoverIndex].isWhiteMove ? '.' : '...'} {analysis.moves[hoverIndex].move}</div>
              <div>{(cumulativeValues[hoverIndex] / 100).toFixed(1)} eval</div>
            </div>
          )}
        </div>
      </div>
    );
  };


  if (loading) {
    return <div className="game-analysis-container">{t('analysisLoadingGame')}</div>;
  }

  if (!game) {
    return <div className="game-analysis-container error">{t('analysisGameNotFound')}</div>;
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h2>{t('moveAnalysis')}</h2>
      </div>
      {error && <div className="error-message">{error}</div>}

      {!analysis || analyzing ? (
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
        <div className="layout-2col">
          <div className="layout-2col-board">
            <div className="analysis-result-board chess-board-wrapper">
              <ChessBoardWrapper
                position={boardPosition}
                game={chessInstance}
                arePiecesDraggable={false}
                isInteractive={false}
                showLegalMoves={false}
                showCheck={true}
                boardWidth={analysisBoardWidth}
                orientation={boardOrientation}
                customSquareStyles={highlightSquares}
                customArrows={arrows}
              />
            </div>
            {renderEvalChart('eval-chart-desktop')}
          </div>

          <div className="layout-2col-sidebar">
            <div className="panel moves-analysis">
              <h3>{t('moveHistory')}</h3>
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
              <div className="moves-table">
                <div className="table-header">
                  <div className="col-move">{t('analysisMoveCol')}</div>
                  <div className="col-eval">Δ {t('analysisEvalCol')}</div>
                  <div className="col-type">{t('analysisTypeCol')}</div>
                  <div className="col-best">{t('analysisBestCol')}</div>
                </div>
                {analysis.moves.map((m, idx) => (
                  <div 
                    key={idx}
                    ref={(el) => { moveRowRefs.current[idx] = el; }}
                    className={`table-row ${m.isBlunder ? 'blunder' : m.isMistake ? 'mistake' : ''} ${selectedMoveIndex === idx ? 'selected' : ''}`}
                    onClick={() => handleMoveClick(idx)}
                  >
                    <div className="col-move">{m.moveNumber}{m.isWhiteMove ? '.' : '...'} {m.move}</div>
                    <div className="col-eval">{(analysisEvalDeltas[idx] / 100).toFixed(1)}</div>
                    <div className="col-type">
                      {m.isBlunder ? '💣' : m.isMistake ? '❌' : '✓'}
                    </div>
                    <div className="col-best">{m.bestMove || '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accuracy Summary */}
            <div className="panel accuracy-summary">
              <h3>{t('analysisTitle')} - {t('accuracyLabel')}</h3>
              <div className="accuracy-cards">
                <div className="accuracy-card">
                  <div className="accuracy-player-header">
                    <span>♔</span>
                    <span>{t('analysisWhite')}</span>
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
                    <span>{t('analysisBlack')}</span>
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
            {renderEvalChart('eval-chart-mobile')}
          </div>
        </div>
      )}
    </div>
  );
};
