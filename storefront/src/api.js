const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, options) {
  const response = await fetch(API_URL + path, options);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result.data;
}

export function getCategories() {
  return request("/api/categories");
}

export function getSubcategories() {
  return request("/api/subcategories");
}

export function getProducts() {
  return request("/api/products");
}

export function getBanners() {
  return request("/api/banners");
}

export function getFaqs() {
  return request("/api/faqs");
}

export function getTestimonials() {
  return request("/api/testimonials");
}

export function placeOrder(order) {
  return request("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  });
}

export function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return API_URL + path;
}
