import { Link } from "react-router-dom";
import { imageUrl } from "../api";

export default function ProductCard({ product }) {
  return (
    <Link to={"/products/" + product._id} className="product-card">
      <div className="product-card__image">
        {product.image ? (
          <img src={imageUrl(product.image)} alt={product.name} />
        ) : (
          <div className="product-card__image-placeholder">No Image</div>
        )}
      </div>
      <div className="product-card__body">
        <p className="product-card__category">{product.categoryName}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">${Number(product.price || 0).toFixed(2)}</p>
      </div>
    </Link>
  );
}
