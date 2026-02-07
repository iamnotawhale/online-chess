import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface GameUpdate {
  id?: string;  // Full game response format
  gameId?: string;  // Update message format
  whitePlayerId?: string;
  whiteUsername?: string;
  blackPlayerId?: string;
  blackUsername?: string;
  status: string;
  fenCurrent: string;
  result?: string;
  resultReason?: string;
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
  lastMoveAt?: string;
  timeControl?: string;
  createdAt?: string;
  finishedAt?: string;
  drawOfferedById?: string | null;
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

      if (!token || token.trim() === '') {
        console.warn('⚠️ Cannot connect WebSocket: token is empty');
        reject(new Error('Auth token is required for WebSocket connection'));
        return;
      }

      let sockJsUrl;
      if (window.location.hostname === "localhost") {
        sockJsUrl = "http://localhost:8082/ws";
      } else {
        sockJsUrl = window.location.protocol === "https:" 
          ? "https://onchess.online/ws" 
          : "http://onchess.online/ws";
      }
      this.client = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl) as WebSocket,
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
        console.log('✅ WebSocket connected successfully');
        this.connected = true;
        resolve();
      };

      this.client.onStompError = (frame) => {
        console.error('❌ WebSocket STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);
        
        // If authorization error, don't retry
        if (frame.headers['message']?.includes('ExecutorSubscribableChannel') || 
            frame.headers['message']?.includes('Authorization')) {
          console.warn('🔒 Authorization error - stopping reconnection attempts');
          this.client?.deactivate();
          this.connected = false;
        }
        
        reject(new Error(frame.headers['message']));
      };

      this.client.onWebSocketError = (event) => {
        console.error('❌ WebSocket connection error:', event);
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
    if (!this.client) {
      console.warn('❌ WebSocket client not initialized');
      return () => {};
    }

    const topic = `/topic/game/${gameId}/updates`;

    // If already subscribed, return unsubscribe function
    if (this.subscriptions.has(topic)) {
      console.log('✅ Already subscribed to', topic);
      return () => this.unsubscribeFromGame(gameId);
    }

    // If not connected yet, wait and retry
    if (!this.client.connected) {
      console.warn('⏳ WebSocket not connected yet, waiting for connection...');
      
      // Store callback for later subscription
      let retryAttempts = 0;
      const maxRetries = 20;
      
      const retryInterval = setInterval(() => {
        retryAttempts++;
        console.log(`⏳ Retry ${retryAttempts}/${maxRetries}: checking connection...`);
        
        if (this.client?.connected) {
          console.log('✅ WebSocket connected! Subscribing now...');
          clearInterval(retryInterval);
          
          // Check again if not already subscribed (might have been subscribed in parallel)
          if (!this.subscriptions.has(topic)) {
            this.doSubscribe(gameId, topic, callback);
          } else {
            console.log('⚠️ Already subscribed during retry, skipping');
          }
        } else if (retryAttempts >= maxRetries) {
          console.error('❌ Failed to connect after', maxRetries, 'attempts');
          clearInterval(retryInterval);
        }
      }, 300);
      
      // Return empty unsubscribe for now (will be subscribed via retry)
      return () => {
        clearInterval(retryInterval);
        this.unsubscribeFromGame(gameId);
      };
    }

    // Connected now, subscribe immediately
    return this.doSubscribe(gameId, topic, callback);
  }

  private doSubscribe(gameId: string, topic: string, callback: (update: GameUpdate) => void): () => void {
    if (!this.client || !this.client.connected) {
      console.error('❌ Cannot subscribe: client not connected');
      return () => {};
    }

    // Double-check we're not already subscribed
    if (this.subscriptions.has(topic)) {
      console.log('⚠️ Already subscribed to', topic);
      return () => this.unsubscribeFromGame(gameId);
    }

    try {
      console.log('📡 Subscribing to', topic);
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const update: GameUpdate = JSON.parse(message.body);
          console.log('📨 Received update on', topic);
          callback(update);
        } catch (error) {
          console.error('Error parsing game update:', error);
        }
      });

      this.subscriptions.set(topic, subscription);
      console.log('✅ Subscribed to', topic);

      return () => this.unsubscribeFromGame(gameId);
    } catch (error) {
      console.error('Error subscribing to game:', error);
      return () => {};
    }
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

  subscribeToGameStarted(callback: (message: { gameId: string; message: string }) => void): () => void {
    const topic = '/user/queue/game-started';
    
    if (!this.connected || !this.client) {
      console.warn('❌ WebSocket not connected, cannot subscribe to game-started');
      return () => {};
    }

    if (this.client) {
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const body = JSON.parse(message.body);
          callback(body);
        } catch (err) {
          console.error('Error parsing game-started message:', err);
        }
      });

      this.subscriptions.set(topic, subscription);
      console.log('✅ Subscribed to game-started');

      return () => {
        subscription.unsubscribe();
        this.subscriptions.delete(topic);
        console.log('Unsubscribed from game-started');
      };
    }

    return () => {};
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const wsService = new WebSocketService();
export type { GameUpdate };
