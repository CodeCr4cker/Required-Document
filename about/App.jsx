import React, { useState, useEffect, useRef } from "react";
import {
  User, Send, Plus, Settings as SettingsIcon, LogOut, Moon, Sun, Image, Smile, Edit3, Trash2, Check, CheckCheck,
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

// --- Responsive CSS injection ---
const responsiveCss = `
@media (max-width: 769px) {
  .sidebar { width: 100vw !important; flex-direction: row !important; height: 56px !important; position: fixed; top: 0; left: 0; z-index: 40;}
  .sidebar .sidebar-profile { margin-bottom: 0 !important;}
  .sidebar .sidebar-icons {flex-direction: row !important;}
  .sidebar .sidebar-bottom {display: none;}
  .main-content {margin-top: 56px !important;}
  .chat-list {display: block !important;} /* Changed from none to block for mobile */
  .sidebar .sidebar-chats {display: block !important;}
}
@media (min-width: 768px) {
  .sidebar .sidebar-chats { display: none !important; }
  .chat-list {display: block !important;} /* Always visible on desktop */
}
`;

// --- Animated Branding ---
const Branding = ({ logoURL }) => (
  <div className="flex flex-col items-center mb-6 animate-fade-in">
    <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg mb-2">
      <img
        src={logoURL || "https://avatars.githubusercontent.com/u/68625601?v=4"}
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
const Login = ({ onLogin, onShowRegister, logoURL }) => {
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
      <Branding logoURL={logoURL} />
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

// --- About Us (editable by dev, logo and about photo updates) ---
const AboutUs = ({ onClose, canEdit, about, setAbout, onContact, devAccount, logoURL, setLogoURL, aboutPhotoURL, setAboutPhotoURL, devGlowColor, setDevGlowColor }) => {
  const [edit, setEdit] = useState(false);
  const [localAbout, setLocalAbout] = useState(about || "");
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [logoInput, setLogoInput] = useState(logoURL || "");
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoInput, setPhotoInput] = useState(aboutPhotoURL || "");
  

  useEffect(() => { setLocalAbout(about); }, [about]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full relative shadow-2xl">
        <button className="absolute top-2 right-2" onClick={onClose}>✖</button>
        {/* Logo */}
        <div className="w-24 h-24 rounded-full mx-auto mb-2 bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-blue-400">
          <img src={logoURL} alt="Logo" className="w-24 h-24 rounded-full object-cover"/>
        </div>
        {/* About Photo */}
        <div className="w-16 h-16 mx-auto mb-2">
          <img src={aboutPhotoURL} alt="About Photo" className="w-16 h-16 rounded-full object-cover" />
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
          {/* <a className="flex-1 bg-gray-200 hover:bg-gray-300 text-blue-700 rounded-lg py-2 text-center font-semibold" href="https://github.com/CodeCr4cker" target="_blank" rel="noopener noreferrer">
            GitHub
          </a> */}
          <button className="flex-1 bg-blue-500 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2" onClick={onContact} disabled={!devAccount}>
            <Mail size={18} /> Contact Us
          </button>
        </div>
        {canEdit && !edit && (
          <>
            <button className="absolute left-2 top-2 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-700" onClick={() => setEdit(true)}>Edit About</button>
            <div className="flex gap-2 mt-5">
            <button className="absolute left-2  bottom-2 bg-blue-500 text-white rounded p-1" onClick={() => setShowLogoInput(v => !v)}>Change Logo (URL)</button>
            <button className="absolute right-2 bottom-2 bg-blue-500 text-white rounded p-1" onClick={() => setShowPhotoInput(v => !v)}>Change About Photo</button>
            </div>
          </>
        )}
        {showLogoInput && canEdit && (
          <div className="mt-2 flex">
            <input className="flex-1 px-2 py-1 border rounded" value={logoInput} onChange={e => setLogoInput(e.target.value)} placeholder="Paste logo URL" />
            <button className="ml-2 bg-blue-500 text-white px-2 py-1 rounded" onClick={() => { setLogoURL(logoInput); setShowLogoInput(false); }}>Update</button>
          </div>
        )}
        {showPhotoInput && canEdit && (
          <div className="mt-2 flex">
            <input className="flex-1 px-2 py-1 border rounded" value={photoInput} onChange={e => setPhotoInput(e.target.value)} placeholder="Paste about photo URL" />
            <button className="ml-2 bg-blue-500 text-white px-2 py-1 rounded" onClick={() => { setAboutPhotoURL(photoInput); setShowPhotoInput(false); }}>Update</button>
          </div>
        )}
      </div>
    </div>
  );
};



// --- Notification Popup at App level ---
// Only display notification ONCE per notification id (centered)
const NotificationPopup = ({ currentUser }) => {
  const [notification, setNotification] = useState(null);
  const [shownIds, setShownIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("shown_notifications")) || [];
    } catch { return []; }
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, "notifications"), where("to", "==", currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Show only the latest notification, and only once
        const lastDoc = snap.docs[snap.docs.length - 1];
        if (!shownIds.includes(lastDoc.id)) {
          setNotification({ ...lastDoc.data(), id: lastDoc.id });
          setShownIds(ids => {
            const newIds = [...ids, lastDoc.id];
            localStorage.setItem("shown_notifications", JSON.stringify(newIds));
            return newIds;
          });
          setTimeout(() => setNotification(null), 6000);
        }
      }
    });
    return () => unsub();
  }, [currentUser, shownIds]);

  if (!notification) return null;
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      background: notification.color,
      color: "#fff", padding: 20, borderRadius: 8, zIndex: 9999,
      boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
      minWidth: 220, maxWidth: "90vw", textAlign: "center"
    }}>
      <strong>{notification.type?.toUpperCase() || "INFO"}</strong>
      <div>{notification.message}</div>
    </div>
  );
};


