// 1. IMPORT db from our config AND Firestore functions
import { auth, db } from './firebaseConfig.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// 2. IMPORT 'setDoc' and 'doc'
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Get the form and its elements
const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const fullNameInput = document.getElementById('fullname');

signupForm.addEventListener('submit', (e) => {
  e.preventDefault(); 

  const email = emailInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const fullName = fullNameInput.value.trim(); // Get the full name and trim whitespace

  // Simple validation
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }
  if (fullName === "") {
    alert("Please enter your full name.");
    return;
  }

  // Use Firebase to create the user
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Auth user created successfully
      const user = userCredential.user;
      console.log('Auth user created:', user.uid);

      // 3. NOW, SAVE USER INFO TO FIRESTORE
      // We use 'setDoc' to create a new document.
      // We use 'doc' to specify the path: db -> 'users' collection -> document with ID 'user.uid'
      
      // Create a reference to the new document
      const userDocRef = doc(db, "users", user.uid);
      
      // Set the data for the document
      setDoc(userDocRef, {
        fullName: fullName,
        email: email
        // You can add more fields here, e.g., joinDate: new Date()
      })
      .then(() => {
        // 4. Data saved! Now redirect.
        console.log("User data saved to Firestore.");
        alert('Account created successfully! Please log in.');
        window.location.href = 'login.html'; // Redirect to login page
      })
      .catch((error) => {
        // Handle Firestore error
        console.error("Error writing user document: ", error);
        alert(`Account created, but failed to save user details. Error: ${error.message}`);
      });

    })
    .catch((error) => {
      // Handle Authentication error
      const errorCode = error.code;
      const errorMessage = error.message;
      
      console.error('Signup error:', errorCode, errorMessage);
      
      if (errorCode === 'auth/email-already-in-use') {
        alert('This email address is already in use.');
      } else if (errorCode === 'auth/weak-password') {
        alert('Password should be at least 6 characters long.');
      } else {
        alert(`Error: ${errorMessage}`);
      }
    });
});