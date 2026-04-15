import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDF4ZdFQa2yRWZq9Rc-Rqc6ALVXCWIk0RM",
  authDomain: "samad-chat-app.firebaseapp.com",
  projectId: "samad-chat-app",
  storageBucket: "samad-chat-app.firebasestorage.app",
  messagingSenderId: "896904569463",
  appId: "1:896904569463:web:691a20cc32089d99331c72"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);


