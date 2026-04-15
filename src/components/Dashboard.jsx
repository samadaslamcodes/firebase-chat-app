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
    <div className="min-h-screen bg-[#020617] text-white p-4 sm:p-6 md:p-10 flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 md:mb-12 glass-panel p-5 sm:p-6 rounded-[2rem]"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName}`} 
            alt="User profile" 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-primary-500/30 bg-white/5"
          />
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white leading-tight uppercase tracking-tight">Elite</h1>
            <p className="text-xs sm:text-sm text-white/50 font-medium">Welcome, <span className="text-primary-400">{user?.displayName}</span></p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 transition-all flex items-center justify-center gap-2 group border border-white/5"
        >
          <span className="font-semibold text-sm">Logout</span>
          <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {/* Main Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Create Room Box */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden group border border-white/5"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary-600/10 rounded-full blur-3xl group-hover:bg-primary-600/20 transition-all"></div>
          
          <div className="w-14 h-14 rounded-2xl bg-primary-600/20 flex items-center justify-center mb-6 border border-primary-500/20">
            <Plus className="text-primary-400 w-7 h-7" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Create Room</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">Start a private high-end space for your team or friends.</p>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
            <button
              onClick={createRoom}
              className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-bold text-white transition-all shadow-xl shadow-primary-900/20 active:scale-95 flex items-center justify-center gap-2"
            >
              Start Chatting
            </button>
          </div>
        </motion.div>

        {/* Join Room Box */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden group border border-white/5"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>

          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-6 border border-indigo-500/20">
            <Hash className="text-indigo-400 w-7 h-7" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Join Room</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">Have a code? Enter it below to join the conversation.</p>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="E.G. XJ72P9"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-center font-mono tracking-widest text-lg"
            />
            <button
              onClick={joinRoom}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
            >
              Enter Room
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
