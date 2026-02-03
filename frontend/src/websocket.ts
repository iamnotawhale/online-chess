import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface GameUpdate {
  gameId: string;
  status: string;
  fenCurrent: string;
  result?: string;
  resultReason?: string;
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
}

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connected: boolean = false;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.client = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8082/ws') as WebSocket,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str) => {
          console.log('[WebSocket]', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.client.onConnect = () => {
        console.log('WebSocket connected');
        this.connected = true;
        resolve();
      };

      this.client.onStompError = (frame) => {
        console.error('WebSocket error:', frame.headers['message']);
        console.error('Details:', frame.body);
        reject(new Error(frame.headers['message']));
      };

      this.client.onWebSocketError = (event) => {
        console.error('WebSocket connection error:', event);
        reject(event);
      };

      this.client.activate();
    });
  }

  disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.client.deactivate();
      this.connected = false;
      this.client = null;
    }
  }

  subscribeToGame(gameId: string, callback: (update: GameUpdate) => void): () => void {
    if (!this.client || !this.connected) {
      console.warn('WebSocket not connected, cannot subscribe');
      return () => {};
    }

    const topic = `/topic/game/${gameId}/updates`;
    
    if (this.subscriptions.has(topic)) {
      console.log('Already subscribed to', topic);
      return () => this.unsubscribeFromGame(gameId);
    }

    const subscription = this.client.subscribe(topic, (message) => {
      try {
        const update: GameUpdate = JSON.parse(message.body);
        callback(update);
      } catch (error) {
        console.error('Error parsing game update:', error);
      }
    });

    this.subscriptions.set(topic, subscription);
    console.log('Subscribed to', topic);

    return () => this.unsubscribeFromGame(gameId);
  }

  unsubscribeFromGame(gameId: string): void {
    const topic = `/topic/game/${gameId}/updates`;
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
      console.log('Unsubscribed from', topic);
    }
  }

  sendMove(gameId: string, move: string): void {
    if (!this.client || !this.connected) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/game/${gameId}/move`,
      body: JSON.stringify({ move }),
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const wsService = new WebSocketService();
export type { GameUpdate };
