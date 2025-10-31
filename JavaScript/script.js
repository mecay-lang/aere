// ==========================================
// IMPORTS
// ==========================================
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, query, orderBy, where,
  doc, getDoc, setDoc, updateDoc, increment, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// FIREBASE AUTHENTICATION
// ==========================================
const navIconsContainer = document.querySelector('.nav-icons');
const originalLoginButton = document.querySelector('.login-btn');

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (originalLoginButton) originalLoginButton.style.display = 'none';
    if (!document.getElementById('logout-btn')) {
      const logoutButton = document.createElement('button');
      logoutButton.id = 'logout-btn';
      logoutButton.className = 'login-btn';
      logoutButton.innerText = 'Logout';
      logoutButton.onclick = () => {
        signOut(auth).then(() => alert('You have been logged out.'))
          .catch((error) => console.error('Signout error:', error));
      };
      navIconsContainer.appendChild(logoutButton);
    }
  } else {
    if (originalLoginButton) originalLoginButton.style.display = 'block';
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) logoutButton.remove();
  }
});

// ==========================================
// STATE & ELEMENT SELECTORS (with fallbacks)
// ==========================================
let allProducts = [];
let currentCategory = 'all';
let currentColor = 'all';
let currentSort = 'default';
let currentSearch = '';
let currentModalProduct = null;

const searchBtn = document.getElementById("search-btn");
const searchBar = document.getElementById("search-bar");
const sortSelect = document.getElementById("sort-select");
const productContainer = document.querySelector(".products");
const categoryBtn = document.getElementById("category-btn");
const colorBtn = document.getElementById("color-btn");

const modal = document.getElementById("product-modal");
const closeBtn = document.querySelector('.close') || document.querySelector('.close-btn');
const modalImg = document.getElementById("modal-img");
const modalName = document.getElementById("modal-name");
const modalPrice = document.getElementById("modal-price");
const favoriteIcon = document.querySelector(".favorite-icon") || null;
// --- NEW: Selector for the variant gallery ---
const variantGallery = document.querySelector(".variant-gallery");

// ------------------------------------------
// Utility: safe querySelectorAll (returns empty NodeList if none)
// ------------------------------------------
function qAll(sel, root = document) {
  try { return root.querySelectorAll(sel) || []; }
  catch (e) { return []; }
}

// ==========================================
// PRODUCT DISPLAY & FILTERING LOGIC
// ==========================================
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card fade-in';

  const priceString = `₱${product.price.toFixed(2)}`;

  card.innerHTML = `
    <img src="img/${product.imageName}" alt="${product.name}">
    <div class="product-info">
      <p class="product-name">${product.name}</p>
      <p class="price">${priceString}</p>
    </div>
  `;

  card.addEventListener('click', async () => {
    // 1. Populate modal text/price info
    if (modalImg) modalImg.src = `img/${product.imageName}`;
    if (modalName) modalName.textContent = product.name;
    if (modalPrice) modalPrice.textContent = priceString;
    currentModalProduct = product;

    // --- NEW: DYNAMIC VARIANT LOGIC ---
    if (variantGallery) {
      // Clear old variants
      variantGallery.innerHTML = '';
      
      // Get the base image name (e.g., "p1" from "p1.jpg")
      const baseImageName = product.imageName.split('.')[0];
      const extension = product.imageName.split('.')[1] || 'jpg'; // e.g., 'jpg'

      // Create 3 variants (main, _2, _3)
      for (let i = 1; i <= 3; i++) {
        const variantImg = document.createElement('img');
        
        // Build the image name
        let imgName = '';
        if (i === 1) {
          imgName = `${baseImageName}.${extension}`; // e.g., p1.jpg
        } else {
          imgName = `${baseImageName}_${i}.${extension}`; // e.g., p1_2.jpg, p1_3.jpg
        }

        variantImg.src = `img/${imgName}`;
        variantImg.alt = `Variant ${i}`;
        variantImg.className = 'variant';
        
        if (i === 1) {
          variantImg.classList.add('active'); // Make the first one active
        }

        // Add the click listener to THIS new variant
        variantImg.addEventListener('click', () => {
          // Remove active from all siblings
          qAll('.variant', variantGallery).forEach(v => v.classList.remove('active'));
          // Add active to this one
          variantImg.classList.add('active');
          // Update the main modal image
          if (modalImg) modalImg.src = variantImg.src;
        });

        variantGallery.appendChild(variantImg);
      }
    }
    // --- END OF VARIANT LOGIC ---


    // 3. Check favorites status
    try {
      if (auth && auth.currentUser && favoriteIcon) {
        const user = auth.currentUser;
        const favRef = doc(db, "users", user.uid, "favorites", product.id);
        const docSnap = await getDoc(favRef);
        if (docSnap.exists()) favoriteIcon.classList.add("active");
        else favoriteIcon.classList.remove("active");
      } else if (favoriteIcon) {
        favoriteIcon.classList.remove("active");
      }
    } catch (err) {
      console.error('Fav check error', err);
    }

    // 4. Show the modal
    if (modal) {
      modal.style.display = "flex";
      modal.setAttribute('aria-hidden', 'false');
    }
  });

  productContainer.appendChild(card);
}

