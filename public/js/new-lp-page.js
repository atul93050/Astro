
document.addEventListener("DOMContentLoaded", () => {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const summary = item.querySelector(".faq-q");

    summary.addEventListener("click", (e) => {
      e.preventDefault();

      const isOpen = item.hasAttribute("open");

      // Close all FAQs
      faqItems.forEach((faq) => {
        faq.removeAttribute("open");
      });

      // Open clicked FAQ if it was closed
      if (!isOpen) {
        item.setAttribute("open", "");
      }
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {

  const logoRow = document.querySelector(".logo-row");
  if (!logoRow) return;

  // Duplicate logos
  logoRow.innerHTML += logoRow.innerHTML;

  // JS styles
  logoRow.style.display = "flex";
  logoRow.style.alignItems = "center";
  logoRow.style.gap = "60px";
  logoRow.style.width = "max-content";
  logoRow.style.userSelect = "none";

  const parent = logoRow.parentElement;

  parent.style.overflow = "hidden";
  parent.style.position = "relative";
  parent.style.cursor = "grab";
  parent.style.userSelect = "none";

  let position = 0;
  let speed = 1;
  let paused = false;

  // Auto slider
  function animate() {

    if (!paused) {
      position -= speed;

      if (Math.abs(position) >= logoRow.scrollWidth / 2) {
        position = 0;
      }

      logoRow.style.transform = `translateX(${position}px)`;
    }

    requestAnimationFrame(animate);
  }

  // Hover pause
  parent.addEventListener("mouseenter", () => paused = true);
  parent.addEventListener("mouseleave", () => paused = false);

  // Drag functionality
  let isDragging = false;
  let startX = 0;
  let startPosition = 0;

  parent.addEventListener("mousedown", (e) => {

    isDragging = true;
    paused = true;

    startX = e.clientX;
    startPosition = position;

    parent.style.cursor = "grabbing";

    // prevent text selection
    e.preventDefault();

  });

  window.addEventListener("mouseup", () => {

    isDragging = false;
    paused = false;

    parent.style.cursor = "grab";

  });

  window.addEventListener("mousemove", (e) => {

    if (!isDragging) return;

    const moveX = e.clientX - startX;

    position = startPosition + moveX;

    logoRow.style.transform = `translateX(${position}px)`;

  });

  animate();

});
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("lead-form");
  if (!form) return;

  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const budget = document.getElementById("budget");
  // const message = document.getElementById("message");
  name.addEventListener("input", function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
  });
  // Only numbers in phone
  phone.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
  });
  const freeDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "aol.com",
    "protonmail.com",
    "gamil.com"
  ];

  // Create error element
  function createErrorElement(field) {

    const error = document.createElement("div");
    error.className = "field-error";

    field.parentNode.appendChild(error);

    return error;
  }

  const errors = {
    name: createErrorElement(name),
    email: createErrorElement(email),
    phone: createErrorElement(phone),
    budget: createErrorElement(budget)
  };

  // Set error
  function setError(field, errorEl, message) {

    field.classList.add("invalid");
    errorEl.textContent = message;

  }

  // Clear error
  function clearError(field, errorEl) {

    field.classList.remove("invalid");
    errorEl.textContent = "";

  }

  // Name validation
  function validateName() {
    const value = name.value.trim();
    if (value.length < 2) {
      setError(name, errors.name, "Enter valid name");
      return false;
    }
    clearError(name, errors.name);
    return true;
  }

  // Email validation
  function validateEmail() {

    const value = email.value.trim().toLowerCase();

    if (!value) {
      setError(email, errors.email, "Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      setError(email, errors.email, "Enter valid email");
      return false;
    }

    const domain = value.split("@")[1];

    if (freeDomains.includes(domain)) {
      setError(email, errors.email, "Use business email");
      return false;
    }

    clearError(email, errors.email);
    return true;
  }

  // Phone validation
  function validatePhone() {

    const value = phone.value.trim();

    const phoneRegex = /^[0-9]{10}$/;

    if (!phoneRegex.test(value)) {
      setError(phone, errors.phone, "Enter valid phone number");
      return false;
    }

    clearError(phone, errors.phone);
    return true;
  }

  // Budget validation
  function validateBudget() {

    if (!budget.value) {
      setError(budget, errors.budget, "Select monthly budget");
      return false;
    }

    clearError(budget, errors.budget);
    return true;
  }

  // Message validation
  // function validateMessage() {
  //   const value = message.value.trim();
  //   if (value.length < 10) {
  //     setError(message, errors.message, "Message must be at least 10 characters");
  //     return false;
  //   }
  //   clearError(message, errors.message);
  //   return true;
  // }

  // Real-time validation
  name.addEventListener("input", validateName);
  email.addEventListener("input", validateEmail);
  phone.addEventListener("input", validatePhone);
  budget.addEventListener("change", validateBudget);
  // message.addEventListener("input", validateMessage);

  // Submit validation
 /* form.addEventListener("submit", function (e) {
    e.preventDefault();
    const nameValid = validateName();
    const emailValid = validateEmail();
    const phoneValid = validatePhone();
    const budgetValid = validateBudget();
    // const messageValid = validateMessage();

    const isValid =
      nameValid &&
      emailValid &&
      phoneValid &&
      budgetValid;

    if (!isValid) {
      return false;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    form.submit();

  });*/
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const nameValid = validateName();
    const emailValid = validateEmail();
    const phoneValid = validatePhone();
    const budgetValid = validateBudget();

    const isValid =
      nameValid &&
      emailValid &&
      phoneValid &&
      budgetValid;

    if (!isValid) {
      return false;
    }
 /*   const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
   // form.submit();
HTMLFormElement.prototype.submit.call(form);*/


const submitBtn = form.querySelector('button[type="submit"]');
submitBtn.disabled = true;
submitBtn.textContent = "Submitting...";

// Remove event listener to avoid loop, then submit
form.removeEventListener('submit', arguments.callee);
form.querySelector('button[type="submit"]').removeAttribute('name');
HTMLFormElement.prototype.submit.call(form);
  });
});