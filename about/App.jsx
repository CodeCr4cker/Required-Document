import React, { useState, useEffect, useRef } from "react";
import {
  User, Send, Plus, Settings as SettingsIcon, LogOut, Moon, Sun, Image, Smile, Edit3, Trash2, Check,
  MessageSquare, Users, Search, MoreVertical, X, UserPlus, UserMinus, Trash, Info, Wallpaper, Ban, Lock, Unlock, Mail
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, getDocs, collection, addDoc, query, where, updateDoc, doc, onSnapshot, arrayUnion, arrayRemove, deleteDoc, orderBy, serverTimestamp
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, updatePassword
} from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Firebase config (keep this safe!)
const firebaseConfig = {
  apiKey: "AIzaSyBFBtuIw0HVJl-HYZ9DSP1VZqwXMJli_W8",
  authDomain: "darknet-chat-f6b5a.firebaseapp.com",
  projectId: "darknet-chat-f6b5a",
  storageBucket: "darknet-chat-f6b5a.appspot.com",
  messagingSenderId: "485072993943",
  appId: "1:485072993943:web:262edab82d07a87b4733d2",
  measurementId: "G-2WL2PC8N6H",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Responsive CSS
const responsiveCss = `
@media (max-width: 768px) {
  .sidebar { width: 100vw !important; flex-direction: row !important; height: 56px !important; position: fixed; top: 0; left: 0; z-index: 40;}
  .sidebar .sidebar-profile { margin-bottom: 0 !important;}
  .sidebar .sidebar-icons {flex-direction: row !important;}
  .sidebar .sidebar-bottom {display: none;}
  .main-content {margin-top: 56px !important;}
  .chat-list {display: none;}
  .sidebar .sidebar-chats {display: block !important;}
}
@media (min-width: 769px) {
  .sidebar .sidebar-chats { display: none !important; }
}
`;

// --- Branding ---
const Branding = () => (
  <div className="flex flex-col items-center mb-6 animate-fade-in">
    <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg mb-2">
      <img
        src="https://avatars.githubusercontent.com/u/68625601?v=4"
        alt="Divyanshu Pandey"
        className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 shadow"
      />
    </div>
    <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 drop-shadow-sm select-none flex">
      <span className="mr-2 animate-bounce">Buddy</span>
      <span className="text-gray-800 dark:text-gray-300 font-mono animate-pulse">Chat</span>
    </h1>
    <span className="text-xs text-gray-400 mt-1 tracking-widest uppercase">by Divyanshu Pandey</span>
  </div>
);

// --- Loader ---
const Loader = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-900">
    <div className="w-20 h-20 mb-4 rounded-full bg-blue-500 flex items-center justify-center">
      <MessageSquare size={48} className="text-white animate-spin" />
    </div>
    <div className="loader mb-2"></div>
    <p className="text-gray-700 dark:text-gray-300">Loading...</p>
  </div>
);

// --- Login ---
const Login = ({ onLogin, onShowRegister }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Typing effect for branding slogan
  const [typed, setTyped] = useState("");
  const slogan = "Welcome Back";
  useEffect(() => {
    let i = 0;
    const int = setInterval(() => {
      setTyped(slogan.slice(0, i + 1));
      i++;
      if (i >= slogan.length) clearInterval(int);
    }, 60);
    return () => clearInterval(int);
  }, []);
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (!username.trim()) throw new Error("Username required");
      const email = `${username.toLowerCase()}@Divyanshu.Pandey`;
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded shadow animate-fade-in">
      <Branding />
      <p className="text-center text-sm text-blue-500 mb-4 font-mono animate-typing">{typed}</p>
      {error && <div className="text-red-500 mb-2 animate-shake">{error}</div>}
      <div className="mb-4">
        <input
          className="w-full px-3 py-2 border rounded"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
          required
          autoFocus
          autoComplete="username"
        />
      </div>
      <div className="mb-4 relative">
        <input
          className="w-full px-3 py-2 border rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {username && (
          <div className="absolute right-2 top-2">
            <TypingIndicator username={username} />
          </div>
        )}
      </div>
      <button className="w-full bg-blue-500 text-white py-2 rounded font-semibold" type="submit">
        Login
      </button>
      <div className="text-center mt-4">
        <button type="button" className="text-blue-600 hover:underline" onClick={onShowRegister}>
          Create Account
        </button>
      </div>
    </form>
  );
};

