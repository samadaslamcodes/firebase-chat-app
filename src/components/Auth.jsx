import { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        // Set flag to prevent App.jsx from redirecting to dashboard
        sessionStorage.setItem('justRegistered', 'true');
        
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: formData.name });
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: formData.name,
          email: formData.email,
          createdAt: new Date().toISOString()
        });

        // FORCE LOGOUT AFTER REGISTRATION
        await auth.signOut();
        
        // Remove flag so they can sign in normally now
        sessionStorage.removeItem('justRegistered');
        
        // Reset form and show success
        setFormData({ name: '', email: '', password: '' });
        setSuccess('Registration successful! Now please sign in.');
        setIsLogin(true);
      }
    } catch (err) {
      sessionStorage.removeItem('justRegistered');
      setError(err.message.replace('Firebase: ', '').replace(' (auth/invalid-credential).', ''));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] overflow-hidden">
      {/* Left Side: Branding & Features */}
      <div className="hidden md:flex flex-1 relative bg-primary-950 items-center justify-center p-12 overflow-hidden">
        {/* Animated Background Blobs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary-600/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]"
        />

        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)]">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">ELITE<span className="text-primary-500">CHAT</span></h1>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold text-white mb-6 leading-[1.1]"
          >
            Connect with your inner circle, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">effortlessly.</span>
          </motion.h2>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {[
              "End-to-end encrypted private rooms",
              "Real-time delivery with zero latency",
              "Beautiful minimalist user interface"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-4 text-white/70">
                <div className="w-6 h-6 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-lg font-medium">{text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        {/* Mobile Logo */}
        <div className="md:hidden mb-12 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">ELITE<span className="text-primary-500">CHAT</span></h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h3 className="text-4xl font-bold text-white mb-3">
              {isLogin ? "Sign In" : "Get Started"}
            </h3>
            <p className="text-white/40 text-lg">
              {isLogin ? "Enter your credentials to access your rooms" : "Create an account to start chatting with friends"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 mb-8"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3 mb-8"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>


          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60 ml-1 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:bg-white/10 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 outline-none transition-all placeholder:text-white/10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-white/60 ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary-500 transition-colors" />
                <input
                  required
                  type="email"
                  placeholder="name@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:bg-white/10 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 outline-none transition-all placeholder:text-white/10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-white/60 uppercase tracking-wider">Password</label>
                {isLogin && <button type="button" className="text-xs text-primary-400 font-bold hover:text-primary-300">Forgot?</button>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary-500 transition-colors" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:bg-white/10 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 outline-none transition-all placeholder:text-white/10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black text-lg py-5 rounded-2xl shadow-2xl shadow-primary-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-white/40 font-medium">
            {isLogin ? "First time here?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-400 font-black ml-2 hover:text-primary-300 transition-colors underline decoration-primary-400/30 underline-offset-4"
            >
              {isLogin ? "Sign Up Free" : "Log In"}
            </button>
          </p>
        </motion.div>

        {/* Footer info */}
        <div className="absolute bottom-8 text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">
          © 2026 Elite Chat System • All Rights Reserved
        </div>
      </div>
    </div>
  );
}