function renderProducts() {
  if (!productContainer) return; // Guard clause
  productContainer.innerHTML = '';

  let filteredProducts = allProducts.slice();

  if (currentSearch) {
    const searchTerm = currentSearch.toLowerCase();
    filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
  }
  if (currentCategory !== 'all') filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
  if (currentColor !== 'all') filteredProducts = filteredProducts.filter(p => p.color === currentColor);

  if (currentSort === 'price') filteredProducts.sort((a,b) => a.price - b.price);
  else if (currentSort === 'popularity') filteredProducts.sort((a,b) => b.popularity - a.popularity);
  else filteredProducts.sort((a,b) => a.name.localeCompare(b.name));

  if (filteredProducts.length === 0) {
    productContainer.innerHTML = "<p>No products match your filters.</p>";
    return;
  }

  filteredProducts.forEach(product => createProductCard(product));
}

async function fetchAllProducts() {
  if (!productContainer) return; // Guard clause
  productContainer.innerHTML = "<p>Loading products...</p>";
  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    allProducts = [];
    querySnapshot.forEach((docSnap) => {
      allProducts.push({ ...docSnap.data(), id: docSnap.id });
    });
    renderProducts();
  } catch (error) {
    console.error("Error fetching all products: ", error);
    productContainer.innerHTML = "<p>Error loading products. Please try again later.</p>";
  }
}

// ==========================================
// EVENT LISTENERS (guarded)
// ==========================================
if (searchBar) {
  searchBar.addEventListener("input", () => {
    currentSearch = searchBar.value.trim();
    renderProducts();
  });
}
if (searchBtn) {
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    currentSearch = searchBar ? searchBar.value.trim() : '';
    renderProducts();
  });
}
if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderProducts();
  });
}
// --- NEW: MODAL BUY NOW BUTTON ---
if (modal) {
  const buyNowBtn = modal.querySelector(".buy-btn");
  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", () => {
      if (!currentModalProduct) return;

      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to buy this item!");
        window.location.href = 'login.html';
        return;
      }

      // 1. Store the ID of the single product we want to buy
      sessionStorage.setItem('buyNowProductId', currentModalProduct.id);

      // 2. Redirect to the checkout page
      window.location.href = 'checkout_process.html';
    });
  }
}
document.querySelectorAll('a[data-category]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    currentCategory = e.currentTarget.dataset.category;
    if (categoryBtn) categoryBtn.textContent = currentCategory === 'all' ? 'Category' : currentCategory;
    renderProducts();
  });
});
document.querySelectorAll('a[data-color]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    currentColor = e.currentTarget.dataset.color;
    if (colorBtn) colorBtn.textContent = currentColor === 'all' ? 'Color' : currentColor;
    renderProducts();
  });
});

