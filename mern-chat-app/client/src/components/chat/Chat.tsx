import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.groupId) {
      navigate('/join-group');
      return;
    }

    // Load initial messages
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages/${user.groupId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        setMessages(data.messages);
      } catch (err) {
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user, navigate]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('message', (newMessage: Message) => {
      setMessages(prev => [...prev, newMessage]);
    });

    // Listen for typing events
    socket.on('userTyping', (username: string) => {
      setTypingUsers(prev => new Set(prev).add(username));
    });

    socket.on('userStoppedTyping', (username: string) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    });

    // Listen for message deletion
    socket.on('messageDeleted', (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    // Listen for message edits
    socket.on('messageEdited', (editedMessage: Message) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === editedMessage._id ? editedMessage : msg
        )
      );
    });

    return () => {
      socket.off('message');
      socket.off('userTyping');
      socket.off('userStoppedTyping');
      socket.off('messageDeleted');
      socket.off('messageEdited');
    };
  }, [socket]);

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string) => {
    if (!socket || !user?.groupId) return;

    try {
      const message = {
        content,
        type,
        fileUrl,
        groupId: user.groupId,
      };

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const newMessage = await response.json();
      socket.emit('newMessage', newMessage);
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold">Group Chat</h1>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <button
          onClick={handleLogout}
          className="btn-secondary text-sm"
        >
          Logout
        </button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUser={user} />

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-2 text-sm text-gray-600">
          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} socket={socket} />
    </div>
  );
};

export default Chat;