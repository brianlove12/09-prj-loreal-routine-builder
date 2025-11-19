/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const productSearch = document.getElementById("productSearch");
const clearSearchBtn = document.getElementById("clearSearch");
const languageToggle = document.getElementById("languageToggle");
const languageText = document.getElementById("languageText");

/* Cloudflare Worker endpoint - UPDATE THIS WITH YOUR WORKER URL */
const WORKER_ENDPOINT = "https://lorealworker1.balove12.workers.dev/";

/* Array to store selected products */
let selectedProducts = [];

/* Store all products and current filter state */
let allProducts = [];
let currentCategory = "";
let currentSearchTerm = "";

/* Language direction toggle */
languageToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const currentDir = html.getAttribute("dir");

  if (currentDir === "rtl") {
    html.setAttribute("dir", "ltr");
    html.setAttribute("lang", "en");
    languageText.textContent = "LTR";
  } else {
    html.setAttribute("dir", "rtl");
    html.setAttribute("lang", "ar");
    languageText.textContent = "RTL";
  }

  /* Save preference to localStorage */
  localStorage.setItem("textDirection", html.getAttribute("dir"));
});

/* Load saved language direction on page load */
function loadLanguageDirection() {
  const savedDir = localStorage.getItem("textDirection");
  if (savedDir) {
    const html = document.documentElement;
    html.setAttribute("dir", savedDir);
    html.setAttribute("lang", savedDir === "rtl" ? "ar" : "en");
    languageText.textContent = savedDir === "rtl" ? "RTL" : "LTR";
  }
}

/* Load selected products from localStorage on page load */
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
      updateSelectedProductsDisplay();
      /* Update visual state of product cards if they exist */
      selectedProducts.forEach((product) => {
        const card = document.querySelector(
          `[data-product-id="${product.id}"]`
        );
        if (card) {
          card.classList.add("selected");
        }
      });
    } catch (error) {
      console.error("Error loading selected products:", error);
      selectedProducts = [];
    }
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  try {
    localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  } catch (error) {
    console.error("Error saving selected products:", error);
  }
}

/* Format AI response text with better structure */
function formatAIResponse(text) {
  /* Convert markdown-style formatting to HTML */
  let formatted = text
    /* Convert links [text](url) to HTML anchor tags */
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    /* Convert **bold** to <strong> */
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    /* Convert numbered lists */
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    /* Convert bullet points */
    .replace(/^[\-\*]\s+(.+)$/gm, "<li>$1</li>")
    /* Convert line breaks to paragraphs */
    .split("\n\n")
    .map((para) => {
      if (para.includes("<li>")) {
        /* Wrap lists in <ol> or <ul> */
        const isNumbered = /^\d+\./.test(para);
        const listTag = isNumbered ? "ol" : "ul";
        return `<${listTag}>${para}</${listTag}>`;
      }
      return para.trim() ? `<p>${para.trim()}</p>` : "";
    })
    .join("");

  return formatted;
}

/* Array to store conversation history for context */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a professional beauty advisor for L'Oréal products with access to current information. Help users with skincare, haircare, makeup, fragrance, and beauty routines. When providing recommendations, search for the latest product information, reviews, and beauty trends. Always include sources and links when you reference specific information. Provide helpful, accurate, and up-to-date advice. Only answer questions related to beauty, skincare, haircare, makeup, and wellness topics.",
  },
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Filter products based on category and search term */
function filterProducts() {
  let filtered = allProducts;

  /* Filter by category if one is selected */
  if (currentCategory) {
    filtered = filtered.filter(
      (product) => product.category === currentCategory
    );
  }

  /* Filter by search term if one is entered */
  if (currentSearchTerm) {
    const searchLower = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brand.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  /* Show appropriate message if no products match filters */
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found matching your search criteria
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <button class="info-btn" data-product-id="${product.id}" aria-label="View product details">
        <i class="fa-solid fa-info-circle"></i>
      </button>
    </div>
  `
    )
    .join("");

  /* Add click handlers to all product cards */
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      /* Don't toggle selection if clicking the info button */
      if (!e.target.closest(".info-btn")) {
        toggleProductSelection(card, products);
      }
    });
  });

  /* Add click handlers to info buttons */
  const infoButtons = document.querySelectorAll(".info-btn");
  infoButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = Number(button.getAttribute("data-product-id"));
      const product = products.find((p) => p.id === productId);
      showProductModal(product);
    });
  });
}

/* Toggle product selection when card is clicked */
function toggleProductSelection(card, products) {
  /* getAttribute returns a string, so convert to number to match product.id */
  const productId = Number(card.getAttribute("data-product-id"));

  /* Find the full product object from the products array */
  const product = products.find((p) => p.id === productId);

  /* Check if product is already selected */
  const index = selectedProducts.findIndex((p) => p.id === productId);

  if (index === -1) {
    /* Product not selected - add it */
    selectedProducts.push(product);
    card.classList.add("selected");
  } else {
    /* Product already selected - remove it */
    selectedProducts.splice(index, 1);
    card.classList.remove("selected");
  }

  /* Update the selected products display */
  updateSelectedProductsDisplay();

  /* Save to localStorage */
  saveSelectedProducts();
}

/* Update the display of selected products */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<p class="placeholder-message">No products selected yet</p>`;
  } else {
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
        <div class="selected-product-tag">
          <span>${product.name}</span>
          <button class="remove-product" data-product-id="${product.id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `
      )
      .join("");

    /* Add click handlers to remove buttons */
    const removeButtons = document.querySelectorAll(".remove-product");
    removeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const productId = button.getAttribute("data-product-id");
        removeProduct(productId);
      });
    });
  }
}