// close modal (supports .close or .close-btn)
if (closeBtn) closeBtn.addEventListener("click", () => {
  if (modal) { modal.style.display = "none"; modal.setAttribute('aria-hidden','true'); }
});
window.addEventListener("click", (e) => { if (modal && e.target === modal) { modal.style.display = "none"; modal.setAttribute('aria-hidden','true'); } });

// favorite toggle (only if favoriteIcon exists)
if (favoriteIcon) {
  favoriteIcon.addEventListener("click", async () => {
    if (!currentModalProduct) return;
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to save favorites!");
      window.location.href = 'login.html';
      return;
    }
    const favRef = doc(db, "users", user.uid, "favorites", currentModalProduct.id);
    try {
      if (favoriteIcon.classList.contains("active")) {
        await deleteDoc(favRef);
        favoriteIcon.classList.remove("active");
      } else {
        await setDoc(favRef, {
          productId: currentModalProduct.id,
          name: currentModalProduct.name,
          price: currentModalProduct.price,
          imageName: currentModalProduct.imageName,
          addedAt: new Date()
        });
        favoriteIcon.classList.add("active");
      }
    } catch (error) {
      console.error("Error updating favorites: ", error);
    }
  });
}

// --- DELETED old static variant listener ---

// add-to-cart button inside modal (guarded)
if (modal) {
  const addCartBtn = modal.querySelector(".add-cart-btn");
  if (addCartBtn) {
    addCartBtn.addEventListener("click", async () => {
      if (!currentModalProduct) return;
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to add items to your cart!");
        window.location.href = 'login.html';
        return;
      }
      
      // --- IMPORTANT: Use the current MAIN image for the cart ---
      // If you want to add the *selected variant*, you'd read `modalImg.src`
      // For now, we'll add the main product.
      const mainImageName = currentModalProduct.imageName;
      // If you wanted to add the selected variant, you'd do:
      // const selectedImageSrc = modalImg.src.split('/').pop();

      const cartItemRef = doc(db, "users", user.uid, "cart", currentModalProduct.id);
      
      try {
        const docSnap = await getDoc(cartItemRef);
        if (docSnap.exists()) {
          await updateDoc(cartItemRef, { quantity: increment(1) });
          alert("Added one more to your cart!");
        } else {
          await setDoc(cartItemRef, {
            productId: currentModalProduct.id,
            name: currentModalProduct.name,
            price: currentModalProduct.price,
            imageName: mainImageName, // Use the main product image
            quantity: 1
          });
          alert("Product added to cart!");
        }
      } catch (error) {
        console.error("Error adding to cart: ", error);
        alert("Error adding item. Please try again.");
      }
    });
  }
}

// fade-in on scroll (unchanged)
window.addEventListener("scroll", () => {
  const currentFadeElems = document.querySelectorAll(".fade-in");
  currentFadeElems.forEach(elem => {
    const rect = elem.getBoundingClientRect();
    if (rect.top < window.innerHeight - 50) elem.classList.add("visible");
  });
});

// HERO slideshow (FIXED: path is relative to index.html)
const hero = document.querySelector('.hero');
const heroImages = ['img/background1.jpg','img/background2.jpg','img/background3.jpg'];
let currentIndex = 0;
function changeHeroBackground() {
  if (!hero) return;
  hero.classList.add('fade-out');
  setTimeout(() => {
    hero.style.setProperty('--bg-image', `url(${heroImages[currentIndex]})`);
    hero.style.backgroundImage = `url(${heroImages[currentIndex]})`;
    hero.classList.remove('fade-out');
  }, 800);
  currentIndex = (currentIndex + 1) % heroImages.length;
}

// initial load
fetchAllProducts();
if (hero) {
  hero.style.backgroundImage = `url(${heroImages[0]})`;
  hero.style.setProperty('--bg-image', `url(${heroImages[0]})`);
  setInterval(changeHeroBackground, 5000);

}
