import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
  };
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
}

interface Props {
  messages: Message[];
  currentUser: User | null;
}

const MessageList: React.FC<Props> = ({ messages, currentUser }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender._id === currentUser?._id;
    const messageTime = format(new Date(message.createdAt), 'HH:mm');

    return (
      <div
        key={message._id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`flex flex-col max-w-[70%] ${
            isOwnMessage ? 'items-end' : 'items-start'
          }`}
        >
          {/* Sender name */}
          <div className="text-xs text-gray-500 mb-1">
            {isOwnMessage ? 'You' : message.sender.username}
          </div>

          {/* Message content */}
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-gray-200 text-gray-900 rounded-bl-none'
            }`}
          >
            {message.type === 'text' && <p>{message.content}</p>}

            {message.type === 'image' && (
              <div className="max-w-sm">
                <img
                  src={message.fileUrl}
                  alt="Shared"
                  className="rounded-lg"
                  loading="lazy"
                />
                {message.content && (
                  <p className="mt-1 text-sm">{message.content}</p>
                )}
              </div>
            )}

            {message.type === 'file' && (
              <div className="flex items-center space-x-2">
                <i className="fas fa-file text-lg"></i>
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {message.content}
                </a>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-400 mt-1">{messageTime}</div>
        </div>
      </div>
    );
  };

  const renderDateSeparator = (date: string) => {
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-600">
          {format(new Date(date), 'MMMM d, yyyy')}
        </div>
      </div>
    );
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = format(new Date(message.createdAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="chat-messages">
      {Object.entries(messageGroups).map(([date, messages]) => (
        <div key={date}>
          {renderDateSeparator(date)}
          {messages.map(renderMessage)}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;