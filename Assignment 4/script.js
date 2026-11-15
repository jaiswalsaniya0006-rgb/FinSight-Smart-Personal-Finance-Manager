
// Product Details
const products = [
    {
        id: 1,
        name: "Wireless Headphones",
        price: 2499,
        originalPrice: 3499,
        discount: 29,
        description: "High quality wireless headphones.",
        image: "headphones.jpg",
        inStock: true
    },
    {
        id: 2,
        name: "Smart Watch",
        price: 1999,
        originalPrice: 2999,
        discount: 33,
        description: "Smart watch with fitness features.",
        image: "smartwatch.jpg",
        inStock: true
    },
    {
        id: 3,
        name: "Running Shoes",
        price: 1799,
        originalPrice: 2499,
        discount: 28,
        description: "Comfortable shoes for running.",
        image: "shoes.jpg",
        inStock: true
    },
    {
        id: 4,
        name: "Travel Backpack",
        price: 1299,
        originalPrice: 1999,
        discount: 35,
        description: "Spacious backpack for travelling.",
        image: "backpack.jpg",
        inStock: true
    },
    {
        id: 5,
        name: "Digital Camera",
        price: 15999,
        originalPrice: 18999,
        discount: 16,
        description: "Capture beautiful photographs.",
        image: "camera.jpg",
        inStock: true
    },
    {
        id: 6,
        name: "Sunglasses",
        price: 899,
        originalPrice: 1499,
        discount: 40,
        description: "Stylish sunglasses with UV protection.",
        image: "sunglasses.jpg",
        inStock: true
    },
    {
        id: 7,
        name: "Coffee Maker",
        price: 3499,
        originalPrice: 4499,
        discount: 22,
        description: "Make fresh coffee at home.",
        image: "coffee maker.jpg",
        inStock: false
    }
];

// Cart
let cart = [];


// Display Products
function displayProducts() {

    let productList = document.getElementById("productList");

    productList.innerHTML = "";

    products.forEach(function(product) {

        productList.innerHTML += `
            <div class="col-md-6 mb-4">

                <div class="card product-card shadow-sm">

                    <img src="${product.image}" class="card-img-top">

                    <div class="card-body">

                        <h5>${product.name}</h5>

                        <p>${product.description}</p>

                        <h6>₹${product.price}</h6>

                        <del>₹${product.originalPrice}</del>

                        <p class="discount">
                            ${product.discount}% OFF
                        </p>

                        <button
                            class="btn btn-primary"
                            onclick="addToCart(${product.id})"
                            ${product.inStock ? "" : "disabled"}
                        >
                            ${product.inStock ? "Add to Cart" : "Out of Stock"}
                        </button>

                    </div>
                </div>
            </div>
        `;
    });
}


// Add to Cart
function addToCart(id) {

    let product = products.find(function(item) {
        return item.id === id;
    });

    if (!product || !product.inStock) {
        return;
    }

    let existingProduct = cart.find(function(item) {
        return item.id === id;
    });

    if (existingProduct) {

        existingProduct.quantity++;

    } else {

        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });

    }

    displayCart();
}


// Display Cart
function displayCart() {

    let cartItems = document.getElementById("cartItems");

    let grandTotal = document.getElementById("grandTotal");

    cartItems.innerHTML = "";

    let total = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = "Your cart is empty.";
    }

    cart.forEach(function(item) {

        let subtotal = item.price * item.quantity;

        total = total + subtotal;

        cartItems.innerHTML += `
            <div class="cart-item">

                <div class="d-flex align-items-center">

                    <img src="${item.image}">

                    <div class="ms-3">

                        <h6>${item.name}</h6>

                        <p class="mb-1">Price: ₹${item.price}</p>

                        <p class="mb-1">Quantity: ${item.quantity}</p>

                        <p class="mb-1">Subtotal: ₹${subtotal}</p>

                        <button
                            class="btn btn-danger btn-sm"
                            onclick="removeFromCart(${item.id})">
                            Remove
                        </button>

                    </div>
                </div>
            </div>
        `;
    });

    grandTotal.innerHTML = "Grand Total: ₹" + total;
    document.getElementById("checkoutBtn").disabled = cart.length === 0;
}


// Remove from Cart
function removeFromCart(id) {

    cart = cart.filter(function(item) {
        return item.id !== id;
    });

    displayCart();
}


// Initial Functions
displayProducts();
displayCart();

function proceedToCheckout() {

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    alert("Thank you for shopping with us! Your order has been placed.");

    cart = [];

    displayCart();
}
