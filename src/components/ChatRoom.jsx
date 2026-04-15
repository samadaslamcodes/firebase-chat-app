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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 overflow-hidden">
      <motion.main 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-3xl h-[90vh] md:h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl"
      >
        {/* Header */}
        <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2.5 rounded-2xl hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-90"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="h-10 w-[1px] bg-white/10 mx-1"></div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none mb-1">{roomData.name}</h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider">
                  Live Chat • {roomData.participants?.length || 1} Mates
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div 
              onClick={copyCode}
              className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all select-none group"
            >
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">Room Code</span>
                <span className="text-sm font-bold text-primary-400 tracking-widest">{code}</span>
              </div>
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/30 group-hover:text-white/60" />}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.senderUid === user.uid;
              const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-3 group`}
                >
                  {!isMe && (
                    <img 
                      src={avatarUrl} 
                      alt="" 
                      className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 shadow-lg shrink-0"
                    />
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {!isMe && (
                      <span className="text-[10px] text-white/30 mb-1.5 ml-1 font-bold tracking-widest uppercase">
                        {msg.senderName}
                      </span>
                    )}
                    <div className={`px-5 py-3.5 rounded-[1.5rem] text-sm md:text-base leading-relaxed ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-br-none shadow-xl shadow-primary-900/40 border border-primary-500/30' 
                        : 'bg-white/10 text-white/90 rounded-bl-none border border-white/5 backdrop-blur-sm'
                    } ${msg.imageUrl || msg.audioUrl ? 'p-2' : ''}`}>
                      {msg.imageUrl ? (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared media" 
                            className="max-w-[200px] sm:max-w-[250px] rounded-[1rem] object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : msg.audioUrl ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                           <audio src={msg.audioUrl} controls className="h-10 w-full rounded-full bg-white/5" />
                           <span className="text-[9px] uppercase font-bold text-white/30 ml-2">Voice Message</span>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                    <span className="text-[9px] text-white/20 mt-1.5 font-medium tracking-wide">
                      {!msg.createdAt ? 'Transmitting...' : new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isMe && (
                    <img 
                      src={avatarUrl} 
                      alt="" 
                      className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 shadow-lg shrink-0"
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 sm:p-6 bg-white/5 border-t border-white/10 backdrop-blur-md">
          <div className="relative flex items-center gap-2 sm:gap-3">
            
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
              className="p-3 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-50 shrink-0 border border-white/5"
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
              className={`p-3 sm:p-4 rounded-2xl transition-all flex items-center justify-center shrink-0 border border-white/5 shadow-lg ${
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
                placeholder={isRecording ? "Recording your voice..." : "Write something cool..."}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-all text-sm md:text-base pr-10 sm:pr-12 ${isRecording ? 'animate-pulse text-red-400 placeholder:text-red-400/30' : ''}`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500/20 group-focus-within:bg-primary-500 transition-all shadow-[0_0_10px_rgba(139,92,246,0.5)] hidden sm:block"></div>
            </div>
            
            <button 
              type="submit"
              disabled={(!input.trim() && !isUploading) || isUploading}
              className="p-3 sm:p-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white transition-all disabled:opacity-30 disabled:scale-95 shadow-xl shadow-primary-600/30 active:scale-90 flex items-center justify-center shrink-0 group"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
