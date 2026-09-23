import { useEffect, useState } from "react";
import { getFaqs } from "../api";

export default function Faq() {
  const [faqs, setFaqs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFaqs()
      .then(setFaqs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="state-message">Loading...</p>;
  if (error) return <p className="state-message state-message--error">{error}</p>;

  return (
    <div className="faq-page">
      <h1 className="page-title">Frequently Asked Questions</h1>

      {faqs.length === 0 ? (
        <p className="state-message">No FAQs published yet.</p>
      ) : (
        <div className="faq-list">
          {faqs.map((faq) => {
            const isOpen = openId === faq._id;
            return (
              <div key={faq._id} className={"faq-item" + (isOpen ? " faq-item--open" : "")}>
                <button type="button" className="faq-item__question" onClick={() => setOpenId(isOpen ? null : faq._id)}>
                  {faq.question}
                  <span className="faq-item__icon">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <p className="faq-item__answer">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