/* Remove a product from selected products */
function removeProduct(productId) {
  /* Convert productId to number for comparison */
  const numericId = Number(productId);

  /* Remove from selected products array */
  selectedProducts = selectedProducts.filter((p) => p.id !== numericId);

  /* Remove selected class from the product card */
  const card = document.querySelector(`[data-product-id="${numericId}"]`);
  if (card) {
    card.classList.remove("selected");
  }

  /* Update the display */
  updateSelectedProductsDisplay();

  /* Save to localStorage */
  saveSelectedProducts();
}

/* Show product description in modal */
function showProductModal(product) {
  const modal = document.getElementById("productModal");
  const modalBody = document.getElementById("modalBody");

  /* Populate modal with product information */
  modalBody.innerHTML = `
    <div class="modal-product">
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p class="modal-brand">${product.brand}</p>
      <p class="modal-description">${product.description}</p>
    </div>
  `;

  /* Show the modal */
  modal.classList.add("show");
}

/* Close modal when clicking close button or outside modal */
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

modalClose.addEventListener("click", () => {
  modal.classList.remove("show");
});

modal.addEventListener("click", (e) => {
  /* Close if clicking the backdrop (not the modal content) */
  if (e.target === modal) {
    modal.classList.remove("show");
  }
});

/* Close modal with Escape key */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

/* Generate personalized routine from selected products */
const generateRoutineBtn = document.getElementById("generateRoutine");