// --- Developer: Set chat glow color & send notification ---
const DeveloperSettings = ({
  chatGlowColors, setChatGlowColors,
}) => {
  const [glowChatId, setGlowChatId] = useState("");
  const [glowColor, setGlowColor] = useState("#ff0");
  const [notifyUser, setNotifyUser] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyType, setNotifyType] = useState("info");
  const [notifyColor, setNotifyColor] = useState("#2196f3");
  const [sending, setSending] = useState(false);

  const handleGlow = () => {
    setChatGlowColors(prev => ({ ...prev, [glowChatId]: glowColor }));
    alert(`Glow set for chat ${glowChatId}!`);
  };

  const handleNotify = async () => {
    setSending(true);
    const q = query(collection(db, "users"), where("username", "==", notifyUser));
    const snap = await getDocs(q);
    if (snap.empty) {
      alert("User not found!");
      setSending(false);
      return;
    }
    const user = snap.docs[0].data();
    await addDoc(collection(db, "notifications"), {
      to: user.uid,
      message: notifyMsg,
      type: notifyType,
      color: notifyColor,
      timestamp: new Date()
    });
    alert("Notification sent!");
    setSending(false);
    setNotifyUser(""); setNotifyMsg("");
  };

  return (
    <div>
      <h3 className="font-semibold mb-2">Developer Controls</h3>
      <div className="mb-4">
        <label>Glow a Chat</label>
        <input type="text" value={glowChatId} onChange={e => setGlowChatId(e.target.value)} placeholder="Enter Chat ID" className="ml-2 px-2 py-1 border rounded" />
        <input type="color" value={glowColor} onChange={e => setGlowColor(e.target.value)} className="ml-2" />
        <button onClick={handleGlow} className="ml-2 bg-yellow-500 text-white px-2 py-1 rounded">Set Glow</button>
      </div>
      <div className="mb-4">
        <label>Send Notification</label>
        <input type="text" value={notifyUser} onChange={e => setNotifyUser(e.target.value)} placeholder="Username" className="ml-2 px-2 py-1 border rounded" />
        <input type="text" value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} placeholder="Message" className="ml-2 px-2 py-1 border rounded" />
        <select value={notifyType} onChange={e => setNotifyType(e.target.value)} className="ml-2">
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="congrats">Congratulations</option>
        </select>
        <input type="color" value={notifyColor} onChange={e => setNotifyColor(e.target.value)} className="ml-2" />
        <button onClick={handleNotify} className="ml-2 bg-blue-500 text-white px-2 py-1 rounded" disabled={sending}>Notify</button>
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


 // Now includes Friend Request button and modal for mobile
