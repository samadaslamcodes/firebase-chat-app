import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ChatRoom from './components/ChatRoom';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // If we are in the middle of a registration-then-logout flow,
      // don't set the user yet so we don't redirect to Dashboard.
      if (sessionStorage.getItem('justRegistered') === 'true') {
        setUser(null);
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect based on auth state */}
        <Route 
          path="/" 
          element={user ? <Dashboard /> : <Navigate to="/auth" />} 
        />
        <Route 
          path="/auth" 
          element={!user ? <Auth /> : <Navigate to="/" />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/room/:code" 
          element={user ? <ChatRoom /> : <Navigate to="/auth" />} 
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Universal Background Elements */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
    </BrowserRouter>
  );
}

export default App;
