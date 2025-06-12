import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Send, Phone, Video, MoreVertical, Search, Plus, Settings, LogOut, Moon, Sun,
  Image, Smile, Edit3, Trash2, Check, CheckCheck, Circle, MessageSquare, Users, Bell,
  BellOff, Mail, Lock, Eye, EyeOff
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc,
  deleteDoc, serverTimestamp, limit
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getDatabase, ref as dbRef, onDisconnect, set, onValue, serverTimestamp as rtdbServerTimestamp
} from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFBtuIw0HVJl-HYZ9DSP1VZqwXMJli_W8",
  authDomain: "darknet-chat-f6b5a.firebaseapp.com",
  projectId: "darknet-chat-f6b5a",
  storageBucket: "darknet-chat-f6b5a.appspot.com",
  messagingSenderId: "485072993943",
  appId: "1:485072993943:web:262edab82d07a87b4733d2",
  measurementId: "G-2WL2PC8N6H",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Emoji picker component
const EmojiPicker = ({ onEmojiSelect, isOpen, onClose }) => {
  const emojis = ['😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯'];
  if (!isOpen) return null;
  return (
    <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 shadow-lg z-50">
      <div className="grid grid-cols-7 gap-2">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

// Message component
const Message = ({ message, currentUser, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const isOwn = message.senderId === currentUser?.uid;
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {!isOwn && (
          <div className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">
            {message.senderName}
          </div>
        )}
        {message.type === 'image' ? (
          <img src={message.imageUrl} alt="Shared" className="max-w-full rounded" />
        ) : (
          <p className="text-sm">{message.text}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <div className="flex items-center space-x-1">
              {message.read ? <CheckCheck size={14} /> : <Check size={14} />}
            </div>
          )}
        </div>
        {showActions && isOwn && (
          <div className="absolute -top-8 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg flex">
            <button
              onClick={() => onEdit(message)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Chat sidebar component
const ChatSidebar = ({
  chats, activeChat, onChatSelect, onNewChat, searchTerm, onSearchChange, currentUser
}) => {
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');

  const handleCreateChat = async () => {
    if (newChatEmail.trim()) {
      try {
        const chatData = {
          participants: [currentUser.uid, newChatEmail],
          type: 'direct',
          createdAt: serverTimestamp(),
          lastMessage: null,
          participantNames: {
            [currentUser.uid]: currentUser.displayName || currentUser.email,
            [newChatEmail]: newChatEmail
          }
        };
        await addDoc(collection(db, 'chats'), chatData);
        setShowNewChatModal(false);
        setNewChatEmail('');
      } catch (error) {
        console.error('Error creating chat:', error);
      }
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onChatSelect(chat)}
            className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              activeChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                  {chat.photoURL ? (
                    <img src={chat.photoURL} alt="Chat" className="w-full h-full object-cover" />
                  ) : chat.type === 'group' ? (
                    <Users size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                {chat.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {chat.name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {chat.lastMessage?.timestamp &&
                      new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {chat.lastMessage?.text || 'No messages yet'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                {chat.isTyping && (
                  <p className="text-xs text-blue-500 mt-1">Typing...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t dark:border-gray-700">
        <button
          onClick={() => setShowNewChatModal(true)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2"
        >
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Start New Chat
            </h3>
            <input
              type="email"
              placeholder="Enter email address"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateChat}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
              >
                Start Chat
              </button>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main chat window component
const ChatWindow = ({
  activeChat, messages, currentUser, onSendMessage, onEditMessage, onDeleteMessage,
  darkMode, onToggleDarkMode
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      if (editingMessage) {
        onEditMessage(editingMessage.id, newMessage);
        setEditingMessage(null);
      } else {
        onSendMessage(newMessage);
      }
      setNewMessage('');
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // For demo: use FileReader to preview
      const reader = new FileReader();
      reader.onload = (e) => {
        onSendMessage('', 'image', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <MessageSquare size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            Select a chat to start messaging
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Chat header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              {activeChat.type === 'group' ? <Users size={20} /> : <User size={20} />}
            </div>
            {activeChat.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{activeChat.name}</h2>
            <p className="text-sm text-gray-500">
              {activeChat.isOnline ? 'Online' : 'Last seen recently'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Phone size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Video size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onToggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {darkMode
              ? <Sun size={20} className="text-gray-600 dark:text-gray-400" />
              : <Moon size={20} className="text-gray-600 dark:text-gray-400" />}
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onEdit={setEditingMessage}
            onDelete={onDeleteMessage}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Image size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
            />
            <div className="absolute right-2 top-2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                <Smile size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
              />
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white p-2 rounded-lg"
          >
            <Send size={20} />
          </button>
        </div>
        {editingMessage && (
          <div className="mt-2 flex items-center justify-between bg-yellow-50 dark:bg-yellow-900 p-2 rounded">
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Editing message
            </span>
            <button
              onClick={() => setEditingMessage(null)}
              className="text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Profile component
const UserProfile = ({ user, onUpdateProfile }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      await updateProfile(auth.currentUser, { displayName });
      onUpdateProfile({ displayName });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={32} />
          )}
        </div>
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Display Name"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user?.displayName || 'Anonymous User'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const ChatApp = () => {
  // For demo purposes, using a mock user
  const [currentUser] = useState({
    uid: "user1",
    displayName: "John Doe",
    email: "john@example.com"
  });
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([
    {
      id: '1',
      name: 'Alice Johnson',
      type: 'direct',
      isOnline: true,
      lastMessage: { text: 'Hey, how are you?', timestamp: Date.now() - 300000 },
      unreadCount: 2,
      isTyping: false
    },
    {
      id: '2',
      name: 'Team Alpha',
      type: 'group',
      isOnline: false,
      lastMessage: { text: 'Meeting at 3 PM', timestamp: Date.now() - 3600000 },
      unreadCount: 0,
      isTyping: true
    }
  ]);
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! How are you doing today?',
      senderId: 'user2',
      senderName: 'Alice Johnson',
      timestamp: Date.now() - 3600000,
      read: true,
      type: 'text'
    },
    {
      id: '2',
      text: 'I\'m doing great! Just working on some projects.',
      senderId: 'user1',
      senderName: 'John Doe',
      timestamp: Date.now() - 3000000,
      read: true,
      type: 'text'
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Filter chats based on search
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = (text, type = 'text', imageUrl = null) => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      timestamp: Date.now(),
      read: false,
      type,
      imageUrl
    };
    setMessages(prev => [...prev, newMessage]);
    setChats(prev => prev.map(chat =>
      chat.id === activeChat?.id
        ? { ...chat, lastMessage: { text: text || 'Image', timestamp: Date.now() } }
        : chat
    ));
    if (notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('New Message', {
        body: text || 'Image shared',
        icon: '/favicon.ico'
      });
    }
  };

  const handleEditMessage = (messageId, newText) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, text: newText, edited: true } : msg
    ));
  };

  const handleDeleteMessage = (messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      name: 'New Chat',
      type: 'direct',
      isOnline: false,
      lastMessage: null,
      unreadCount: 0,
      isTyping: false
    };
    setChats(prev => [...prev, newChat]);
    setActiveChat(newChat);
  };

  const handleUpdateProfile = (updates) => {
    console.log('Profile updated:', updates);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    // For demo, just reload. In real app, call signOut(auth);
    window.location.reload();
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-4">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <MessageSquare className="text-white" size={20} />
        </div>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center"
        >
          <User className="text-white" size={20} />
        </button>
        <button
          onClick={() => setNotifications(!notifications)}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center"
        >
          {notifications ?
            <Bell className="text-white" size={20} /> :
            <BellOff className="text-white" size={20} />
          }
        </button>
        <button className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center">
          <Settings className="text-white" size={20} />
        </button>
        <div className="flex-1"></div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center"
        >
          <LogOut className="text-white" size={20} />
        </button>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex">
        {showProfile ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <UserProfile user={currentUser} onUpdateProfile={handleUpdateProfile} />
          </div>
        ) : (
          <>
            <ChatSidebar
              chats={filteredChats}
              activeChat={activeChat}
              onChatSelect={setActiveChat}
              onNewChat={handleNewChat}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              currentUser={currentUser}
            />
            <ChatWindow
              activeChat={activeChat}
              messages={activeChat ? messages : []}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatApp;