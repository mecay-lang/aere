// ==========================================
// IMPORTS
// ==========================================
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, onSnapshot, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ELEMENT SELECTORS
// ==========================================
const cartContainer = document.querySelector(".cart-container");
const subtotalEl = document.getElementById("subtotal");
const totalEl = document.getElementById("total");
const shippingCost = 120; // Fixed shipping cost

// ==========================================
// AUTH & CART LOADING
// ==========================================
let currentUserId = null;
let cartListener = null; // This will hold our real-time listener

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in
    currentUserId = user.uid;
    loadCart(currentUserId);
  } else {
    // User is logged out
    currentUserId = null;
    if (cartListener) cartListener(); // Unsubscribe from old listener
    cartContainer.innerHTML = '<h2>Please <a href="login.html">log in</a> to view your cart.</h2>';
    updateTotals(0); // Set totals to 0
  }
});

/**
 * Attaches a real-time listener to the user's cart.
 * This function will be called automatically whenever the cart data changes.
 * @param {string} userId - The current user's ID.
 */
function loadCart(userId) {
  const cartRef = collection(db, "users", userId, "cart");

  // onSnapshot is a real-time listener
  cartListener = onSnapshot(cartRef, (querySnapshot) => {
    cartContainer.innerHTML = ''; // Clear the cart UI
    let subtotal = 0;

    if (querySnapshot.empty) {
      cartContainer.innerHTML = '<h2>Your cart is empty.</h2>';
      updateTotals(0);
      return;
    }

    // Loop through each item in the cart
    querySnapshot.forEach((doc) => {
      const item = doc.data();
      const itemId = doc.id; // This is the product ID
      
      // Create the HTML element for the item
      const itemEl = createCartItemElement(item, itemId);
      cartContainer.appendChild(itemEl);
      
      // Add to subtotal
      subtotal += item.price * item.quantity;
    });

    // Update the final totals
    updateTotals(subtotal);
  });
}

/**
 * Creates the HTML for a single cart item.
 * @param {object} item - The cart item data from Firestore.
 * @param {string} itemId - The Firestore document ID (which is the productId).
 * @returns {HTMLElement} The cart item div.
 */
function createCartItemElement(item, itemId) {
  const itemEl = document.createElement('div');
  itemEl.className = 'cart-item';
  itemEl.dataset.id = itemId; // Store the ID

  const priceString = `₱${(item.price * item.quantity).toLocaleString()}.00`;
  
  // NOTE: "Size: Medium | Color: Brown" is hardcoded here
  // because we don't have that data from the modal yet.
  itemEl.innerHTML = `
    <img src="img/${item.imageName}" alt="${item.name}">
    <div class="item-details">
      <h3>${item.name}</h3>
      <p>Size: M | Color: N/A</p> <span class="price">₱${item.price.toLocaleString()}.00 (each)</span>
    </div>
    <div class="item-actions">
      <button class="quantity-btn minus" title="Decrease" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
      <input type="number" min="1" value="${item.quantity}" readonly>
      <button class="quantity-btn plus" title="Increase">+</button>
      <button class="remove-btn" title="Remove Item"><i class="fas fa-trash"></i></button>
    </div>
  `;

  // --- Add Event Listeners for this specific item ---
  
  // Increase quantity
  itemEl.querySelector(".plus").addEventListener("click", () => {
    updateQuantity(itemId, item.quantity + 1);
  });

  // Decrease quantity
  itemEl.querySelector(".minus").addEventListener("click", () => {
    if (item.quantity > 1) { // Don't go below 1
      updateQuantity(itemId, item.quantity - 1);
    }
  });

  // Remove item
  itemEl.querySelector(".remove-btn").addEventListener("click", () => {
    removeItem(itemId);
  });

  return itemEl;
}

/**
 * Updates the totals box in the UI.
 * @param {number} subtotal - The calculated subtotal.
 */
function updateTotals(subtotal) {
  const total = (subtotal > 0) ? subtotal + shippingCost : 0;
  
  subtotalEl.textContent = `₱${subtotal.toLocaleString()}.00`;
  totalEl.textContent = `₱${total.toLocaleString()}.00`;
}

// ==========================================
// CART ACTION FUNCTIONS (Talk to Firebase)
// ==========================================

/**
 * Updates an item's quantity in Firestore.
 * @param {string} itemId - The ID of the item to update.
 * @param {number} newQuantity - The new quantity.
 */
async function updateQuantity(itemId, newQuantity) {
  if (!currentUserId) return;
  const itemRef = doc(db, "users", currentUserId, "cart", itemId);
  try {
    await updateDoc(itemRef, {
      quantity: newQuantity
    });
  } catch (error) {
    console.error("Error updating quantity: ", error);
  }
}

/**
 * Deletes an item from the user's cart in Firestore.
 * @param {string} itemId - The ID of the item to remove.
 */
async function removeItem(itemId) {
  if (!currentUserId) return;
  if (!confirm("Are you sure you want to remove this item?")) return;

  const itemRef = doc(db, "users", currentUserId, "cart", itemId);
  try {
    await deleteDoc(itemRef);
  } catch (error) {
    console.error("Error removing item: ", error);
  }
}

// ==========================================
// PROCEED TO CHECKOUT BUTTON
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.querySelector(".checkout-btn");

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (!currentUserId) {
        alert("Please log in to proceed with checkout.");
        window.location.href = "login.html";
        return;
      }

      // Gather current cart items before redirect
      const cartItems = [];
      const cartItemElements = document.querySelectorAll(".cart-item");

      cartItemElements.forEach(itemEl => {
        const name = itemEl.querySelector("h3").textContent;
        const priceText = itemEl.querySelector(".price").textContent.replace(/[₱,().a-z]/gi, '').trim();
        const price = parseFloat(priceText);
        const quantity = parseInt(itemEl.querySelector("input").value);
        const imgSrc = itemEl.querySelector("img").getAttribute("src");

        cartItems.push({
          name,
          price,
          quantity,
          image: imgSrc
        });
      });

      // Save cart items to localStorage (so checkout_process.js can load it)
      localStorage.setItem("checkoutCart", JSON.stringify(cartItems));

      // Redirect to checkout process page
      window.location.href = "../checkout_process.html";
    });
  }
});
