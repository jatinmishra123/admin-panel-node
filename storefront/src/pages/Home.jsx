import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBanners, getCategories, getProducts, imageUrl } from "../api";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getBanners(), getCategories(), getProducts()])
      .then(([bannersData, categoriesData, productsData]) => {
        setBanners(bannersData);
        setCategories(categoriesData);
        setProducts(productsData.slice(0, 8));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="state-message">Loading...</p>;
  if (error) return <p className="state-message state-message--error">{error}</p>;

  return (
    <div className="home">
      {banners.length > 0 && (
        <section className="banner-strip">
          {banners.map((banner) => (
            <a
              key={banner._id}
              href={banner.link || "#"}
              className="banner-strip__item"
              style={{ backgroundImage: banner.image ? `url(${imageUrl(banner.image)})` : undefined }}
            >
              <span>{banner.title}</span>
            </a>
          ))}
        </section>
      )}

      {categories.length > 0 && (
        <section className="section">
          <h2 className="section__title">Shop by Category</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category._id} to={"/products?category=" + encodeURIComponent(category.name)} className="category-chip">
                {category.image ? <img src={imageUrl(category.image)} alt={category.name} /> : null}
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Featured Products</h2>
          <Link to="/products" className="link">View all</Link>
        </div>
        {products.length === 0 ? (
          <p className="state-message">No products yet.</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
