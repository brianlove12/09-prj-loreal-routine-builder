/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Array to store selected products */
let selectedProducts = [];

/* Array to store conversation history for context */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a professional beauty advisor for L'Oréal products. Help users with skincare, haircare, makeup, fragrance, and beauty routines. Provide helpful, accurate advice based on the conversation context. Only answer questions related to beauty, skincare, haircare, makeup, and wellness topics.",
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
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
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
    /* Make request to OpenAI API with full conversation history */
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
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

      chatWindow.innerHTML += `<div class="message assistant-message"><div class="message-label">Your Personalized Routine</div><div class="routine-content">${routineMessage}</div></div>`;
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
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
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
    /* Make request to OpenAI API with full conversation history */
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
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

      chatWindow.innerHTML += `<div class="message assistant-message">${assistantMessage}</div>`;
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
