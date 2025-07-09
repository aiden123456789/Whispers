// MessageList.tsx
import React, { useRef } from 'react';
import { Whisper } from './types';

export function MessageList({ messages }: { messages: Whisper[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="space-y-2 max-h-48 overflow-y-auto">
      {[...messages]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(msg => (
          <div key={msg.id} className="text-sm p-1 border-b">
            <span className="block text-gray-600 text-xs">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
            <span>{msg.text}</span>
          </div>
        ))}
    </div>
  );
}