// --- Register (enforce lowercase usernames) ---
const Register = ({ onRegister }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (!username.trim()) throw new Error("Username required");
      if (username !== username.toLowerCase()) throw new Error("Username must be in lowercase.");
      const q = query(collection(db, "users"), where("username", "==", username));
      const docs = await getDocs(q);
      if (!docs.empty) throw new Error("Username already taken");
      const email = `${username}@Divyanshu.Pandey`;
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: username });
      await addDoc(collection(db, "users"), { uid: user.uid, username, bio: "", photoURL: "", blocked: [] });
      setSuccess(true);
      setTimeout(onRegister, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded shadow animate-fade-in">
      <Branding />
      <h2 className="text-2xl font-semibold mb-4 text-center">Register</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">Account created! Redirecting...</div>}
      <input
        className="w-full mb-4 px-3 py-2 border rounded"
        placeholder="Unique Username (lowercase)"
        value={username}
        onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
        required
        autoFocus
        autoComplete="username"
      />
      <input
        className="w-full mb-4 px-3 py-2 border rounded"
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
        autoComplete="new-password"
      />
      <button className="w-full bg-blue-500 text-white py-2 rounded" type="submit">
        Register
      </button>
      <div className="text-center mt-4">
        <span className="text-gray-500">
          Already have an account? <button className="text-blue-500" type="button" onClick={onRegister}>Log in.</button>
        </span>
      </div>
    </form>
  );
};

// --- Typing Indicator ---
function TypingIndicator({ username }) {
  const dots = [".", "..", "..."];
  const [dotIdx, setDotIdx] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setDotIdx(idx => (idx + 1) % dots.length), 400);
    return () => clearInterval(i);
  }, []);
  return (
    <span className="text-xs text-blue-400 font-mono animate-typing-fast">
      {username}: typing{dots[dotIdx]}
    </span>
  );
}

// --- Sidebar with Blocked Users ---
const Sidebar = ({
  user, onProfile, onFriends, onRequests, onSettings, onBlocked, onLogout, onAbout, selected, onChats
}) => (
  <div className="sidebar w-16 bg-gray-800 flex flex-col items-center py-4 h-screen gap-4" style={{gap: 24}}>
    <button onClick={onProfile} className="w-12 h-12 mb-2 sidebar-profile flex items-center justify-center relative group">
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow"
          alt="Profile"
          onError={e => { e.target.onerror = null; e.target.src = ""; }}
        />
      ) : (
        <User className="w-12 h-12 rounded-full bg-blue-400 text-white" />
      )}
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full shadow-lg"></span>
    </button>
    <div className="flex flex-col sidebar-icons gap-6" style={{gap: 24}}>
      <button className="sidebar-chats" onClick={onChats} title="Chats"><MessageSquare className="text-white" /></button>
      <button onClick={onFriends} title="Friends"><Users className="text-white" /></button>
      <button onClick={onRequests} title="Friend Requests"><UserPlus className="text-white" /></button>
      <button onClick={onBlocked} title="Blocked Users"><Ban className="text-white" /></button>
      <button onClick={onSettings} title="Settings"><SettingsIcon className="text-white" /></button>
      <button onClick={onAbout} title="About"><Info className="text-white" /></button>
    </div>
    <div className="flex-1"></div>
    <div className="sidebar-bottom">
      <button onClick={onLogout} className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
        <LogOut className="text-white" />
      </button>
    </div>
  </div>
);

