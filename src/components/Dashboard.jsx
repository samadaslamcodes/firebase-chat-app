import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Hash, LogOut, MessageCircle, ArrowRight, X } from 'lucide-react';

export default function Dashboard() {
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setLoading(true);
    
    try {
      // Generate unique 6-digit code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = doc(db, 'rooms', code);
      
      await setDoc(roomRef, {
        name: roomName,
        code: code,
        creator: {
          uid: user.uid,
          name: user.displayName,
          email: user.email
        },
        participants: [user.uid],
        createdAt: serverTimestamp()
      });

      navigate(`/room/${code}`);
    } catch (err) {
      setError('Failed to create room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setLoading(true);
    setError('');

    try {
      const formattedCode = roomCode.trim().toUpperCase();
      const roomRef = doc(db, 'rooms', formattedCode);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        // Add user to participants if not already there
        await updateDoc(roomRef, {
          participants: arrayUnion(user.uid)
        });
        navigate(`/room/${formattedCode}`);
      } else {
        setError('Room not found. Please check the code.');
      }
    } catch (err) {
      setError('Failed to join room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex items-center justify-between mb-12 glass-panel p-6 rounded-3xl"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName}`} 
              alt="User profile" 
              className="w-12 h-12 rounded-full border-2 border-primary-500/30 bg-white/5"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-white leading-tight uppercase tracking-tight">Elite Dashboard</h1>
              <p className="text-sm text-white/50 font-medium">Welcome back, <span className="text-primary-400">{user?.displayName}</span></p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 transition-all flex items-center gap-2 group"
        >
          <span className="text-sm font-medium hidden sm:block">Logout</span>
          <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.header>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Create Room */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-8 rounded-[2rem] flex flex-col"
        >
          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-600/20 flex items-center justify-center mb-4 border border-primary-500/30">
              <Plus className="text-primary-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Create New Room</h2>
            <p className="text-white/40 text-sm">Start a private space for your friends or team.</p>
          </div>

          <form onSubmit={handleCreateRoom} className="mt-auto space-y-4">
            <input
              type="text"
              placeholder="Enter room name..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-primary-500/50 outline-none"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button 
              disabled={loading || !roomName.trim()}
              className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              Create Room
            </button>
          </form>
        </motion.div>

        {/* Join Room */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8 rounded-[2rem] flex flex-col"
        >
          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-4 border border-indigo-500/30">
              <Hash className="text-indigo-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Join with Code</h2>
            <p className="text-white/40 text-sm">Have an invite? Enter the secret code to enter.</p>
          </div>

          <form onSubmit={handleJoinRoom} className="mt-auto space-y-4">
            <input
              type="text"
              placeholder="e.g. XJ72P9"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white uppercase tracking-widest text-center text-xl font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
            <button 
              disabled={loading || !roomCode.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              Join Room
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
