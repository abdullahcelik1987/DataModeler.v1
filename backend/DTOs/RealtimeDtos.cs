using System;
using System.Collections.Generic;

namespace DataModeler.DTOs
{
    // ============ REAL-TIME MESSAGING DTOs ============

    /// <summary>
    /// Base class for all real-time WebSocket messages
    /// </summary>
    public class RealtimeMessageDto
    {
        public string Type { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    // ============ CONNECTION & PRESENCE ============

    /// <summary>
    /// Sent when a user joins a collaboration session
    /// </summary>
    public class UserJoinedDto : RealtimeMessageDto
    {
        public UserPresenceDto User { get; set; }
    }

    /// <summary>
    /// Sent when a user leaves a collaboration session
    /// </summary>
    public class UserLeftDto : RealtimeMessageDto
    {
        public string UserId { get; set; }
        public DateTime DisconnectedAt { get; set; }
    }

    /// <summary>
    /// Represents user presence information in real-time
    /// </summary>
    public class UserPresenceDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Color { get; set; }
        public DateTime ConnectedAt { get; set; }
        public CursorPositionDto CursorPosition { get; set; }
    }

    /// <summary>
    /// Sent to a new user with all currently connected users
    /// </summary>
    public class PresenceListDto : RealtimeMessageDto
    {
        public List<UserPresenceDto> Users { get; set; } = new();
    }

    /// <summary>
    /// Generic presence update sent to all users
    /// </summary>
    public class PresenceUpdateDto : RealtimeMessageDto
    {
        public List<UserPresenceDto> Users { get; set; } = new();
    }

    // ============ EDITOR & TEXT CHANGES ============

    /// <summary>
    /// Represents a change in the DBML editor
    /// </summary>
    public class EditorChangeDto : RealtimeMessageDto
    {
        public string SenderId { get; set; }
        public EditorChangeDetailDto Change { get; set; }
    }

    /// <summary>
    /// Details of an editor change operation
    /// </summary>
    public class EditorChangeDetailDto
    {
        public string ChangeType { get; set; } // "insert", "delete", "replace"
        public RangeDto Range { get; set; }
        public string Text { get; set; }
        public int Version { get; set; }
    }

    /// <summary>
    /// Range in the editor (start and end positions)
    /// </summary>
    public class RangeDto
    {
        public CursorPositionDto StartPosition { get; set; }
        public CursorPositionDto EndPosition { get; set; }
    }

    /// <summary>
    /// Represents a position in the editor
    /// </summary>
    public class CursorPositionDto
    {
        public int Line { get; set; }
        public int Column { get; set; }
    }

    /// <summary>
    /// Request to parse DBML content in real-time
    /// </summary>
    public class ParseEditorContentRequestDto : RealtimeMessageDto
    {
        public string Content { get; set; }
        public int Version { get; set; }
    }

    /// <summary>
    /// Result of parsing DBML content
    /// </summary>
    public class ParsedEditorContentDto : RealtimeMessageDto
    {
        public int Version { get; set; }
        public ErdDataDto ErdData { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    // ============ CURSOR & AWARENESS ============

    /// <summary>
    /// Sent when a user moves their cursor
    /// </summary>
    public class CursorUpdateDto : RealtimeMessageDto
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string Color { get; set; }
        public CursorPositionDto Position { get; set; }
    }

    /// <summary>
    /// Sent when a user selects text
    /// </summary>
    public class SelectionUpdateDto : RealtimeMessageDto
    {
        public string UserId { get; set; }
        public string Color { get; set; }
        public RangeDto Range { get; set; }
    }

    // ============ COMMENTS & ANNOTATIONS ============

    /// <summary>
    /// Request to add a comment on a specific location
    /// </summary>
    public class CommentAddRequestDto : RealtimeMessageDto
    {
        public CommentDto Comment { get; set; }
    }

