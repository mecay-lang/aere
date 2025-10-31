// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// We don't need analytics for the login, so I've removed it for now
// to prevent the error.

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAW2kjuoxyZl_wLtqzcymbnuFYEdvOnnl0",
  authDomain: "meca-48cd4.firebaseapp.com",
  projectId: "meca-48cd4",
  storageBucket: "meca-48cd4.firebasestorage.app",
  messagingSenderId: "712145271079",
  appId: "1:712145271079:web:c9e2997cc52693962a9102",
  measurementId: "G-L4604WNGR4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// THIS IS THE FIX:
// Use getAuth() to initialize the auth service and EXPORT it
export const auth = getAuth(app);
export const db = getFirestore(app);

// The line 'const analytics = getAnalytics(app);' was removed
// because 'getAnalytics' was not imported and would cause an error.