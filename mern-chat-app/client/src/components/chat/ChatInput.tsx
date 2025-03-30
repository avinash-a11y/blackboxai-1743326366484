import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Socket } from 'socket.io-client';

interface Props {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file', fileUrl?: string) => void;
  socket: Socket | null;
}

const ChatInput: React.FC<Props> = ({ onSendMessage, socket }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = () => {
    if (!isTyping && socket && user?.groupId) {
      setIsTyping(true);
      socket.emit('typing', { groupId: user.groupId, username: user.username });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socket && user?.groupId) {
        socket.emit('stopTyping', { groupId: user.groupId, username: user.username });
      }
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      if (socket && user?.groupId) {
        socket.emit('stopTyping', { groupId: user.groupId, username: user.username });
      }
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size should not exceed 5MB');
      return;
    }

    const type = file.type.startsWith('image/') ? 'image' : 'file';
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onSendMessage(file.name, type, data.fileUrl);
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`chat-input-container ${dragActive ? 'bg-gray-50' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          accept="image/*,.pdf,.doc,.docx"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <i className="fas fa-paperclip"></i>
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="flex-1 input"
        />

        <button
          type="submit"
          disabled={!message.trim()}
          className="btn-primary px-6"
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>

      {dragActive && (
        <div className="absolute inset-0 bg-primary-500 bg-opacity-10 flex items-center justify-center">
          <div className="text-primary-600 text-lg font-medium">
            Drop files here
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;