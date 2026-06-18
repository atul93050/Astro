/* =====================
   PRODUCTS SECTION JS
   Scroll-triggered card entrance animation
   ===================== */

var productObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('card-visible');
      productObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.product-card').forEach(function (card, i) {
  card.style.transitionDelay = (i * 0.12) + 's';
  productObserver.observe(card);
});
