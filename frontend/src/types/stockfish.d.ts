declare module 'stockfish' {
  interface StockfishEngine {
    postMessage(message: string): void;
    on(event: string, callback: (event: MessageEvent) => void): void;
    off(event: string, callback: (event: MessageEvent) => void): void;
    terminate(): void;
  }

  function Stockfish(): Promise<StockfishEngine>;
  export default Stockfish;
}
