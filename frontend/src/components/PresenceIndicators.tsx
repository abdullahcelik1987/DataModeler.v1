'use client';

import React, { useMemo } from 'react';
import { UserPresence, CursorPosition } from '@/src/types/realtime';

interface PresenceIndicatorsProps {
  activeUsers: UserPresence[];
  currentUserId: string;
  remoteCursors: Map<string, CursorPosition>;
  onUserClick?: (userId: string) => void;
}

/**
 * Component displaying active users and their presence indicators
 */
export const PresenceIndicators: React.FC<PresenceIndicatorsProps> = ({
  activeUsers,
  currentUserId,
  remoteCursors,
  onUserClick
}) => {
  const otherUsers = useMemo(
    () => activeUsers.filter(u => u.id !== currentUserId),
    [activeUsers, currentUserId]
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-800">
      {/* Online indicator */}
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-400">
          {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} online
        </span>
      </div>

      {/* User avatars */}
      <div className="flex items-center gap-1 ml-4">
        {otherUsers.map((user) => (
          <UserAvatar
            key={user.id}
            user={user}
            cursorPosition={remoteCursors.get(user.id)}
            onClick={() => onUserClick?.(user.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface UserAvatarProps {
  user: UserPresence;
  cursorPosition?: CursorPosition;
  onClick?: () => void;
}

/**
 * Individual user avatar with presence info
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ user, cursorPosition, onClick }) => {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer group"
      onClick={onClick}
      title={`${user.name} - Connected at ${new Date(user.connectedAt).toLocaleTimeString()}`}
    >
      {/* Avatar circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110"
        style={{ backgroundColor: user.color }}
      >
        {initials}
      </div>

      {/* Cursor position tooltip */}
      {cursorPosition && (
        <div className="opacity-0 group-hover:opacity-100 absolute mt-10 bg-gray-900 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-50 transition-opacity">
          Line {cursorPosition.line + 1}, Col {cursorPosition.column + 1}
        </div>
      )}
    </div>
  );
};

interface ActiveUsersListProps {
  activeUsers: UserPresence[];
  currentUserId: string;
}

/**
 * Detailed list of all active users
 */
export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  activeUsers,
  currentUserId
}) => {
  return (
    <div className="w-56 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">
          Active Users ({activeUsers.length})
        </h3>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {activeUsers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No active users
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {activeUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {user.name}
                    {user.id === currentUserId && ' (You)'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Connected {formatTime(new Date(user.connectedAt))}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CursorIndicatorProps {
  user: UserPresence;
  position: CursorPosition;
  editorHeight: number;
  lineHeight: number;
}

/**
 * Visual cursor indicator for remote users in the editor
 */
export const CursorIndicator: React.FC<CursorIndicatorProps> = ({
  user,
  position,
  editorHeight,
  lineHeight
}) => {
  // Calculate approximate position (this would need refinement with actual Monaco editor integration)
  const top = Math.min(position.line * lineHeight, editorHeight);

  return (
    <div
      className="absolute w-1 h-6 duration-75 transition-all pointer-events-none"
      style={{
        top: `${top}px`,
        backgroundColor: user.color,
        opacity: 0.9,
        boxShadow: `0 0 4px ${user.color}80`
      }}
      title={`${user.name} - Line ${position.line + 1}`}
    >
      {/* Cursor label */}
      <div
        className="absolute top-0 left-1 text-xs text-white font-semibold px-1 rounded"
        style={{
          backgroundColor: user.color,
          whiteSpace: 'nowrap',
          transform: 'translateY(-100%)',
          marginTop: '-2px'
        }}
      >
        {user.name.split(' ')[0]}
      </div>
    </div>
  );
};

interface RemoteSelectionsProps {
  selections: Map<string, { user: UserPresence; range: { startPosition: CursorPosition; endPosition: CursorPosition } }>;
  lineHeight: number;
}

/**
 * Visual indicators for remote user text selections
 */
export const RemoteSelections: React.FC<RemoteSelectionsProps> = ({
  selections,
  lineHeight
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from(selections.values()).map((item, index) => (
        <div
          key={index}
          className="absolute transition-all duration-75"
          style={{
            top: `${item.range.startPosition.line * lineHeight}px`,
            left: `${item.range.startPosition.column * 8}px`,
            height: `${(item.range.endPosition.line - item.range.startPosition.line + 1) * lineHeight}px`,
            backgroundColor: `${item.user.color}20`,
            border: `1px solid ${item.user.color}`,
            borderRadius: '2px'
          }}
          title={`${item.user.name}'s selection`}
        ></div>
      ))}
    </div>
  );
};

/**
 * Connection status badge
 */
interface ConnectionStatusProps {
  isConnected: boolean;
  connectionState: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  connectionState
}) => {
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500';
  const statusText = isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700">
      <div className={`w-2 h-2 rounded-full ${statusColor} ${isConnected ? 'animate-pulse' : ''}`}></div>
      <span className="text-xs text-gray-300">
        {statusText}
        {!isConnected && ` (${connectionState})`}
      </span>
    </div>
  );
};

// Helper function to format time
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return date.toLocaleTimeString();
  }
}
