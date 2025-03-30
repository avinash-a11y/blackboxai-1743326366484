// User types
interface User {
  _id: string;
  username: string;
  email: string;
  groupId?: string;
  college_domain?: string;
  isOnline: boolean;
  lastSeen: Date;
}

// Auth Context types
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// Socket Context types
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// Message types
interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
  };
  group: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy: string[];
  replyTo?: Message;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: string;
  updatedAt: string;
}

// Group types
interface Group {
  _id: string;
  name: string;
  join_code: string;
  members: User[];
  createdBy: User;
  college_domain?: string;
  maxMembers: number;
  isPrivate: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Component Props types
interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
}

interface ChatInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file', fileUrl?: string) => void;
  socket: Socket | null;
}

interface PrivateRouteProps {
  children: React.ReactNode;
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pages: number;
  total: number;
}

// Error types
interface ApiError {
  message: string;
  status?: number;
  errors?: { [key: string]: string };
}