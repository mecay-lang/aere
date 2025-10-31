// ==========================================
// IMPORTS
// ==========================================
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  doc, getDoc, updateDoc, 
  collection, getDocs, addDoc, 
  deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ELEMENT SELECTORS
// ==========================================
const addressModal = document.getElementById("address-modal");
const setAddressBtn = document.getElementById("set-address-btn");
const closeModal = document.querySelector(".close-modal");
const saveAddressBtn = document.getElementById("save-address-btn");
const addressInput = document.getElementById("address-input");
const userAddressElem = document.getElementById("user-address");
const orderItemsContainer = document.getElementById("order-items");
const subtotalElem = document.getElementById("subtotal");
const totalElem = document.getElementById("total");
const shippingFeeElem = document.getElementById("shipping-fee");
const cancelBtn = document.getElementById("cancel-btn");
const placeOrderBtn = document.getElementById("place-order-btn");

const shippingFee = 120;
let currentUserId = null;
let userSavedAddress = "";
let cartItems = []; // To store items for placing the order
let isBuyNow = false; // --- NEW: Flag to track if this is a "Buy Now" order

// ==========================================
// AUTHENTICATION & DATA LOADING
// ==========================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    loadUserData(currentUserId);
    
    // --- CHANGED: Check for a "Buy Now" item ---
    const buyNowId = sessionStorage.getItem('buyNowProductId');
    
    if (buyNowId) {
      // 1. We are in "Buy Now" mode
      isBuyNow = true;
      sessionStorage.removeItem('buyNowProductId'); // Clear the flag
      loadBuyNowItem(buyNowId);
    } else {
      // 2. We are in "Full Cart" mode
      isBuyNow = false;
      loadCart(currentUserId);
    }
    
  } else {
    document.body.innerHTML = '<h1>Please <a href="login.html">log in</a> to proceed to checkout.</h1>';
  }
});

/**
 * Loads the user's saved address from their Firestore profile.
 */
async function loadUserData(userId) {
  // ... (This function is unchanged)
  const userRef = doc(db, "users", userId);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists() && docSnap.data().address) {
    userSavedAddress = docSnap.data().address;
    userAddressElem.textContent = userSavedAddress;
    setAddressBtn.textContent = "Edit Address";
  } else {
    userAddressElem.textContent = "No address set yet.";
    setAddressBtn.textContent = "Set Delivery Address";
  }
}

/**
 * --- NEW: Loads a SINGLE item for "Buy Now" ---
 */
async function loadBuyNowItem(productId) {
  const productRef = doc(db, "products", productId);
  const docSnap = await getDoc(productRef);

  if (!docSnap.exists()) {
    orderItemsContainer.innerHTML = "<p>Error: Product not found.</p>";
    placeOrderBtn.disabled = true;
    return;
  }

  const item = docSnap.data();
  const itemTotalPrice = item.price * 1; // Quantity is 1
  
  // Set the global cartItems array to just this one item
  cartItems = [{ ...item, id: docSnap.id, quantity: 1 }];

  // Display the single item
  orderItemsContainer.innerHTML = '';
  const div = document.createElement("div");
  div.className = "order-item";
  div.innerHTML = `
    <img src="img/${item.imageName}" alt="${item.name}">
    <div class="item-details">
      <h3>${item.name}</h3>
      <p>Qty: 1</p>
      <p>₱${itemTotalPrice.toFixed(2)}</p>
    </div>
  `;
  orderItemsContainer.appendChild(div);

  // Update totals
  shippingFeeElem.textContent = `₱${shippingFee.toFixed(2)}`;
  subtotalElem.textContent = `₱${itemTotalPrice.toFixed(2)}`;
  totalElem.textContent = `₱${(itemTotalPrice + shippingFee).toFixed(2)}`;
}

/**
 * Loads the user's FULL cart from the /users/{id}/cart subcollection.
 */