// --- About Us (editable by dev) ---
const AboutUs = ({ onClose, canEdit, about, setAbout, onContact, devAccount }) => {
  const [edit, setEdit] = useState(false);
  const [localAbout, setLocalAbout] = useState(about || "");
  useEffect(() => { setLocalAbout(about); }, [about]);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full relative shadow-2xl">
        <button className="absolute top-2 right-2" onClick={onClose}>✖</button>
        <div className="w-24 h-24 rounded-full mx-auto mb-2 bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-blue-400">
          <img src="https://github.com/CodeCr4cker/Required-Document/blob/main/about/about.jpg" alt="Divyanshu Pandey" className="w-24 h-24 rounded-full object-cover"/>
        </div>
        <h3 className="text-center font-bold text-lg mb-1 flex items-center justify-center gap-2">
          <span className="text-green-500">●</span> Divyanshu-Pandey
        </h3>
        <h2 className="text-xl font-semibold text-center mb-2">About This App</h2>
        {edit ? (
          <>
            <textarea
              className="w-full h-24 p-2 border dark:border-gray-600 rounded mb-2"
              value={localAbout}
              onChange={e => setLocalAbout(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-500 text-white rounded py-1" onClick={() => { setAbout(localAbout); setEdit(false); }}>Save</button>
              <button className="flex-1 bg-gray-300 text-gray-800 rounded py-1" onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-center text-gray-700 dark:text-gray-300 whitespace-pre-line">{about}</p>
        )}
        <div className="flex gap-2 mt-5">
          <a className="flex-1 bg-gray-200 hover:bg-gray-300 text-blue-700 rounded-lg py-2 text-center font-semibold" href="https://github.com/CodeCr4ker" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <button className="flex-1 bg-blue-500 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2" onClick={onContact} disabled={!devAccount}>
            <Mail size={18} /> Contact Us
          </button>
        </div>
        {canEdit && !edit && (
          <button className="absolute left-2 top-2 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-700" onClick={() => setEdit(true)}>
            <Edit3 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// --- Blocked Users Modal (with notifications) ---
const BlockedUsers = ({ currentUser, onClose }) => {
  const [blocked, setBlocked] = useState([]);
  useEffect(() => {
    if (!currentUser?.uid) return;
    const fetchBlocked = async () => {
      const q = query(collection(db, "users"), where("uid", "==", currentUser.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const arr = snap.docs[0].data().blocked || [];
        if (arr.length) {
          const userQ = query(collection(db, "users"), where("uid", "in", arr));
          const docs = await getDocs(userQ);
          setBlocked(docs.docs.map(d => d.data()));
        } else setBlocked([]);
      }
    };
    fetchBlocked();
  }, [currentUser]);
  const handleUnblock = async (uid) => {
    const q = query(collection(db, "users"), where("uid", "==", currentUser.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, { blocked: arrayRemove(uid) });
      setBlocked(blocked.filter(u => u.uid !== uid));
      await addDoc(collection(db, "notifications"), {
        to: uid,
        from: currentUser.uid,
        message: `${currentUser.displayName} has unblocked you.`,
        timestamp: new Date()
      });
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-xl mb-4 font-bold">Blocked Users</h3>
        {blocked.length === 0
          ? <p className="text-gray-500">No blocked users.</p>
          : blocked.map(u => (
              <div key={u.uid} className="flex items-center justify-between border-b py-2">
                <span>{u.username}</span>
                <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => handleUnblock(u.uid)}>
                  Unblock
                </button>
              </div>
            ))
        }
        <button className="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

// --- Emoji Picker ---
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

// --- Message Bubble with green dot for delivered, developer highlight ---
const Message = ({ message, currentUser, onEdit, onDelete }) => {
  const isOwn = message.senderId === currentUser?.uid;
  const isDelivered = !!message.read;
  // Highlight messages from developer
  const isDev = message.senderName === "divyanshu";
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-lg group ${
          isDev
            ? 'bg-green-200 border-2 border-green-700 text-black shadow'
            : isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}
      >
        {message.type === 'image' ? (
          <img src={message.imageUrl} alt="Shared" className="max-w-full rounded" />
        ) : (
          <p className="text-sm">{message.text}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs opacity-70">
            {message.timestamp?.toDate
              ? new Date(message.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <div className="flex items-center space-x-1">
              {isDelivered
                ? <span className="w-3 h-3 rounded-full bg-green-500 inline-block mr-1" title="Delivered"></span>
                : <Check size={14} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ChatListModal for mobile ---
const ChatListModal = ({ open, onClose, ...props }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-full max-w-md h-[90vh] overflow-y-auto relative">
        <button className="absolute top-3 right-3" onClick={onClose}><X /></button>
        <ChatList {...props} />
      </div>
    </div>
  );
};

// --- [SNIP] ---
// For brevity, include the rest of your subcomponents (ChatList, FriendRequests, ChatWindow, UserProfile, Settings) unchanged from your original code above.

// --- Dev account recreation and About text persistence ---
async function ensureDeveloperAccount() {
  const now = new Date();
  const pad = x => String(x).padStart(2, "0");
  const username = "divyanshu";
  const pass = `${username}@${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
  const email = `${username}@divyanshu.pandey`;
  let userObj;
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, {
      displayName: username,
      photoURL: "https://github.com/CodeCr4cker/Required-Document/blob/main/about/about.jpg"
    });
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      username,
      bio: "I am the developer.",
      photoURL: "https://github.com/CodeCr4cker/Required-Document/blob/main/about/about.jpg",
      blocked: []
    });
    userObj = {
      uid: user.uid,
      username,
      bio: "I am the developer.",
      photoURL: "https://github.com/CodeCr4cker/Required-Document/blob/main/about/about.jpg"
    };
  } catch (e) {
    // User may already exist, try to sign in
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
      userObj = snap.docs[0]?.data();
    } catch (err) {
      console.error("Failed to sign in existing developer account:", err);
    }
  }
  return userObj;
}
function getAboutText() {
  return localStorage.getItem("about_text") ||
    "Developed by Mr. Divyanshu Pandey.\nSecure, privacy-first, modern chat with friend requests, blocking, and more!";
}

// --- Main App ---
const App = () => {
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [section, setSection] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [aboutText, setAboutText] = useState(getAboutText());
  const [globalTheme, setGlobalTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [wallpapers, setWallpapers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wallpapers") || "{}"); }
    catch { return {}; }
  });
  const [showBlocked, setShowBlocked] = useState(false);
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [devAccount, setDevAccount] = useState(null);
  const [chatPasswords, setChatPasswords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat_passwords") || "{}"); }
    catch { return {}; }
  });

  // About text persists
  useEffect(() => { localStorage.setItem("about_text", aboutText); }, [aboutText]);
  // Dev account always exists
  useEffect(() => { ensureDeveloperAccount().then(setDevAccount); }, []);
  // Loading, theme, wall, passwords
  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
    return auth.onAuthStateChanged(u => setFirebaseUser(u));
  }, []);
  useEffect(() => {
    if (!document.getElementById("responsive-css")) {
      const style = document.createElement("style");
      style.id = "responsive-css";
      style.innerHTML = responsiveCss;
      document.head.appendChild(style);
    }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", globalTheme === "dark");
    localStorage.setItem("theme", globalTheme);
  }, [globalTheme]);
  useEffect(() => {
    localStorage.setItem("wallpapers", JSON.stringify(wallpapers));
  }, [wallpapers]);
  useEffect(() => {
    localStorage.setItem("chat_passwords", JSON.stringify(chatPasswords));
  }, [chatPasswords]);

  // Contact Us handler (send friend request to dev)
  const handleContactUs = async () => {
    if (!firebaseUser || !devAccount) return;
    // Check both directions for request
    const q = query(collection(db, "friendRequests"),
      where("participants", "array-contains", firebaseUser.uid)
    );
    const snap = await getDocs(q);
    if (snap.docs.some(doc => {
      const data = doc.data();
      return Array.isArray(data.participants) &&
        data.participants.includes(firebaseUser.uid) &&
        data.participants.includes(devAccount.uid);
    })) {
      alert("Friend request to developer already sent or already friends!");
      return;
    }
    await addDoc(collection(db, "friendRequests"), {
      from: firebaseUser.uid,
      to: devAccount.uid,
      participants: [firebaseUser.uid, devAccount.uid],
      status: "pending",
      createdAt: new Date()
    });
    alert("Friend request sent to developer!");
    setShowAbout(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
  };

  // Only developer can edit About Us
  const canEditAbout = firebaseUser?.displayName === "divyanshu";

  if (loading) return <Loader />;
  if (!firebaseUser) {
    return showRegister ? (
      <Register onRegister={() => setShowRegister(false)} />
    ) : (
      <Login onLogin={() => setFirebaseUser(auth.currentUser)} onShowRegister={() => setShowRegister(true)} />
    );
  }
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar
        user={firebaseUser}
        onProfile={() => setSection("profile")}
        onFriends={() => setSection("friends")}
        onChats={() => setShowChatsModal(true)}
        onRequests={() => setSection("requests")}
        onBlocked={() => setShowBlocked(true)}
        onSettings={() => setSection("settings")}
        onLogout={handleLogout}
        onAbout={() => setShowAbout(true)}
        selected={section}
      />
      <div className="main-content flex-1 flex">
        {section === "chats" && (
          <>
            <div className="chat-list">
              <ChatList
                currentUser={firebaseUser}
                onSelectChat={setActiveChat}
                activeChat={activeChat}
              />
            </div>
            <ChatWindow
              currentUser={firebaseUser}
              activeChat={activeChat}
              globalTheme={globalTheme}
              setGlobalTheme={setGlobalTheme}
              wallpapers={wallpapers}
              setWallpapers={setWallpapers}
              devChatId={devAccount ? [firebaseUser.uid, devAccount.uid].sort().join("_") : ""}
              chatPasswords={chatPasswords}
              setChatPasswords={setChatPasswords}
              onContactDev={handleContactUs}
            />
          </>
        )}
        {section === "friends" && (
          <div className="flex-1 flex items-center justify-center">
            <ChatList
              currentUser={firebaseUser}
              onSelectChat={setActiveChat}
              activeChat={activeChat}
            />
          </div>
        )}
        {section === "requests" && (
          <div className="flex-1 flex items-center justify-center">
            <FriendRequests currentUser={firebaseUser} />
          </div>
        )}
        {section === "profile" && (
          <div className="flex-1 flex items-center justify-center">
            <UserProfile user={firebaseUser} />
          </div>
        )}
        {section === "settings" && (
          <div className="flex-1 flex items-center justify-center">
            <Settings
              onAbout={() => setShowAbout(true)}
              onLogout={handleLogout}
              chatPasswords={chatPasswords}
              setChatPasswords={setChatPasswords}
            />
          </div>
        )}
      </div>
      {showAbout && (
        <AboutUs
          onClose={() => setShowAbout(false)}
          canEdit={canEditAbout}
          about={aboutText}
          setAbout={setAboutText}
          onContact={handleContactUs}
          devAccount={devAccount}
        />
      )}
      {showBlocked && <BlockedUsers currentUser={firebaseUser} onClose={() => setShowBlocked(false)} />}
      <ChatListModal
        open={showChatsModal}
        onClose={() => setShowChatsModal(false)}
        currentUser={firebaseUser}
        onSelectChat={chat => { setActiveChat(chat); setShowChatsModal(false); setSection("chats"); }}
        activeChat={activeChat}
      />
    </div>
  );
};

export default App;
