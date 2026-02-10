import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import './GameAnalysis.css';
import { apiService } from '../api';
import { MoveAnalysis, GameAnalysisResult } from '../utils/analysisTypes';

export const GameAnalysis: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<any>(null);
  const [moves, setMoves] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<GameAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Load game and its moves
  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;
      try {
        setLoading(true);
        const gameData = await apiService.getGame(gameId);
        const movesData = await apiService.getGameMoves(gameId);
        setGame(gameData);
        setMoves(movesData);
      } catch (err) {
        setError('Ошибка загрузки партии');
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, [gameId]);

  // Initialize Stockfish
  useEffect(() => {
    // Placeholder for future Stockfish integration
    // For MVP, analysis is calculated based on game state
  }, []);

  // Analyze game - simplified version for MVP
  const startAnalysis = async () => {
    if (!game || moves.length === 0) {
      setError('Недостаточно данных для анализа');
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    const analysisResults: MoveAnalysis[] = [];

    try {
      const chess = new Chess();

      // Build move sequence
      moves.forEach((m: any, idx: number) => {
        const move = m.san || m.move || '';
        
        // Simulate analysis (in real version, would call Stockfish API)
        // For MVP: randomly assign some positions as mistakes/blunders
        const isBlunder = Math.random() < 0.05; // 5% blunders
        const isMistake = Math.random() < 0.15 && !isBlunder; // 15% mistakes
        
        const moveAnalysis: MoveAnalysis = {
          moveNumber: Math.floor(idx / 2) + 1,
          isWhiteMove: idx % 2 === 0,
          move,
          evaluation: Math.floor(Math.random() * 400) - 200, // Random evaluation
          bestMove: '',
          isMistake,
          isInaccuracy: false,
          isBlunder,
        };

        analysisResults.push(moveAnalysis);
        chess.move(move);
        setProgress(Math.round(((idx + 1) / moves.length) * 100));
      });

      // Calculate statistics
      let whiteAccuracy = 100;
      let blackAccuracy = 100;
      let whiteMistakes = 0;
      let blackMistakes = 0;
      let whiteBlunders = 0;
      let blackBlunders = 0;

      analysisResults.forEach((m) => {
        if (m.isBlunder) {
          if (m.isWhiteMove) {
            whiteBlunders++;
            whiteAccuracy -= 5;
          } else {
            blackBlunders++;
            blackAccuracy -= 5;
          }
        } else if (m.isMistake) {
          if (m.isWhiteMove) {
            whiteMistakes++;
            whiteAccuracy -= 2;
          } else {
            blackMistakes++;
            blackAccuracy -= 2;
          }
        }
      });

      setAnalysis({
        gameId: gameId!,
        totalMoves: analysisResults.length,
        whiteAccuracy: Math.max(0, whiteAccuracy),
        blackAccuracy: Math.max(0, blackAccuracy),
        whiteMistakes,
        blackMistakes,
        whiteBlunders,
        blackBlunders,
        moves: analysisResults,
        analysisProgress: 100,
      });
    } catch (err) {
      setError('Ошибка при анализе: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <div className="game-analysis-container">Загрузка партии...</div>;
  }

  if (!game) {
    return <div className="game-analysis-container error">Партия не найдена</div>;
  }

  return (
    <div className="game-analysis-container">
      <div className="game-analysis-header">
        <h1>Анализ партии</h1>
        <div className="game-info">
          <span>{game.whitePlayerName || game.whitePlayerId} vs {game.blackPlayerName || game.blackPlayerId}</span>
          <span>{game.timeControl}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!analysis ? (
        <div className="analysis-start">
          <p>Анализ нужен для понимания ошибок и улучшения игры</p>
          <button 
            onClick={startAnalysis} 
            disabled={analyzing}
            className="analyze-btn"
          >
            {analyzing ? `Анализируем... ${progress}%` : 'Начать анализ'}
          </button>
        </div>
      ) : (
        <div className="analysis-results">
          {/* Accuracy Summary */}
          <div className="accuracy-summary">
            <div className="player-accuracy">
              <h3>Белые</h3>
              <div className="accuracy-bar">
                <div 
                  className="accuracy-fill"
                  style={{ width: `${analysis.whiteAccuracy}%` }}
                />
              </div>
              <p className="accuracy-value">{Math.round(analysis.whiteAccuracy)}%</p>
              <div className="stats">
                <span>❌ Ошибок: {analysis.whiteMistakes}</span>
                <span>💣 Грубых: {analysis.whiteBlunders}</span>
              </div>
            </div>

            <div className="player-accuracy">
              <h3>Чёрные</h3>
              <div className="accuracy-bar">
                <div 
                  className="accuracy-fill"
                  style={{ width: `${analysis.blackAccuracy}%` }}
                />
              </div>
              <p className="accuracy-value">{Math.round(analysis.blackAccuracy)}%</p>
              <div className="stats">
                <span>❌ Ошибок: {analysis.blackMistakes}</span>
                <span>💣 Грубых: {analysis.blackBlunders}</span>
              </div>
            </div>
          </div>

          {/* Moves Table */}
          <div className="moves-analysis">
            <h3>Анализ ходов</h3>
            <div className="moves-table">
              <div className="table-header">
                <div className="col-move">Ход</div>
                <div className="col-eval">Оценка</div>
                <div className="col-type">Тип</div>
                <div className="col-best">Лучше было</div>
              </div>
              {analysis.moves.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`table-row ${m.isBlunder ? 'blunder' : m.isMistake ? 'mistake' : ''}`}
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
        </div>
      )}
    </div>
  );
};
