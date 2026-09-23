import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProducts, imageUrl, placeOrder } from "../api";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [orderMessage, setOrderMessage] = useState(null);

  useEffect(() => {
    getProducts()
      .then((products) => {
        const found = products.find((p) => p._id === id);
        setProduct(found || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleOrder(event) {
    event.preventDefault();
    setPlacing(true);
    setOrderMessage(null);

    try {
      await placeOrder({
        customerName: name,
        customerEmail: email,
        amount: Number(product.price || 0) * Number(quantity || 1),
        status: "pending"
      });
      setOrderMessage({ type: "success", text: "Order placed! We'll contact you at " + email + " to confirm." });
      setName("");
      setEmail("");
      setQuantity(1);
    } catch (err) {
      setOrderMessage({ type: "error", text: err.message });
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <p className="state-message">Loading...</p>;
  if (error) return <p className="state-message state-message--error">{error}</p>;
  if (!product) return <p className="state-message">Product not found. <Link to="/products">Back to products</Link></p>;

  return (
    <div className="product-detail">
      <div className="product-detail__image">
        {product.image ? (
          <img src={imageUrl(product.image)} alt={product.name} />
        ) : (
          <div className="product-card__image-placeholder">No Image</div>
        )}
      </div>

      <div className="product-detail__info">
        <p className="product-card__category">{product.categoryName} / {product.subcategoryName}</p>
        <h1 className="page-title">{product.name}</h1>
        <p className="product-detail__price">${Number(product.price || 0).toFixed(2)}</p>
        {product.text && <p className="product-detail__text">{product.text}</p>}

        <form className="order-form" onSubmit={handleOrder}>
          <h2>Place an Order</h2>

          <label>
            Your Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            Quantity
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </label>

          <p className="order-form__total">Total: ${(Number(product.price || 0) * Number(quantity || 1)).toFixed(2)}</p>

          <button type="submit" disabled={placing}>
            {placing ? "Placing order..." : "Place Order"}
          </button>

          {orderMessage && (
            <p className={"order-form__message order-form__message--" + orderMessage.type}>{orderMessage.text}</p>
          )}
        </form>
      </div>
    </div>
  );
}
