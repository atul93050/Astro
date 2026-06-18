/* =====================
   HEADER & MOBILE MENU JS
   ===================== */

const mobileMenu = document.getElementById("mobileMenu");
const overlay = document.getElementById("overlay");

/* OPEN MENU */
document.getElementById("openMenu").onclick = () => {
  mobileMenu.classList.add("active");
  overlay.classList.add("active");
  document.body.classList.add("menu-open");
};

/* CLOSE MENU */
function closeMenu() {
  mobileMenu.classList.remove("active");
  overlay.classList.remove("active");
  document.body.classList.remove("menu-open");
}

document.getElementById("closeMenu").onclick = closeMenu;
overlay.onclick = closeMenu;

/* SUBMENU TOGGLE */
document.querySelectorAll(".has-submenu > a").forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const parent = this.parentElement;
    const siblings = parent.parentElement.children;

    Array.from(siblings).forEach(item => {
      if (item !== parent) {
        item.classList.remove("active");
        item.querySelectorAll(".has-submenu").forEach(inner => {
          inner.classList.remove("active");
        });
      }
    });

    parent.classList.toggle("active");
  });
});

/* HIDE MEGA DROPDOWNS ON SCROLL */
window.addEventListener('scroll', function () {
  var megas = document.querySelectorAll('.dropdown.dropdown-mega');
  if (window.scrollY > 50) {
    megas.forEach(function (el) { el.style.display = 'none'; });
  } else {
    megas.forEach(function (el) { el.style.display = ''; });
  }
});
