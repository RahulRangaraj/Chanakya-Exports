/* Chanakya Exports — interactions */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Sticky header background on scroll ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var body = document.body;
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Stat count-up ---- */
  var stats = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
    if (reduced) { el.textContent = target.toFixed(dec); return; }
    var dur = 1500, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(step);
  }
  if (stats.length) {
    if (!("IntersectionObserver" in window) || reduced) {
      stats.forEach(function (s) { animateCount(s); });
    } else {
      var sio = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      stats.forEach(function (s) { sio.observe(s); });
    }
  }

  /* ---- Products scrollspy nav ---- */
  var prodLinks = document.querySelectorAll(".prodnav a");
  if (prodLinks.length && "IntersectionObserver" in window) {
    var map = {};
    prodLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          prodLinks.forEach(function (a) { a.classList.remove("active"); });
          if (map[e.target.id]) map[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll(".product-block").forEach(function (b) { spy.observe(b); });
  }

  /* ---- Quote form ---- */
  var form = document.getElementById("quote-form");
  if (form) {
    var statusEl = form.querySelector(".form-status");
    function setFieldError(field, msg) {
      var wrap = field.closest(".field");
      if (!wrap) return;
      wrap.classList.toggle("invalid", !!msg);
      var err = wrap.querySelector(".err");
      if (err) err.textContent = msg || "";
    }
    function validate() {
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (f) {
        var val = (f.value || "").trim();
        if (!val) { setFieldError(f, "This field is required."); ok = false; }
        else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setFieldError(f, "Enter a valid email address."); ok = false;
        } else { setFieldError(f, ""); }
      });
      return ok;
    }
    form.querySelectorAll("[required]").forEach(function (f) {
      f.addEventListener("blur", function () {
        var val = (f.value || "").trim();
        if (!val) setFieldError(f, "This field is required.");
        else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) setFieldError(f, "Enter a valid email address.");
        else setFieldError(f, "");
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.className = "form-status";
      if (!validate()) {
        var firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }
      var btn = form.querySelector("[type=submit]");
      var original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "Sending…";

      var action = form.getAttribute("action") || "";
      var isPlaceholder = action.indexOf("YOUR_FORM_ID") !== -1 || action === "";

      if (isPlaceholder) {
        // No backend configured yet — simulate success for demo/preview.
        setTimeout(function () {
          btn.disabled = false; btn.innerHTML = original;
          statusEl.textContent = "Thank you! Your enquiry has been received. (Demo mode — connect a Formspree endpoint to receive real emails.)";
          statusEl.classList.add("show", "ok");
          form.reset();
        }, 900);
        return;
      }

      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (res) {
        btn.disabled = false; btn.innerHTML = original;
        if (res.ok) {
          statusEl.textContent = "Thank you! Your enquiry has been sent. Our export team will reply within one business day.";
          statusEl.classList.add("show", "ok");
          form.reset();
        } else {
          statusEl.textContent = "Sorry, something went wrong. Please email us directly at the address above.";
          statusEl.classList.add("show", "bad");
        }
      }).catch(function () {
        btn.disabled = false; btn.innerHTML = original;
        statusEl.textContent = "Network error. Please email us directly at the address above.";
        statusEl.classList.add("show", "bad");
      });
    });
  }

  /* ---- Async image decode (keeps scroll smooth on image-heavy pages) ---- */
  document.querySelectorAll("img").forEach(function (im) {
    if (!im.hasAttribute("decoding")) im.setAttribute("decoding", "async");
  });

  /* ---- Footer year ---- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
