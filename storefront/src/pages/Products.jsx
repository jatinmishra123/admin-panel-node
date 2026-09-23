import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCategories, getProducts, getSubcategories } from "../api";
import ProductCard from "../components/ProductCard";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([getProducts(), getCategories(), getSubcategories()])
      .then(([productsData, categoriesData, subcategoriesData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
        setSubcategories(subcategoriesData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedCategory = searchParams.get("category") || "";
  const selectedSubcategory = searchParams.get("subcategory") || "";

  const visibleSubcategories = useMemo(
    () => subcategories.filter((sub) => !selectedCategory || sub.categoryName === selectedCategory),
    [subcategories, selectedCategory]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (selectedCategory && product.categoryName !== selectedCategory) return false;
      if (selectedSubcategory && product.subcategoryName !== selectedSubcategory) return false;
      return true;
    });
  }, [products, selectedCategory, selectedSubcategory]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "category") next.delete("subcategory");
    setSearchParams(next);
  }

  if (loading) return <p className="state-message">Loading...</p>;
  if (error) return <p className="state-message state-message--error">{error}</p>;

  return (
    <div className="products-page">
      <h1 className="page-title">All Products</h1>

      <div className="filters">
        <select value={selectedCategory} onChange={(e) => updateFilter("category", e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category.name}>{category.name}</option>
          ))}
        </select>

        <select value={selectedSubcategory} onChange={(e) => updateFilter("subcategory", e.target.value)} disabled={!selectedCategory}>
          <option value="">All Subcategories</option>
          {visibleSubcategories.map((sub) => (
            <option key={sub._id} value={sub.name}>{sub.name}</option>
          ))}
        </select>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="state-message">No products match this filter.</p>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