const ChatList = ({ currentUser, onSelectChat, activeChat, chatGlowColors = {}, onShowRequests }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [chats, setChats] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // --- Friend Requests in ChatList (Mobile) ---
  const [mobileShowRequests, setMobileShowRequests] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, "friendRequests"),
        where("status", "==", "accepted"),
        where("participants", "array-contains", currentUser.uid)
      ),
      async (snap) => {
        const fetched = [];
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const friendUid = data.participants.find(uid => uid !== currentUser.uid);
          if (friendUid) {
            const userQ = query(collection(db, "users"), where("uid", "==", friendUid));
            const userDocs = await getDocs(userQ);
            let lastMessageTimestamp = 0;
            const chatId = [currentUser.uid, friendUid].sort().join("_");
            const msgSnap = await getDocs(query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "desc")));
            if (!msgSnap.empty) lastMessageTimestamp = msgSnap.docs[0].data().timestamp?.toMillis?.() || msgSnap.docs[0].data().timestamp || 0;
            if (!userDocs.empty) {
              const user = userDocs.docs[0].data();
              fetched.push({
                id: friendUid,
                name: user.username,
                type: "direct",
                isOnline: false,
                lastMessage: null,
                unreadCount: 0,
                isTyping: false,
                photoURL: user.photoURL,
                lastMessageTimestamp,
                isDev: user.username === "divyanshu"
              });
            }
          }
        }
        fetched.sort((a, b) => {
          if (a.isDev) return -1;
          if (b.isDev) return 1;
          return b.lastMessageTimestamp - a.lastMessageTimestamp;
        });
        setChats(fetched);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const q = query(collection(db, "users"), where("username", "==", search));
    const docs = await getDocs(q);
    const found = [];
    docs.forEach(doc => {
      if (doc.data().uid !== currentUser.uid) found.push(doc.data());
    });
    setResults(found);
  };

  const handleRequest = async user => {
    if (!currentUser?.uid || !user?.uid) {
      alert("Invalid user for friend request.");
      return;
    }
    const q1 = query(collection(db, "friendRequests"),
      where("from", "==", currentUser.uid),
      where("to", "==", user.uid)
    );
    const q2 = query(collection(db, "friendRequests"),
      where("from", "==", user.uid),
      where("to", "==", currentUser.uid)
    );
    const docs1 = await getDocs(q1);
    const docs2 = await getDocs(q2);
    if (!docs1.empty || !docs2.empty) {
      alert("Friend request already sent or you are already friends.");
      return;
    }
    await addDoc(collection(db, "friendRequests"), {
      from: currentUser.uid,
      to: user.uid,
      participants: [currentUser.uid, user.uid],
      status: "pending",
      createdAt: new Date()
    });
    alert(`Friend request sent to ${user.username}`);
    setShowNewChatModal(false);
    setSearch('');
    setResults([]);
  };

  // Mobile: Friend Requests modal
  const handleShowRequests = () => {
    setMobileShowRequests(true);
    if (onShowRequests) onShowRequests();
  };

  return (
    <div className="chat-list w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col" style={{ display: "block" }}>
      <div className="p-4 border-b dark:border-gray-700 flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onFocus={() => setShowNewChatModal(false)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Friend Request button for mobile */}
        <button
          className="ml-3 p-2 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-700"
          title="Friend Requests"
          onClick={handleShowRequests}
        >
          <UserPlus className="text-blue-600 dark:text-blue-200" size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              chat.isDev ? "bg-green-100 dark:bg-green-900 border-l-4 border-green-500" : ""
            } ${activeChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
            style={chatGlowColors[[currentUser.uid, chat.id].sort().join("_")] ?
              { boxShadow: `0px 0px 12px 0px ${chatGlowColors[[currentUser.uid, chat.id].sort().join("_")]}, 0 1px #eee` } : {}}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                  {chat.photoURL ? (
                    <img src={chat.photoURL} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                  {chat.isDev && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold truncate ${chat.isDev ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-white"}`}>
                    {chat.name}
                  </h3>
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
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Start New Chat
            </h3>
            <input
              type="text"
              placeholder="Enter username"
              value={search}
              onChange={(e) => setSearch(e.target.value.replace(/\s/g, ""))}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
            <button
              onClick={handleSearch}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mb-2"
            >
              Search
            </button>
            {results.length > 0 && (
              <div>
                {results.map(user =>
                  <div key={user.uid} className="flex items-center justify-between py-2">
                    <span>{user.username}</span>
                    <button onClick={() => handleRequest(user)} className="bg-green-500 px-2 py-1 text-white rounded">
                      Add Friend
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowNewChatModal(false)}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Friend Requests Modal for mobile */}
      {mobileShowRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <FriendRequests currentUser={currentUser} />
            <button
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg mt-4"
              onClick={() => setMobileShowRequests(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Friend Requests (not changed) ---
const FriendRequests = ({ currentUser }) => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reqs = [];
      querySnapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      setRequests(reqs);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleAccept = async (requestId) => {
    try {
      const req = requests.find(r => r.id === requestId);
      if (!req) return;
      await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });
      const userRef = query(collection(db, "users"), where("uid", "==", currentUser.uid));
      const userSnap = await getDocs(userRef);
      const otherRef = query(collection(db, "users"), where("uid", "==", req.from));
      const otherSnap = await getDocs(otherRef);
      if (!userSnap.empty && !otherSnap.empty) {
        await updateDoc(userSnap.docs[0].ref, { friends: arrayUnion(req.from) });
        await updateDoc(otherSnap.docs[0].ref, { friends: arrayUnion(currentUser.uid) });
      }
    } catch (err) {
      setError(err.message || "Error accepting request");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await deleteDoc(doc(db, "friendRequests", requestId));
    } catch (err) {
      setError(err.message || "Error rejecting request");
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Friend Requests</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {requests.length === 0 && <p className="text-gray-500">No requests.</p>}
      {requests.map(req =>
        <div key={req.id} className="flex justify-between items-center py-2">
          <span>{req.fromUsername ?? req.from}</span>
          <div>
            <button onClick={() => handleAccept(req.id)} className="mr-2 bg-green-500 px-2 py-1 text-white rounded">Accept</button>
            <button onClick={() => handleReject(req.id)} className="bg-red-500 px-2 py-1 text-white rounded">Reject</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Chat Window with delivered, typing, password-protected chat support, developer highlight/glow ---
const ChatWindow = ({
  currentUser,
  activeChat,
  globalTheme,
  setGlobalTheme,
  wallpapers,
  setWallpapers,
  devChatId,
  chatPasswords,
  setChatPasswords,
  onContactDev,
  chatGlowColors,
  setChatGlowColors,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [typing, setTyping] = useState(false);
  const [locked, setLocked] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordChange, setPasswordChange] = useState("");
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const chatId = activeChat ? [currentUser.uid, activeChat.id].sort().join("_") : null;
  const wallpaper = wallpapers[chatId] || "";

  // Password-protected chat logic
  useEffect(() => {
    if (!activeChat) return;
    if (chatPasswords[chatId] && !sessionStorage.getItem("chat:" + chatId + ":unlocked")) {
      setLocked(true);
      setShowPasswordPrompt(true);
    } else {
      setLocked(false);
    }
  }, [activeChat, chatId, chatPasswords]);

  // Real-time messages + mark as read if not sender
  useEffect(() => {
    if (!chatId || locked) return;
    const unsub = onSnapshot(
      query(collection(db, "chats", chatId, "messages"), orderBy("timestamp")),
      snap => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(docs);
        docs.forEach(msg => {
          if (msg.senderId !== currentUser.uid && !msg.read) {
            updateDoc(doc(db, "chats", chatId, "messages", msg.id), { read: true });
          }
        });
      }
    );
    return () => unsub();
  }, [chatId, currentUser.uid, locked]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing indicator (demo only, not networked)
  useEffect(() => {
    if (!newMessage) return;
    setTyping(true);
    const timeout = setTimeout(() => setTyping(false), 1500);
    return () => clearTimeout(timeout);
  }, [newMessage]);

  // Unlock chat if password matches
  const handleUnlockChat = () => {
    if (chatPasswords[chatId] === passwordInput) {
      sessionStorage.setItem("chat:" + chatId + ":unlocked", "1");
      setLocked(false);
      setShowPasswordPrompt(false);
      setPasswordInput("");
    } else {
      setPasswordPrompt("Wrong password!");
    }
  };

  // Change chat password (Settings)
  const handleSetChatPassword = () => {
    setChatPasswords(prev => ({ ...prev, [chatId]: passwordChange }));
    setShowPasswordChangeModal(false);
    sessionStorage.removeItem("chat:" + chatId + ":unlocked");
  };

  // Remove chat password
  const handleRemoveChatPassword = () => {
    setChatPasswords(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });
    setShowMenu(false);
    sessionStorage.removeItem("chat:" + chatId + ":unlocked");
  };

  const handleSend = async () => {
    if (newMessage.trim() && chatId) {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: newMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
        read: false,
        type: "text"
      });
      setNewMessage("");
      setEditingMessage(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const ref = storageRef(storage, `chat-images/${chatId}/${Date.now()}-${file.name}`);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: "",
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      timestamp: serverTimestamp(),
      read: false,
      type: "image",
      imageUrl: url
    });
  };

  const handleUnfriend = async () => {
    const q = query(collection(db, "friendRequests"),
      where("status", "==", "accepted"),
      where("participants", "array-contains", currentUser.uid)
    );
    const snap = await getDocs(q);
    for (const fDoc of snap.docs) {
      const d = fDoc.data();
      if (d.participants.includes(activeChat.id)) {
        await deleteDoc(fDoc.ref);
      }
    }
    setShowMenu(false);
    alert("Unfriended!");
    window.location.reload();
  };

  const handleCleanChat = async () => {
    if (!chatId) return;
    const q = query(collection(db, "chats", chatId, "messages"));
    const snap = await getDocs(q);
    for (const m of snap.docs) {
      await deleteDoc(m.ref);
    }
    setShowMenu(false);
  };

  const handleSetWallpaper = (url) => {
    setWallpapers(prev => ({ ...prev, [chatId]: url }));
    setShowWallpaperModal(false);
    setShowMenu(false);
  };

  const handleRemoveWallpaper = () => {
    setWallpapers(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });
    setShowMenu(false);
  };

  // Developer highlight/glow feature
  const isDev = currentUser.displayName === "divyanshu";
  const [highlightColor, setHighlightColor] = useState("#ff0");
  const handleHighlightUser = () => {
    if (!activeChat) return;
    const chatIdKey = [currentUser.uid, activeChat.id].sort().join("_");
    setChatGlowColors(prev => ({ ...prev, [chatIdKey]: highlightColor }));
    alert(`Glow set for chat ${chatIdKey}!`);
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

  // Password-protected chat UI
  if (locked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 px-8 py-10 rounded-lg shadow-lg text-center max-w-sm w-full">
          <Lock size={48} className="mx-auto text-blue-500 mb-2" />
          <h3 className="font-semibold text-lg mb-1">This chat is password protected</h3>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-2"
            placeholder="Enter chat password"
          />
          {passwordPrompt && <div className="text-red-500 text-sm mb-2">{passwordPrompt}</div>}
          <button className="w-full bg-blue-500 text-white py-2 rounded" onClick={handleUnlockChat}>Unlock</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900`} style={wallpaper ? {backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover'} : {}}>
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
              {activeChat.photoURL ? (
                <img src={activeChat.photoURL} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </div>
          </div>
          <div>
            <h2 className={`font-semibold ${activeChat.name === "divyanshu" ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-white"}`}>{activeChat.name}{activeChat.name === "divyanshu" ? <span className="ml-2 text-green-500 text-xs font-bold">DEV</span> : ""}</h2>
            <p className="text-sm text-gray-500">Chat</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 relative">
          <button
            onClick={() => setGlobalTheme(t => t === "dark" ? "light" : "dark")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {globalTheme === "dark"
              ? <Sun size={20} className="text-gray-600 dark:text-gray-400" />
              : <Moon size={20} className="text-gray-600 dark:text-gray-400" />}
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 shadow rounded z-50 py-1 min-w-[240px]">
              <button className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setShowWallpaperModal(true)}><Wallpaper size={16}/><span>Set Wallpaper</span></button>
              <button className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={handleRemoveWallpaper}><Image size={16}/> <span>Remove Wallpaper</span></button>
              <button className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={handleCleanChat}><Trash size={16}/> <span>Clean Chat</span></button>
              <button className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={handleUnfriend}><UserMinus size={16}/> <span>Unfriend</span></button>
              <button className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setShowPasswordChangeModal(true)}><Lock size={16}/> <span>{chatPasswords[chatId] ? "Change Chat Password" : "Set Chat Password"}</span></button>
              {chatPasswords[chatId] && <button className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={handleRemoveChatPassword}><Unlock size={16}/> <span>Remove Chat Password</span></button>}
              {activeChat.name === "divyanshu" && (
                <button className="w-full px-4 py-2 flex items-center space-x-2 text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={onContactDev}><Mail size={16}/><span>Contact Dev</span></button>
              )}
              {isDev && (
                <div className="border-t my-1 px-2 py-2">
                  <label className="block mb-1">Highlight This User/Chat</label>
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={e => setHighlightColor(e.target.value)}
                    className="mr-2"
                  />
                  <button onClick={handleHighlightUser} className="bg-yellow-500 text-white px-2 py-1 rounded">Glow This Chat</button>
                </div>
              )}
              <button className="w-full px-4 py-2 flex items-center space-x-2 text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setShowMenu(false)}><X size={16}/> <span>Close</span></button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onEdit={setEditingMessage}
            onDelete={async id => { await deleteDoc(doc(db, "chats", chatId, "messages", id)); }}
          />
        ))}
        {typing && <div className="pl-4 text-xs text-blue-400">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>
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
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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
      </div>
      {showWallpaperModal &&
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Choose a Wallpaper</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                "https://wallpapercave.com/wp/wp2757874.jpg",
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
                "https://images.unsplash.com/photo-1519125323398-675f0ddb6308",
                "https://images.unsplash.com/photo-1465101046530-73398c7f28ca",
                "https://images.unsplash.com/photo-1470770841072-f978cf4d019e",
                "https://images.unsplash.com/photo-1444065381814-865dc9da92c0"
              ].map(url =>
                <img key={url} src={url}
                  alt="Wallpaper"
                  className="rounded-lg cursor-pointer border-4 border-transparent hover:border-blue-500"
                  onClick={() => handleSetWallpaper(url)}
                  style={{ height: 60, objectFit: "cover" }}
                />
              )}
            </div>
            <button
              onClick={() => setShowWallpaperModal(false)}
              className="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg"
            >Cancel</button>
          </div>
        </div>
      }
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Set Chat Password</h3>
            <input
              type="password"
              value={passwordChange}
              onChange={e => setPasswordChange(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded mb-4"
              placeholder="New chat password"
            />
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-500 text-white rounded py-2" onClick={handleSetChatPassword}>Save</button>
              <button className="flex-1 bg-gray-300 text-gray-800 rounded py-2" onClick={() => setShowPasswordChangeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- User Profile (add paste URL for profile photo) ---
const UserProfile = ({ user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState(user?.displayName || user?.username || "");
  const [showPasteURL, setShowPasteURL] = useState(false);
  const [pastedURL, setPastedURL] = useState("");

  useEffect(() => {
    setDisplayName(user?.displayName || "");
    setPhotoURL(user?.photoURL || "");
    setUsername(user?.displayName || user?.username || "");
    async function fetchBio() {
      const q = query(collection(db, "users"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setBio(snapshot.docs[0].data().bio || "");
      }
    }
    fetchBio();
  }, [user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ref = storageRef(storage, `profile-photos/${user.uid}`);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);
    await updateProfile(auth.currentUser, { photoURL: url });
    setPhotoURL(url);
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateDoc(userDoc.ref, { photoURL: url });
    }
    setUploading(false);
  };

  const handleRemovePhoto = async () => {
    if (!photoURL) return;
    try {
      const ref = storageRef(storage, `profile-photos/${user.uid}`);
      await deleteObject(ref);
    } catch (error) {}
    await updateProfile(auth.currentUser, { photoURL: "" });
    setPhotoURL("");
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateDoc(userDoc.ref, { photoURL: "" });
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(auth.currentUser, { displayName });
      setIsEditing(false);
      const q = query(collection(db, "users"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, { username: displayName, bio });
        setUsername(displayName);
      }
      alert("Profile updated!");
    } catch (error) {
      alert("Error updating profile");
    }
  };

  const handlePastePhotoURL = async () => {
    if (!pastedURL) return;
    await updateProfile(auth.currentUser, { photoURL: pastedURL });
    setPhotoURL(pastedURL);
    // update in Firestore
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateDoc(userDoc.ref, { photoURL: pastedURL });
    }
    setShowPasteURL(false);
    setPastedURL("");
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden relative">
          {photoURL ? (
            <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={32} />
          )}
          <input
            type="file"
            id="profile-upload"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
            accept="image/*"
          />
          <button
            onClick={() => document.getElementById("profile-upload").click()}
            className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full"
            disabled={uploading}
            title="Upload Photo"
          >
            <Image size={14} />
          </button>
          {photoURL && (
            <button
              onClick={handleRemovePhoto}
              className="absolute top-0 left-0 bg-red-500 text-white p-1 rounded-full"
              title="Remove Photo"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowPasteURL(v => !v)}
          className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
        >
          Paste Photo URL
        </button>
        {showPasteURL && (
          <div className="mt-2 flex">
            <input
              value={pastedURL}
              onChange={e => setPastedURL(e.target.value)}
              placeholder="Paste direct image URL"
              className="flex-1 px-2 py-1 border rounded"
            />
            <button onClick={handlePastePhotoURL} className="ml-2 bg-blue-500 text-white px-2 py-1 rounded">Update</button>
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">@{username}</h3>
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Display Name"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Bio"
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
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
            <p className="text-gray-700 dark:text-gray-300">{bio}</p>
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
  const Settings = ({ onAbout, onLogout, chatPasswords, setChatPasswords }) => {
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState("");
  const [changePwModal, setChangePwModal] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");

  const [notifyUsername, setNotifyUsername] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyType, setNotifyType] = useState("info");
  const [notifyColor, setNotifyColor] = useState("#2196f3");

  const handleChangePassword = async () => {
    try {
      await updatePassword(auth.currentUser, newPw);
      setInfo("Password changed successfully.");
      setChangePwModal(false);
    } catch (e) {
      console.error(e);
      setInfo("Password could not be changed here (try re-login).");
      setChangePwModal(false);
    }
  };

  const handleNotify = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", notifyUsername)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("User not found");
        return;
      }

      const toUser = snap.docs[0].data();

      await addDoc(collection(db, "notifications"), {
        to: toUser.uid,
        from: auth.currentUser.uid,
        message: notifyMsg,
        type: notifyType,
        color: notifyColor,
        timestamp: new Date(),
      });

      alert("Notification sent!");
      setNotifyUsername("");
      setNotifyMsg("");
    } catch (error) {
      console.error("Notification error:", error);
      alert("Failed to send notification.");
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      <div className="mb-4">
        <label className="block mb-1">Change Password</label>
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded mb-2"
          onClick={() => setChangePwModal(true)}
        >
          Change Password
        </button>

        {changePwModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 px-6 py-8 rounded-lg shadow-lg max-w-sm w-full">
              <h3 className="font-semibold mb-2">Set New Password</h3>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-2"
                placeholder="New Password"
              />
              <button
                className="w-full bg-blue-500 text-white py-2 rounded"
                onClick={handleChangePassword}
              >
                Save
              </button>
              <button
                className="w-full mt-2 bg-gray-300 text-gray-800 py-2 rounded"
                onClick={() => setChangePwModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {info && <div className="mb-4 text-sm text-green-600">{info}</div>}

      {/* Developer-only notification panel */}
      {auth.currentUser?.displayName === "divyanshu" && (
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">Notify Any User</h3>
          <input
            placeholder="Username"
            className="w-full mb-2 px-2 py-1 border rounded"
            value={notifyUsername}
            onChange={(e) => setNotifyUsername(e.target.value)}
          />
          <textarea
            placeholder="Notification message"
            className="w-full mb-2 px-2 py-1 border rounded"
            value={notifyMsg}
            onChange={(e) => setNotifyMsg(e.target.value)}
          />
          <select
            className="w-full mb-2 px-2 py-1 border rounded"
            value={notifyType}
            onChange={(e) => setNotifyType(e.target.value)}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="celebration">Celebration</option>
            <option value="congratulation">Congratulation</option>
          </select>
          <input
            type="color"
            className="w-full h-10 mb-2"
            value={notifyColor}
            onChange={(e) => setNotifyColor(e.target.value)}
          />
          <button
            className="w-full bg-blue-500 text-white py-2 rounded mb-2"
            onClick={handleNotify}
          >
            Notify
          </button>
        </div>
      )}

      <div className="flex space-x-2 mt-4">
        <button
          onClick={onAbout}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
        >
          About Us
        </button>
        <button
          onClick={onLogout}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
 // --- Main App ---
const DEFAULT_LOGO = "https://avatars.githubusercontent.com/u/68625601?v=4";
const DEFAULT_ABOUT_PHOTO = "https://raw.githubusercontent.com/CodeCr4cker/Required-Document/main/about/about.jpg";

const App = () => {
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [section, setSection] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [aboutText, setAboutText] = useState(() => localStorage.getItem("about_text") ||
    "Developed by Mr. Divyanshu Pandey.\nSecure, privacy-first, modern chat with friend requests, blocking, and more!");
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

  const [logoURL, setLogoURL] = useState(() => localStorage.getItem("logo_url") || DEFAULT_LOGO);
  const [aboutPhotoURL, setAboutPhotoURL] = useState(() => localStorage.getItem("about_photo_url") || DEFAULT_ABOUT_PHOTO);
  const [chatGlowColors, setChatGlowColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat_glow_colors") || "{}"); }
    catch { return {}; }
  });

  // About text persists
  useEffect(() => { localStorage.setItem("about_text", aboutText); }, [aboutText]);
  useEffect(() => { localStorage.setItem("logo_url", logoURL); }, [logoURL]);
  useEffect(() => { localStorage.setItem("about_photo_url", aboutPhotoURL); }, [aboutPhotoURL]);
  useEffect(() => { localStorage.setItem("chat_glow_colors", JSON.stringify(chatGlowColors)); }, [chatGlowColors]);
  useEffect(() => { ensureDeveloperAccount().then(setDevAccount); }, []);
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
      <Register onRegister={() => setShowRegister(false)} logoURL={logoURL} />
    ) : (
      <Login onLogin={() => setFirebaseUser(auth.currentUser)} onShowRegister={() => setShowRegister(true)} logoURL={logoURL} />
    );
  }
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar
        user={firebaseUser}
        onProfile={() => setSection("profile")}
        onFriends={() => setSection("friends")}
        onChats={() => setSection("chats")}
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
                chatGlowColors={chatGlowColors}
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
              chatGlowColors={chatGlowColors}
              setChatGlowColors={setChatGlowColors}
            />
          </>
        )}
        {section === "friends" && (
          <div className="flex-1 flex items-center justify-center">
            <ChatList
              currentUser={firebaseUser}
              onSelectChat={setActiveChat}
              activeChat={activeChat}
              chatGlowColors={chatGlowColors}
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
          logoURL={logoURL}
          setLogoURL={setLogoURL}
          aboutPhotoURL={aboutPhotoURL}
          setAboutPhotoURL={setAboutPhotoURL}
        />
      )}
      {showBlocked && <BlockedUsers currentUser={firebaseUser} onClose={() => setShowBlocked(false)} />}
      <NotificationPopup currentUser={firebaseUser} />
    </div>
  );
};

async function ensureDeveloperAccount() {
  const username = "divyanshu";
  const pass = "somya@2008"; // <-- Set your specific password here
  const email = `${username}@divyanshu.pandey`;
  let userObj;
  try {
    // Try to find dev user in Firestore
    const snap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
    if (!snap.empty) {
      userObj = snap.docs[0].data();
      return userObj;
    }
    // Try to create dev user account (without changing firebase auth state)
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, {
      displayName: username,
      photoURL: "https://raw.githubusercontent.com/CodeCr4cker/Required-Document/main/about/about.jpg"
    });
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      username,
      bio: "I am the developer.",
      photoURL: "https://raw.githubusercontent.com/CodeCr4cker/Required-Document/main/about/about.jpg",
      blocked: []
    });
    userObj = {
      uid: user.uid,
      username,
      bio: "I am the developer.",
      photoURL: "https://raw.githubusercontent.com/CodeCr4cker/Required-Document/main/about/about.jpg"
    };
    await signOut(auth);
    return userObj;
  } catch (e) {
    if (e.code === "auth/email-already-in-use" || e.message?.includes("already")) {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
      if (!snap.empty) {
        userObj = snap.docs[0].data();
        return userObj;
      }
    }
    return null;
  }
}

export default App;
