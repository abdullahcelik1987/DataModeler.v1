// ============ REAL-TIME MESSAGE TYPES ============

/**
 * Base type for all real-time WebSocket messages
 */
export interface RealtimeMessage {
  type: string;
  timestamp: Date;
}

// ============ CONNECTION & PRESENCE ============

/**
 * Sent when a user joins a collaboration session
 */
export interface UserJoinedMessage extends RealtimeMessage {
  type: 'user_joined';
  user: UserPresence;
}

/**
 * Sent when a user leaves a collaboration session
 */
export interface UserLeftMessage extends RealtimeMessage {
  type: 'user_left';
  userId: string;
  disconnectedAt: Date;
}

/**
 * Represents user presence information in real-time
 */
export interface UserPresence {
  id: string;
  name: string;
  color: string;
  connectedAt: Date;
  cursorPosition?: CursorPosition;
}

/**
 * Sent to a new user with all currently connected users
 */
export interface PresenceListMessage extends RealtimeMessage {
  type: 'presence_list';
  users: UserPresence[];
}

/**
 * Generic presence update sent to all users
 */
export interface PresenceUpdateMessage extends RealtimeMessage {
  type: 'presence_update';
  users: UserPresence[];
}

// ============ EDITOR & TEXT CHANGES ============

/**
 * Represents a change in the DBML editor
 */
export interface EditorChangeMessage extends RealtimeMessage {
  type: 'editor_change';
  senderId: string;
  change: EditorChangeDetail;
}

/**
 * Details of an editor change operation
 */
export interface EditorChangeDetail {
  changeType: 'insert' | 'delete' | 'replace';
  range: Range;
  text: string;
  version: number;
}

/**
 * Range in the editor (start and end positions)
 */
export interface Range {
  startPosition: CursorPosition;
  endPosition: CursorPosition;
}

/**
 * Represents a position in the editor
 */
export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * Request to parse DBML content in real-time
 */
export interface ParseEditorContentRequest extends RealtimeMessage {
  type: 'parse_editor_content';
  content: string;
  version: number;
}

/**
 * Result of parsing DBML content
 */
export interface ParsedEditorContent extends RealtimeMessage {
  type: 'parsed_content';
  version: number;
  erdData: ErdData;
  errors: string[];
}

// ============ CURSOR & AWARENESS ============

/**
 * Sent when a user moves their cursor
 */
export interface CursorUpdateMessage extends RealtimeMessage {
  type: 'cursor_update';
  userId: string;
  userName: string;
  color: string;
  position: CursorPosition;
}

/**
 * Sent when a user selects text
 */
export interface SelectionUpdateMessage extends RealtimeMessage {
  type: 'selection_update';
  userId: string;
  color: string;
  range: Range;
}

// ============ COMMENTS & ANNOTATIONS ============

/**
 * Represents a comment on the document
 */
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  position: CursorPosition;
  createdAt: Date;
  updatedAt?: Date;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  replies: CommentReply[];
}

/**
 * Represents a reply to a comment
 */
export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Sent when a new comment is added
 */
export interface CommentAddedMessage extends RealtimeMessage {
  type: 'comment_added';
  comment: Comment;
}

/**
 * Request to add a reply to a comment
 */
export interface CommentReplyAddRequest extends RealtimeMessage {
  type: 'comment_reply_add';
  commentId: string;
  content: string;
}

/**
 * Sent when a reply is added to a comment
 */
export interface CommentReplyAddedMessage extends RealtimeMessage {
  type: 'comment_reply_added';
  commentId: string;
  reply: CommentReply;
}

/**
 * Request to resolve/close a comment
 */
export interface CommentResolveRequest extends RealtimeMessage {
  type: 'comment_resolve';
  commentId: string;
}

/**
 * Sent when a comment is resolved
 */
export interface CommentResolvedMessage extends RealtimeMessage {
  type: 'comment_resolved';
  commentId: string;
  resolvedBy: string;
  resolvedAt: Date;
}