    /// <summary>
    /// Represents a comment on the document
    /// </summary>
    public class CommentDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string Content { get; set; }
        public CursorPositionDto Position { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsResolved { get; set; }
        public string ResolvedBy { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public List<CommentReplyDto> Replies { get; set; } = new();
    }

    /// <summary>
    /// Represents a reply to a comment
    /// </summary>
    public class CommentReplyDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Sent when a new comment is added
    /// </summary>
    public class CommentAddedDto : RealtimeMessageDto
    {
        public CommentDto Comment { get; set; }
    }

    /// <summary>
    /// Request to add a reply to a comment
    /// </summary>
    public class CommentReplyAddRequestDto : RealtimeMessageDto
    {
        public Guid CommentId { get; set; }
        public string Content { get; set; }
    }

    /// <summary>
    /// Sent when a reply is added to a comment
    /// </summary>
    public class CommentReplyAddedDto : RealtimeMessageDto
    {
        public Guid CommentId { get; set; }
        public CommentReplyDto Reply { get; set; }
    }

    /// <summary>
    /// Request to resolve/close a comment
    /// </summary>
    public class CommentResolveRequestDto : RealtimeMessageDto
    {
        public Guid CommentId { get; set; }
    }

    /// <summary>
    /// Sent when a comment is resolved
    /// </summary>
    public class CommentResolvedDto : RealtimeMessageDto
    {
        public Guid CommentId { get; set; }
        public string ResolvedBy { get; set; }
        public DateTime ResolvedAt { get; set; }
    }

    // ============ SYNC & CONFLICT RESOLUTION ============

    /// <summary>
    /// Request to sync full model state
    /// </summary>
    public class SyncRequestDto : RealtimeMessageDto
    {
        public Guid ModelId { get; set; }
        public int LastKnownVersion { get; set; }
    }

    /// <summary>
    /// Response with full model state for sync
    /// </summary>
    public class SyncResponseDto : RealtimeMessageDto
    {
        public Guid ModelId { get; set; }
        public int CurrentVersion { get; set; }
        public string Content { get; set; }
        public List<EditorChangeDetailDto> ChangesSincVersion { get; set; }
    }

    /// <summary>
    /// Notification of a conflict during collaborative editing
    /// </summary>
    public class ConflictNotificationDto : RealtimeMessageDto
    {
        public int ConflictingVersion { get; set; }
        public EditorChangeDetailDto RemoteChange { get; set; }
        public string ResolutionStrategy { get; set; } // "keep_local", "accept_remote", "manual"
    }

    // ============ LOCK & RESERVATION ============

    /// <summary>
    /// Request to lock a section of the document
    /// </summary>
    public class LockRequestDto : RealtimeMessageDto
    {
        public RangeDto Range { get; set; }
        public int TimeoutSeconds { get; set; } = 30;
    }

    /// <summary>
    /// Confirmation that a lock has been granted
    /// </summary>
    public class LockGrantedDto : RealtimeMessageDto
    {
        public string LockId { get; set; }
        public RangeDto Range { get; set; }
        public string LockedBy { get; set; }
    }

    /// <summary>
    /// Notification that a lock has been released
    /// </summary>
    public class LockReleasedDto : RealtimeMessageDto
    {
        public string LockId { get; set; }
        public string ReleasedBy { get; set; }
    }

    // ============ NOTIFICATIONS & ALERTS ============

    /// <summary>
    /// Generic error response
    /// </summary>
    public class ErrorDto : RealtimeMessageDto
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public object Details { get; set; }
    }

    /// <summary>
    /// Pong response to ping keep-alive
    /// </summary>
    public class PongDto : RealtimeMessageDto
    {
        public long Latency { get; set; } // in milliseconds
    }

    /// <summary>
    /// Generic notification for events
    /// </summary>
    public class NotificationDto : RealtimeMessageDto
    {
        public string NotificationType { get; set; }
        public string Message { get; set; }
        public object Data { get; set; }
    }

    // ============ USED IN MODELS DTOs ============

    /// <summary>
    /// Entity-relationship diagram data (used in editor)
    /// </summary>
    public class ErdDataDto
    {
        public List<DbmlTableNodeDto> Tables { get; set; } = new();
        public List<DbmlRelationshipDto> Relationships { get; set; } = new();
        public List<string> ValidationErrors { get; set; } = new();
    }

    /// <summary>
    /// Table node in ERD
    /// </summary>
    public class DbmlTableNodeDto
    {
        public string Name { get; set; }
        public string Alias { get; set; }
        public List<DbmlColumnDto> Columns { get; set; } = new();
        public string Note { get; set; }
    }

    /// <summary>
    /// Column in a table
    /// </summary>
    public class DbmlColumnDto
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public bool IsNotNull { get; set; }
        public bool IsPrimaryKey { get; set; }
        public bool IsUnique { get; set; }
        public bool IsAutoIncrement { get; set; }
        public string DefaultValue { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Relationship between tables
    /// </summary>
    public class DbmlRelationshipDto
    {
        public string FromTable { get; set; }
        public string FromColumn { get; set; }
        public string ToTable { get; set; }
        public string ToColumn { get; set; }
        public string RelationType { get; set; } // "one_to_one", "one_to_many", "many_to_many"
    }
}
