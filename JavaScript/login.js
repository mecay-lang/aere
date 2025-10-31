// Import the auth service from our config file
import { auth } from './firebaseConfig.js';
// Import the function we need from the Auth library
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Get the form and its elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault(); // Prevent the form from actually submitting

  const email = emailInput.value;
  const password = passwordInput.value;

  // Use Firebase to sign the user in
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in successfully
      const user = userCredential.user;
      console.log('User logged in:', user);
      
      alert('Login successful! Redirecting to homepage.');
      window.location.href = 'index.html'; // Redirect to the main page
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;

      console.error('Login error:', errorCode, errorMessage);

      // Show a user-friendly message
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        alert('Invalid email or password. Please try again.');
      } else {
        alert(`Error: ${errorMessage}`);
      }
    });
});