async function loadCart(userId) {
  // ... (This function is unchanged)
  const cartRef = collection(db, "users", userId, "cart");
  const querySnapshot = await getDocs(cartRef);
  
  orderItemsContainer.innerHTML = '';
  cartItems = []; 
  let subtotal = 0;

  if (querySnapshot.empty) {
    orderItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    placeOrderBtn.disabled = true;
    return;
  }

  querySnapshot.forEach((doc) => {
    const item = doc.data();
    cartItems.push({ id: doc.id, ...item }); 

    const itemTotalPrice = item.price * item.quantity;
    subtotal += itemTotalPrice;

    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <img src="img/${item.imageName}" alt="${item.name}">
      <div class="item-details">
        <h3>${item.name}</h3>
        <p>Qty: ${item.quantity}</p>
        <p>₱${itemTotalPrice.toFixed(2)}</p>
      </div>
    `;
    orderItemsContainer.appendChild(div);
  });

  // Update totals
  shippingFeeElem.textContent = `₱${shippingFee.toFixed(2)}`;
  subtotalElem.textContent = `₱${subtotal.toFixed(2)}`;
  totalElem.textContent = `₱${(subtotal + shippingFee).toFixed(2)}`;
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Address Modal Logic
// ... (This section is unchanged)
setAddressBtn.addEventListener("click", () => {
  addressModal.style.display = "flex";
  addressInput.value = userSavedAddress;
});

closeModal.addEventListener("click", () => {
  addressModal.style.display = "none";
});

saveAddressBtn.addEventListener("click", async () => {
  const newAddress = addressInput.value.trim();
  if (newAddress && currentUserId) {
    try {
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        address: newAddress 
      });
      userSavedAddress = newAddress;
      userAddressElem.textContent = newAddress;
      setAddressBtn.textContent = "Edit Address";
      addressModal.style.display = "none";
    } catch (error) {
      console.error("Error saving address: ", error);
      alert("Could not save address. Please try again.");
    }
  } else if (!newAddress) {
    alert("Please enter your address!");
  }
});

// Place Order Button
placeOrderBtn.addEventListener("click", async () => {
  const selectedPayment = document.querySelector('input[name="payment"]:checked').value;
  
  if (!userSavedAddress) {
    alert("Please set your delivery address first!");
    return;
  }

  if (cartItems.length === 0) {
    alert("There are no items to order!");
    return;
  }

  try {
    // 1. Create a new order (this works for both modes)
    const ordersRef = collection(db, "orders");
    await addDoc(ordersRef, {
      userId: currentUserId,
      address: userSavedAddress,
      paymentMethod: selectedPayment,
      items: cartItems, 
      subtotal: parseFloat(subtotalElem.textContent.replace('₱', '')),
      shipping: shippingFee,
      total: parseFloat(totalElem.textContent.replace('₱', '')),
      status: "Placed",
      createdAt: serverTimestamp()
    });

    // 2. --- CHANGED: Only clear the cart if it was NOT a "Buy Now" order ---
    if (!isBuyNow) {
      // This was a full cart checkout, so clear the cart.
      for (const item of cartItems) {
        const itemRef = doc(db, "users", currentUserId, "cart", item.id);
        await deleteDoc(itemRef);
      }
    } 
    // If it *was* a "Buy Now" (isBuyNow = true), we skip this, 
    // leaving the user's original cart untouched.

    // 3. Success
    alert(`✅ Order placed successfully!\nPayment Method: ${selectedPayment}`);
    window.location.href = "index.html"; 

  } catch (error) {
    console.error("Error placing order: ", error);
    alert("There was an error placing your order. Please try again.");
  }
});

// Cancel Button Logic
cancelBtn.addEventListener("click", () => {
  // --- CHANGED: Go back to cart or index depending on mode ---
  const confirmCancel = confirm("Are you sure you want to cancel your order?");
  if (confirmCancel) {
    if (isBuyNow) {
      // If it was "Buy Now", just go back to the homepage
      window.location.href = "index.html";
    } else {
      // If it was a full cart, go back to the cart page
      window.location.href = "add_to_cart.html";
    }
  }
});