// ============ SYNC & CONFLICT RESOLUTION ============

/**
 * Request to sync full model state
 */
export interface SyncRequest extends RealtimeMessage {
  type: 'sync_request';
  modelId: string;
  lastKnownVersion: number;
}

/**
 * Response with full model state for sync
 */
export interface SyncResponse extends RealtimeMessage {
  type: 'sync_response';
  modelId: string;
  currentVersion: number;
  content: string;
  changesSinceVersion: EditorChangeDetail[];
}

/**
 * Notification of a conflict during collaborative editing
 */
export interface ConflictNotification extends RealtimeMessage {
  type: 'conflict_notification';
  conflictingVersion: number;
  remoteChange: EditorChangeDetail;
  resolutionStrategy: 'keep_local' | 'accept_remote' | 'manual';
}

// ============ LOCK & RESERVATION ============

/**
 * Request to lock a section of the document
 */
export interface LockRequest extends RealtimeMessage {
  type: 'lock_request';
  range: Range;
  timeoutSeconds?: number;
}

/**
 * Confirmation that a lock has been granted
 */
export interface LockGranted extends RealtimeMessage {
  type: 'lock_granted';
  lockId: string;
  range: Range;
  lockedBy: string;
}

/**
 * Notification that a lock has been released
 */
export interface LockReleased extends RealtimeMessage {
  type: 'lock_released';
  lockId: string;
  releasedBy: string;
}

// ============ NOTIFICATIONS & ALERTS ============

/**
 * Generic error response
 */
export interface ErrorMessage extends RealtimeMessage {
  type: 'error';
  errorCode: string;
  message: string;
  details?: unknown;
}

/**
 * Pong response to ping keep-alive
 */
export interface PongMessage extends RealtimeMessage {
  type: 'pong';
  latency?: number;
}

/**
 * Generic notification for events
 */
export interface NotificationMessage extends RealtimeMessage {
  type: 'notification';
  notificationType: string;
  message: string;
  data?: unknown;
}

// ============ UNION TYPE ============

/**
 * Union type of all possible realtime messages
 */
export type RealtimeMessageType =
  | UserJoinedMessage
  | UserLeftMessage
  | PresenceListMessage
  | PresenceUpdateMessage
  | EditorChangeMessage
  | ParsedEditorContent
  | CursorUpdateMessage
  | SelectionUpdateMessage
  | CommentAddedMessage
  | CommentReplyAddedMessage
  | CommentResolvedMessage
  | SyncResponse
  | ConflictNotification
  | LockGranted
  | LockReleased
  | ErrorMessage
  | PongMessage
  | NotificationMessage;

// ============ ERD DATA (SHARED) ============

/**
 * Entity-relationship diagram data
 */
export interface ErdData {
  tables: DbmlTableNode[];
  relationships: DbmlRelationship[];
  validationErrors: string[];
}

/**
 * Table node in ERD
 */
export interface DbmlTableNode {
  name: string;
  alias?: string;
  columns: DbmlColumn[];
  note?: string;
}

/**
 * Column in a table
 */
export interface DbmlColumn {
  name: string;
  type: string;
  isNotNull: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
  note?: string;
}

/**
 * Relationship between tables
 */
export interface DbmlRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationType: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

// ============ WEBSOCKET STATE & EVENTS ============

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

/**
 * WebSocket event types
 */
export const WebSocketEventTypes = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  RECONNECT_FAILED: 'reconnect_failed'
} as const;

// ============ COLLABORATION STATE ============

/**
 * Collaboration session state
 */
export interface CollaborationState {
  modelId: string;
  userId: string;
  userName: string;
  connectionState: WebSocketState;
  activeUsers: UserPresence[];
  localCursor: CursorPosition;
  remoteCursors: Map<string, CursorPosition>;
  comments: Comment[];
  locks: Map<string, { range: Range; lockedBy: string }>;
  version: number;
  lastSyncTime: Date;
}

/**
 * WebSocket service configuration
 */
export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  messageTimeout: number;
}
