// Photo strip: a side-scrolling row of photos with a Mac OS 7.5-style scroll bar.
// Without JavaScript the strip still works: swipe, use a trackpad, or use the browser's own scroll bar.
(function () {
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init(strip) {
    var slides = strip.querySelector("[data-strip-slides]");
    var bar = strip.querySelector("[data-strip-bar]");
    if (!slides || !bar) return; // one photo: nothing to scroll

    var track = bar.querySelector("[data-strip-track]");
    var knob = bar.querySelector("[data-strip-knob]");
    var prevBtn = bar.querySelector('[data-dir="-1"]');
    var nextBtn = bar.querySelector('[data-dir="1"]');
    var status = strip.querySelector("[data-strip-status]");
    var items = Array.prototype.slice.call(slides.querySelectorAll(".slide"));
    var total = items.length;
    var dn = strip.getAttribute("data-noun");
    var noun = dn === "item" ? "Item" : dn === "video" ? "Video" : "Photo";

    // Hide the browser's own scroll bar and show ours.
    strip.classList.add("has-js");
    bar.hidden = false;

    function maxScroll() {
      return Math.max(0, slides.scrollWidth - slides.clientWidth);
    }
    function padLeft() {
      return parseFloat(window.getComputedStyle(slides).paddingLeft) || 0;
    }
    function clamp(x) {
      return Math.min(maxScroll(), Math.max(0, x));
    }
    // The scroll position that lines slide i up with the left edge.
    function snapPos(i) {
      return clamp(items[i].offsetLeft - padLeft());
    }
    // The slide whose resting position is nearest the current scroll position.
    function currentIndex() {
      var x = slides.scrollLeft;
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < total; i++) {
        var d = Math.abs(snapPos(i) - x);
        if (d <= bestDist) {
          best = i;
          bestDist = d;
        }
      }
      return best;
    }

    function update() {
      var max = maxScroll();
      var trackW = track.clientWidth;
      var ratio = slides.scrollWidth > 0 ? slides.clientWidth / slides.scrollWidth : 1;
      var knobW = Math.max(24, Math.min(trackW, Math.round(trackW * ratio)));
      var knobX = max > 0 ? Math.round((trackW - knobW) * (slides.scrollLeft / max)) : 0;
      knob.style.width = knobW + "px";
      knob.style.transform = "translateX(" + knobX + "px)";
      knob.hidden = max <= 1; // everything fits: show an empty track, like a Mac does
      prevBtn.disabled = slides.scrollLeft <= 1;
      nextBtn.disabled = slides.scrollLeft >= max - 1;
      var cur = currentIndex();
      if (status) status.textContent = noun + " " + (cur + 1) + " of " + total;
      items.forEach(function (el, i) {
        var v = el.querySelector("video");
        if (v && i !== cur && !v.paused) v.pause();
      });
    }

    function scrollToPos(x) {
      slides.scrollTo({ left: x, behavior: reduceMotion ? "auto" : "smooth" });
    }
    function step(dir) {
      var i = Math.min(total - 1, Math.max(0, currentIndex() + dir));
      scrollToPos(snapPos(i));
    }

    // Arrow buttons: one photo at a time.
    prevBtn.addEventListener("click", function () {
      step(-1);
    });
    nextBtn.addEventListener("click", function () {
      step(1);
    });

    // Click the track beside the thumb: one page at a time.
    track.addEventListener("pointerdown", function (e) {
      if (e.target === knob) return;
      var k = knob.getBoundingClientRect();
      var dir = e.clientX < k.left ? -1 : 1;
      scrollToPos(clamp(slides.scrollLeft + dir * slides.clientWidth * 0.9));
    });

    // Drag the thumb to scrub through the photos.
    knob.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      knob.setPointerCapture(e.pointerId);
      var startX = e.clientX;
      var startScroll = slides.scrollLeft;
      var room = track.clientWidth - knob.offsetWidth;
      var max = maxScroll();
      slides.style.scrollSnapType = "none"; // let it move freely while dragging
      slides.style.scrollBehavior = "auto";

      function move(ev) {
        if (room <= 0) return;
        slides.scrollLeft = startScroll + (ev.clientX - startX) * (max / room);
      }
      function up() {
        knob.removeEventListener("pointermove", move);
        knob.removeEventListener("pointerup", up);
        knob.removeEventListener("pointercancel", up);
        slides.style.scrollSnapType = ""; // snaps to the nearest photo on release
        slides.style.scrollBehavior = "";
      }
      knob.addEventListener("pointermove", move);
      knob.addEventListener("pointerup", up);
      knob.addEventListener("pointercancel", up);
    });

    // Keep the thumb in step with swipes, resizing, and photos finishing loading.
    var ticking = false;
    slides.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          update();
        });
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(update);
      ro.observe(slides);
      items.forEach(function (el) {
        ro.observe(el);
      });
    }
    Array.prototype.forEach.call(slides.querySelectorAll("img"), function (img) {
      if (!img.complete) img.addEventListener("load", update);
    });

    update();
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-strip]"), init);
})();
