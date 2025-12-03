// API URL
const apiURL = "https://fakestoreapi.com/products";

// Fetch Products (ES6 + async/await)
const fetchProducts = async () => {
    const response = await fetch(apiURL);
    const data = await response.json();
    window.allProducts = data; // save globally
    renderProducts(data);
};

fetchProducts();

// Render Products (Arrow Function + Template Literals + Destructuring)
const renderProducts = (products) => {
    const container = document.getElementById("product-list");
    container.innerHTML = "";

    products.forEach(({ title, price, category, image }) => {
        container.innerHTML += `
            <div class="card">
                <img src="${image}" alt="${title}">
                <h3>${title}</h3>
                <p>Category: ${category}</p>
                <p>Price: $${price}</p>
            </div>
        `;
    });
};

// Sorting Functions
const sortPriceLow = () => {
    const sorted = [...allProducts].sort((a, b) => a.price - b.price);
    renderProducts(sorted);
};

const sortPriceHigh = () => {
    const sorted = [...allProducts].sort((a, b) => b.price - a.price);
    renderProducts(sorted);
};

// Filter by Category
const filterCategory = (category) => {
    const filtered = allProducts.filter(product => product.category === category);
    renderProducts(filtered);
};
