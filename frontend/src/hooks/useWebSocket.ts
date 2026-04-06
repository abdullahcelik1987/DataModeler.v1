'use client';

import { useEffect, useRef, useCallback, useState, useReducer } from 'react';
import {
  RealtimeMessageType,
  WebSocketState,
  UserPresence,
  CursorPosition,
  Comment,
  EditorChangeDetail,
  WebSocketConfig,
  CollaborationState
} from '@/src/types/realtime';

/**
 * Actions for collaboration state reducer
 */
type CollaborationAction =
  | { type: 'CONNECT'; payload: { userId: string; userName: string } }
  | { type: 'SET_STATE'; payload: Partial<CollaborationState> }
  | { type: 'ADD_USER'; payload: UserPresence }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'UPDATE_CURSOR'; payload: { userId: string; position: CursorPosition } }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'RESOLVE_COMMENT'; payload: string };

/**
 * Reducer for collaboration state
 */
const collaborationReducer = (
  state: CollaborationState,
  action: CollaborationAction
): CollaborationState => {
  switch (action.type) {
    case 'CONNECT':
      return {
        ...state,
        userId: action.payload.userId,
        userName: action.payload.userName,
        connectionState: WebSocketState.CONNECTED,
        lastSyncTime: new Date()
      };

    case 'SET_STATE':
      return { ...state, ...action.payload };

    case 'ADD_USER':
      return {
        ...state,
        activeUsers: [
          ...state.activeUsers.filter(u => u.id !== action.payload.id),
          action.payload
        ]
      };

    case 'REMOVE_USER':
      return {
        ...state,
        activeUsers: state.activeUsers.filter(u => u.id !== action.payload),
        remoteCursors: new Map(
          Array.from(state.remoteCursors).filter(([id]) => id !== action.payload)
        )
      };

    case 'UPDATE_CURSOR':
      const newRemoteCursors = new Map(state.remoteCursors);
      newRemoteCursors.set(action.payload.userId, action.payload.position);
      return {
        ...state,
        remoteCursors: newRemoteCursors
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload]
      };

    case 'RESOLVE_COMMENT':
      return {
        ...state,
        comments: state.comments.map(c =>
          c.id === action.payload ? { ...c, isResolved: true } : c
        )
      };

    default:
      return state;
  }
};

/**
 * Initial collaboration state
 */
const initialCollaborationState: CollaborationState = {
  modelId: '',
  userId: '',
  userName: '',
  connectionState: WebSocketState.DISCONNECTED,
  activeUsers: [],
  localCursor: { line: 0, column: 0 },
  remoteCursors: new Map(),
  comments: [],
  locks: new Map(),
  version: 0,
  lastSyncTime: new Date()
};

/**
 * Hook for managing real-time collaboration via WebSocket
 */
export const useWebSocket = (
  modelId: string,
  userId: string,
  userName: string,
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<unknown[]>([]);

  const [state, dispatch] = useReducer(
    collaborationReducer,
    { ...initialCollaborationState, modelId, userId, userName }
  );

  const config: WebSocketConfig = {
    url: `${apiUrl.replace('http', 'ws')}/api/collaboration/ws/${modelId}`,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    messageTimeout: 5000
  };

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      dispatch({ type: 'SET_STATE', payload: { connectionState: WebSocketState.CONNECTING } });

      const token = localStorage.getItem('token');
      const wsUrl = config.url;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        dispatch({ type: 'CONNECT', payload: { userId, userName } });
        reconnectAttemptsRef.current = 0;

        // Clear message queue
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          send(message);
        }

        // Start heartbeat
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: RealtimeMessageType = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        dispatch({ type: 'SET_STATE', payload: { connectionState: WebSocketState.ERROR } });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        stopHeartbeat();
        dispatch({ type: 'SET_STATE', payload: { connectionState: WebSocketState.DISCONNECTED } });

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < config.reconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, config.reconnectInterval);
        }
      };
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      dispatch({ type: 'SET_STATE', payload: { connectionState: WebSocketState.ERROR } });
    }
  }, [modelId, userId, userName, config]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    dispatch({ type: 'SET_STATE', payload: { connectionState: WebSocketState.DISCONNECTING } });

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Send a WebSocket message
   */
  const send = useCallback((message: unknown) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // Queue message if not connected
      messageQueueRef.current.push(message);
      connect();
      return;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
    }
  }, [connect]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((message: RealtimeMessageType) => {
    switch (message.type) {
      case 'user_joined':
        dispatch({ type: 'ADD_USER', payload: message.user });
        break;

      case 'user_left':
        dispatch({ type: 'REMOVE_USER', payload: message.userId });
        break;

      case 'presence_list':
        dispatch({
          type: 'SET_STATE',
          payload: { activeUsers: message.users }
        });
        break;

      case 'presence_update':
        dispatch({
          type: 'SET_STATE',
          payload: { activeUsers: message.users }
        });
        break;

      case 'cursor_update':
        dispatch({
          type: 'UPDATE_CURSOR',
          payload: { userId: message.userId, position: message.position }
        });
        break;

      case 'comment_added':
        dispatch({ type: 'ADD_COMMENT', payload: message.comment });
        break;

      case 'comment_resolved':
        dispatch({ type: 'RESOLVE_COMMENT', payload: message.commentId });
        break;

      case 'pong':
        // Handle heartbeat pong
        console.log('Heartbeat pong received');
        break;

      case 'error':
        console.error('WebSocket error message:', message.message);
        break;

      default:
        console.log('Unhandled message type:', (message as any).type);
    }
  }, []);

  /**
   * Start heartbeat for connection keep-alive
   */
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    heartbeatIntervalRef.current = setInterval(() => {
      send({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval, send]);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  }, []);

  /**
   * Broadcast local cursor position
   */
  const updateLocalCursor = useCallback(
    (position: CursorPosition) => {
      dispatch({
        type: 'UPDATE_CURSOR',
        payload: { userId, position }
      });

      send({
        type: 'cursor_update',
        position,
        timestamp: new Date().toISOString()
      });
    },
    [userId, send]
  );

  /**
   * Broadcast editor changes
   */
  const broadcastEditorChange = useCallback(
    (change: EditorChangeDetail) => {
      send({
        type: 'editor_change',
        change,
        timestamp: new Date().toISOString()
      });
    },
    [send]
  );

  /**
   * Add a comment
   */
  const addComment = useCallback(
    (content: string, position: CursorPosition) => {
      send({
        type: 'comment_add',
        comment: {
          content,
          position
        },
        timestamp: new Date().toISOString()
      });
    },
    [send]
  );

  /**
   * Resolve a comment
   */
  const resolveComment = useCallback(
    (commentId: string) => {
      send({
        type: 'comment_resolve',
        commentId,
        timestamp: new Date().toISOString()
      });
    },
    [send]
  );

  /**
   * Query current presence
   */
  const queryPresence = useCallback(() => {
    send({
      type: 'presence_query',
      timestamp: new Date().toISOString()
    });
  }, [send]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // State
    state,
    isConnected: state.connectionState === WebSocketState.CONNECTED,
    connectionState: state.connectionState,
    activeUsers: state.activeUsers,
    remoteCursors: state.remoteCursors,
    comments: state.comments,

    // Methods
    connect,
    disconnect,
    send,
    updateLocalCursor,
    broadcastEditorChange,
    addComment,
    resolveComment,
    queryPresence
  };
};

export default useWebSocket;