generateRoutineBtn.addEventListener("click", async () => {
  /* Check if any products are selected */
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `<div class="message system-message">Please select at least one product to generate a routine.</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  /* Prepare the product data to send to OpenAI */
  const productsData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  /* Create the routine generation message */
  const routineRequest = `Create a personalized beauty routine using these products:\n\n${JSON.stringify(
    productsData,
    null,
    2
  )}`;

  /* Add to conversation history */
  conversationHistory.push({
    role: "user",
    content: routineRequest,
  });

  /* Display loading message with typing indicator */
  chatWindow.innerHTML += `<div class="message assistant-message typing-indicator" id="typingIndicator"><span class="typing-dots">Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  /* Add "just a moment" message after a short delay */
  setTimeout(() => {
    const typingMsg = document.getElementById("typingIndicator");
    if (typingMsg) {
      typingMsg.innerHTML = `<span class="typing-dots">Just a moment<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>`;
    }
  }, 2000);

  try {
    /* Make request to Cloudflare Worker instead of OpenAI directly */
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
        /* Enable web search for real-time information */
        store: true,
      }),
    });

    /* Parse the response from OpenAI */
    const data = await response.json();

    /* Check if we got a valid response */
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const routineMessage = data.choices[0].message.content;

      /* Add assistant response to conversation history */
      conversationHistory.push({
        role: "assistant",
        content: routineMessage,
      });

      /* Remove typing indicator */
      const typingIndicator = document.getElementById("typingIndicator");
      if (typingIndicator) {
        typingIndicator.remove();
      }

      /* Format the response for better readability */
      const formattedMessage = formatAIResponse(routineMessage);

      chatWindow.innerHTML += `<div class="message assistant-message"><div class="message-label">Your Personalized Routine</div><div class="routine-content">${formattedMessage}</div></div>`;
    } else {
      /* Remove typing indicator */
      const typingIndicator = document.getElementById("typingIndicator");
      if (typingIndicator) {
        typingIndicator.remove();
      }
      chatWindow.innerHTML += `<div class="message system-message">Unable to generate routine. Please try again.</div>`;
    }

    /* Auto-scroll to bottom of chat window */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Remove typing indicator */
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
    /* Display error message if API request fails */
    chatWindow.innerHTML += `<div class="message system-message">Error: ${error.message}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  /* Load products if not already loaded */
  if (allProducts.length === 0) {
    await loadProducts();
  }

  currentCategory = e.target.value;

  /* Filter and display products based on both category and search */
  const filteredProducts = filterProducts();
  displayProducts(filteredProducts);

  /* Restore selected state for products that were previously selected */
  selectedProducts.forEach((product) => {
    const card = document.querySelector(`[data-product-id="${product.id}"]`);
    if (card) {
      card.classList.add("selected");
    }
  });
});

/* Search products as user types */
productSearch.addEventListener("input", async (e) => {
  currentSearchTerm = e.target.value.trim();

  /* Show/hide clear button */
  clearSearchBtn.style.display = currentSearchTerm ? "flex" : "none";

  /* Load products if not already loaded */
  if (allProducts.length === 0) {
    await loadProducts();
  }

  /* Filter and display products based on both category and search */
  const filteredProducts = filterProducts();
  displayProducts(filteredProducts);

  /* Restore selected state for products that were previously selected */
  selectedProducts.forEach((product) => {
    const card = document.querySelector(`[data-product-id="${product.id}"]`);
    if (card) {
      card.classList.add("selected");
    }
  });
});

/* Clear search input */
clearSearchBtn.addEventListener("click", async () => {
  productSearch.value = "";
  currentSearchTerm = "";
  clearSearchBtn.style.display = "none";

  /* Load products if not already loaded */
  if (allProducts.length === 0) {
    await loadProducts();
  }

  /* Filter and display products based on category only */
  const filteredProducts = filterProducts();
  displayProducts(filteredProducts);

  /* Restore selected state for products that were previously selected */
  selectedProducts.forEach((product) => {
    const card = document.querySelector(`[data-product-id="${product.id}"]`);
    if (card) {
      card.classList.add("selected");
    }
  });

  /* Focus back on search input */
  productSearch.focus();
});

/* Load selected products from localStorage when page loads */
loadSelectedProducts();

/* Load saved language direction when page loads */
loadLanguageDirection();

/* Clear all selected products */
const clearAllBtn = document.getElementById("clearAll");

clearAllBtn.addEventListener("click", () => {
  /* Remove selected class from all product cards */
  document.querySelectorAll(".product-card.selected").forEach((card) => {
    card.classList.remove("selected");
  });

  /* Clear the selected products array */
  selectedProducts = [];

  /* Update display and localStorage */
  updateSelectedProductsDisplay();
  saveSelectedProducts();
});

/* Chat form submission handler - connects to OpenAI API */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* Get user's message from the input field */
  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value;

  /* Display user's message in chat window */
  chatWindow.innerHTML += `<div class="message user-message">${userMessage}</div>`;

  /* Clear the input field */
  userInput.value = "";

  /* Add user message to conversation history */
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  /* Show typing indicator */
  chatWindow.innerHTML += `<div class="message assistant-message typing-indicator" id="chatTypingIndicator"><span class="typing-dots">Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  /* Add "just a moment" message after a short delay */
  setTimeout(() => {
    const typingMsg = document.getElementById("chatTypingIndicator");
    if (typingMsg) {
      typingMsg.innerHTML = `<span class="typing-dots">Just a moment<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>`;
    }
  }, 2000);

  try {
    /* Make request to Cloudflare Worker instead of OpenAI directly */
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
        /* Enable web search for real-time information */
        store: true,
      }),
    });

    /* Parse the response from OpenAI */
    const data = await response.json();

    /* Check if we got a valid response */
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const assistantMessage = data.choices[0].message.content;

      /* Add assistant response to conversation history */
      conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      /* Remove typing indicator */
      const chatTypingIndicator = document.getElementById(
        "chatTypingIndicator"
      );
      if (chatTypingIndicator) {
        chatTypingIndicator.remove();
      }

      /* Format the response for better readability */
      const formattedMessage = formatAIResponse(assistantMessage);

      chatWindow.innerHTML += `<div class="message assistant-message">${formattedMessage}</div>`;
    } else {
      /* Remove typing indicator */
      const chatTypingIndicator = document.getElementById(
        "chatTypingIndicator"
      );
      if (chatTypingIndicator) {
        chatTypingIndicator.remove();
      }
      chatWindow.innerHTML += `<div class="message system-message">Unable to get response from API</div>`;
    }

    /* Auto-scroll to bottom of chat window */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Remove typing indicator */
    const chatTypingIndicator = document.getElementById("chatTypingIndicator");
    if (chatTypingIndicator) {
      chatTypingIndicator.remove();
    }
    /* Display error message if API request fails */
    chatWindow.innerHTML += `<div class="message system-message">Error: ${error.message}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
