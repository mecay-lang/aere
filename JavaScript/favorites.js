// ==========================================
// IMPORTS
// ==========================================
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  collection, doc, onSnapshot, deleteDoc, 
  setDoc, getDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ELEMENT SELECTORS
// ==========================================
const favoritesContainer = document.querySelector(".favorites-container");
let currentUserId = null;
let favoritesListener = null;

// ==========================================
// AUTH & FAVORITES LOADING
// ==========================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in
    currentUserId = user.uid;
    loadFavorites(currentUserId);
  } else {
    // User is logged out
    currentUserId = null;
    if (favoritesListener) favoritesListener(); // Unsubscribe
    favoritesContainer.innerHTML = '<h2>Please <a href="login.html">log in</a> to view your favorites.</h2>';
  }
});

/**
 * Attaches a real-time listener to the user's favorites.
 */
function loadFavorites(userId) {
  const favRef = collection(db, "users", userId, "favorites");
  
  favoritesListener = onSnapshot(favRef, (querySnapshot) => {
    favoritesContainer.innerHTML = ''; // Clear the UI

    if (querySnapshot.empty) {
      favoritesContainer.innerHTML = '<h2>You have no favorited items.</h2>';
      return;
    }

    // Loop through each favorited item
    querySnapshot.forEach((doc) => {
      const item = doc.data();
      const itemId = doc.id; // This is the productId
      
      const itemEl = createFavoriteItemElement(item, itemId);
      favoritesContainer.appendChild(itemEl);
    });
  });
}

/**
 * Creates the HTML for a single favorite item.
 */
function createFavoriteItemElement(item, itemId) {
  const itemEl = document.createElement('div');
  itemEl.className = 'favorite-item';
  itemEl.dataset.id = itemId;

  itemEl.innerHTML = `
    <img src="img/${item.imageName}" alt="${item.name}">
    <div class="item-details">
      <h3>${item.name}</h3>
      <span class="price">₱${item.price.toLocaleString()}.00</span>
    </div>
    <div class="item-actions">
      <button class="action-btn add-to-cart-btn"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
      <button class="remove-btn" title="Remove Item"><i class="fas fa-trash"></i></button>
    </div>
  `;

  // --- Add Event Listeners for this item's buttons ---
  
  // Add to Cart button
  itemEl.querySelector(".add-to-cart-btn").addEventListener("click", () => {
    addItemToCart(item);
  });

  // Remove from Favorites button
  itemEl.querySelector(".remove-btn").addEventListener("click", () => {
    removeFromFavorites(itemId);
  });

  return itemEl;
}

// ==========================================
// FAVORITES ACTION FUNCTIONS
// ==========================================

/**
 * Deletes an item from the user's favorites in Firestore.
 */
async function removeFromFavorites(itemId) {
  if (!currentUserId) return;
  if (!confirm("Are you sure you want to remove this from your favorites?")) return;

  const itemRef = doc(db, "users", currentUserId, "favorites", itemId);
  try {
    await deleteDoc(itemRef);
    // The onSnapshot listener will automatically update the UI
  } catch (error) {
    console.error("Error removing item: ", error);
  }
}

/**
 * Adds the specified item to the user's cart.
 * (This is the same logic from script.js)
 */
async function addItemToCart(item) {
  if (!currentUserId) return;

  // We use item.productId (which is the doc id)
  const cartItemRef = doc(db, "users", currentUserId, "cart", item.productId);
  
  try {
    const docSnap = await getDoc(cartItemRef);

    if (docSnap.exists()) {
      // 1. Item is already in cart, increment quantity
      await updateDoc(cartItemRef, {
        quantity: increment(1)
      });
      alert("Added one more to your cart!");
    } else {
      // 2. Item is not in cart, add it
      await setDoc(cartItemRef, {
        productId: item.productId,
        name: item.name,
        price: item.price,
        imageName: item.imageName,
        quantity: 1
      });
      alert("Product added to cart!");
    }
  } catch (error) {
    console.error("Error adding to cart: ", error);
    alert("Error adding item. Please try again.");
  }
}