import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MessageSquare, Copy, Check, Users, Image as ImageIcon, Loader2, Mic, Square, Trash2 } from 'lucide-react';


// --- CLOUDINARY CONFIG (Replace with your own) ---
const CLOUDINARY_CLOUD_NAME = "dsp1l1sb2"; 
const CLOUDINARY_UPLOAD_PRESET = "qwq3dtwe"; 
// --------------------------------------------------



export default function ChatRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const scrollRef = useRef(null);
  const user = auth.currentUser;
  const fileInputRef = useRef(null);
  const chunks = useRef([]);

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      const roomRef = doc(db, 'rooms', code);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        setRoomData(roomSnap.data());
      } else {
        navigate('/');
      }
    };
    fetchRoom();
  }, [code, navigate]);

  // Subscribe to messages
  useEffect(() => {
    if (!code) return;
    const messagesRef = collection(db, 'rooms', code, 'messages');
    const q = query(messagesRef, orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [code]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
        chunks.current = [];
        await uploadAudio(audioBlob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      // Audio is uploaded as 'video' resource type in Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();

      if (data.secure_url) {
        const messagesRef = collection(db, 'rooms', code, 'messages');
        await addDoc(messagesRef, {
          text: '',
          imageUrl: null,
          audioUrl: data.secure_url,
          createdAt: serverTimestamp(),
          senderName: user.displayName,
          senderUid: user.uid,
          avatarSeed: user.displayName
        });
      }
    } catch (error) {
      console.error("Audio upload error:", error);
      alert('Failed to send voice message.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if it's an image or GIF
    if (!file.type.startsWith('image/')) {
      alert('Please select an image or GIF file.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();
      
      if (data.secure_url) {
        // Send message with image URL
        const messagesRef = collection(db, 'rooms', code, 'messages');
        await addDoc(messagesRef, {
          text: '', // No text if it's just an image
          imageUrl: data.secure_url,
          createdAt: serverTimestamp(),
          senderName: user.displayName,
          senderUid: user.uid,
          avatarSeed: user.displayName
        });
      } else {
        console.error("Cloudinary error:", data);
        alert('Failed to upload image. Check console for details.');
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Error uploading image.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() && user && !isUploading) {
      const textToSend = input;
      setInput('');
      try {
        const messagesRef = collection(db, 'rooms', code, 'messages');
        await addDoc(messagesRef, {
          text: textToSend,
          imageUrl: null, // No image in text messages
          createdAt: serverTimestamp(),
          senderName: user.displayName,
          senderUid: user.uid,
          avatarSeed: user.displayName
        });
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!roomData) return null;

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:flex w-80 bg-white/5 border-r border-white/10 flex-col backdrop-blur-xl">
        <div className="p-8 border-b border-white/10">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Elite Chat</h1>
          <p className="text-sm text-white/30 mt-1">Status: Operational</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white uppercase">
              {roomData?.name?.charAt(0) || '#'}
            </div>
            <div>
              <p className="text-xs text-white/30 uppercase font-black tracking-widest">Active Room</p>
              <p className="text-white font-bold">{roomData?.name}</p>
            </div>
          </div>
          
          <div className="space-y-4">
             <div className="p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-xs text-indigo-400 font-black uppercase mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Participants
                </p>
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f111a] bg-white/10"></div>
                   ))}
                   <div className="w-8 h-8 rounded-full border-2 border-[#0f111a] bg-white/20 flex items-center justify-center text-[10px] font-bold">+12</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="px-4 py-3 sm:px-6 sm:py-5 border-b border-white/10 flex items-center justify-between bg-[#020617]/80 backdrop-blur-md sticky top-0 z-10 w-full">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button 
              onClick={() => navigate('/')}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-white/10 text-white/70 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">{roomData?.name}</h2>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
              <p className="text-[10px] sm:text-xs text-white/30 font-medium uppercase tracking-widest">Live Chat • 1 Mates</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={copyRoomCode}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group scale-90 sm:scale-100"
            >
              <div className="text-left hidden sm:block">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-tighter">Room Code</p>
                <p className="text-sm font-bold text-indigo-400 font-mono">{code}</p>
              </div>
              <div className="sm:hidden text-[10px] font-bold text-indigo-400 font-mono mr-1">{code}</div>
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />}
            </button>
            
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName}`} 
              alt="User" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-primary-500/30 shrink-0"
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 scroll-smooth pb-24 md:pb-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.senderUid === user?.uid;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.avatarSeed}`} 
                    alt="avatar" 
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-white/10 bg-white/5 mb-1 shrink-0"
                  />
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] sm:text-xs text-white/30 mb-1.5 px-1 font-bold tracking-tight uppercase">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <div className={`px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-[1.2rem] sm:rounded-[1.5rem] text-sm md:text-base leading-relaxed ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-br-none shadow-xl shadow-primary-900/40 border border-primary-500/30' 
                        : 'bg-white/10 text-white/90 rounded-bl-none border border-white/5 backdrop-blur-sm'
                    } ${msg.imageUrl || msg.audioUrl ? 'p-1.5 sm:p-2' : ''}`}>
                      {msg.imageUrl ? (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared media" 
                            className="max-w-full sm:max-w-[250px] rounded-[1rem] object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : msg.audioUrl ? (
                        <div className="flex flex-col gap-2 min-w-[180px] sm:min-w-[200px]">
                           <audio src={msg.audioUrl} controls className="h-9 sm:h-10 w-full rounded-full bg-white/5" />
                           <span className="text-[8px] sm:text-[9px] uppercase font-bold text-white/30 ml-2">Voice Message</span>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                    <span className="text-[9px] text-white/20 mt-1.5 font-medium tracking-wide px-1">
                      {!msg.createdAt ? 'Transmitting...' : new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-3 sm:p-6 bg-[#020617]/90 border-t border-white/10 backdrop-blur-xl absolute bottom-0 left-0 right-0 z-20">
          <div className="max-w-4xl mx-auto relative flex items-center gap-2 sm:gap-3">
            
            {/* Image Upload Button */}
            <input 
              type="file" 
              accept="image/*,image/gif"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-50 shrink-0 border border-white/5"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary-400" />
              ) : (
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
              )}
            </button>

            {/* Voice Message Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center shrink-0 border border-white/5 shadow-lg ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 animate-pulse border-red-500/50' 
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              {isRecording ? <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />}
            </button>

            <div className="flex-1 relative group">
              <input
                type="text"
                disabled={isRecording}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? "Recording..." : "Message..."}
                className={`w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2.5 sm:py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all text-sm md:text-base ${isRecording ? 'animate-pulse text-red-400 placeholder:text-red-400/30' : ''}`}
              />
            </div>
            
            <button 
              type="submit"
              disabled={(!input.trim() && !isUploading) || isUploading}
              className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-primary-600 hover:bg-primary-500 text-white transition-all disabled:opacity-30 disabled:scale-95 shadow-xl shadow-primary-600/30 active:scale-90 flex items-center justify-center shrink-0 group"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
