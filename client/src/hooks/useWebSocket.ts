import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts) * 1000; // 1s, 2s, 4s, 8s, 16s
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'device_status_update':
        // Invalidate device-related queries to trigger refetch with new data
        queryClient.setQueryData(["/api/devices"], message.data);
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        break;
      case 'deployment_progress':
        // Deployment progress update - invalidate deployment queries
        queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/deployments/active"] });
        break;
      case 'capture_progress':
        // Image capture progress update
        queryClient.invalidateQueries({ queryKey: ["/api/images"] });
        break;
      case 'activity':
        // Activity log update
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
        break;
      case 'post_deployment_update':
      case 'post_deployment_task_update':
      case 'post_deployment_binding_update':
        // Post-deployment automation updates
        queryClient.invalidateQueries({ queryKey: ["/api/post-deployment"] });
        queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
        break;
      default:
        // Silently ignore unknown message types (they may be for other components)
        break;
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    reconnectAttempts,
    connect,
    disconnect
  };
}