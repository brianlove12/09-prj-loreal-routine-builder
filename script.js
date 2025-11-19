/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Array to store selected products */
let selectedProducts = [];

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
    </div>
  `
    )
    .join("");

  /* Add click handlers to all product cards */
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () =>
      toggleProductSelection(card, products)
    );
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
  chatWindow.innerHTML += `<p><strong>You:</strong> ${userMessage}</p>`;

  /* Clear the input field */
  userInput.value = "";

  try {
    /* Make request to OpenAI API */
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful beauty advisor for L'Oréal products. Help users build skincare and beauty routines.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    /* Parse the response from OpenAI */
    const data = await response.json();

    /* Check if we got a valid response */
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const assistantMessage = data.choices[0].message.content;
      chatWindow.innerHTML += `<p><strong>Assistant:</strong> ${assistantMessage}</p>`;
    } else {
      chatWindow.innerHTML += `<p><strong>Error:</strong> Unable to get response from API</p>`;
    }

    /* Auto-scroll to bottom of chat window */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Display error message if API request fails */
    chatWindow.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
  }
});
