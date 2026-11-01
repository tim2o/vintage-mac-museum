// Vertical scroll bar for a window's contents, in the Mac OS 8 style: an arrow box at each end,
// a pale track, and a lavender thumb. Without JavaScript the browser's own scroll bar is used.
(function () {
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init(box) {
    var view = box.querySelector("[data-vs-view]");
    var bar = box.querySelector("[data-vs-bar]");
    if (!view || !bar) return;
    var track = bar.querySelector("[data-vs-track]");
    var knob = bar.querySelector("[data-vs-knob]");
    var up = bar.querySelector('[data-dir="-1"]');
    var down = bar.querySelector('[data-dir="1"]');

    // Hide the browser's own scroll bar and show ours.
    box.classList.add("has-js");
    bar.hidden = false;

    function maxScroll() {
      return Math.max(0, view.scrollHeight - view.clientHeight);
    }
    function update() {
      var max = maxScroll();
      var trackH = track.clientHeight;
      var ratio = view.scrollHeight > 0 ? view.clientHeight / view.scrollHeight : 1;
      var knobH = Math.max(24, Math.min(trackH, Math.round(trackH * ratio)));
      var knobY = max > 0 ? Math.round((trackH - knobH) * (view.scrollTop / max)) : 0;
      knob.style.height = knobH + "px";
      knob.style.transform = "translateY(" + knobY + "px)";
      knob.hidden = max <= 1; // everything fits: show an empty track, like a Mac does
      up.disabled = view.scrollTop <= 1;
      down.disabled = view.scrollTop >= max - 1;
    }
    function scrollBy(dy, smooth) {
      view.scrollBy({ top: dy, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
    }

    // Arrow boxes: a line at a time, and keep going while the button is held down.
    function arrow(btn, dir) {
      var timer = null;
      var delay = null;
      function stop() {
        clearTimeout(delay);
        clearInterval(timer);
        btn.removeEventListener("pointerup", stop);
        btn.removeEventListener("pointercancel", stop);
        btn.removeEventListener("pointerleave", stop);
      }
      btn.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        scrollBy(dir * 40, false);
        delay = setTimeout(function () {
          timer = setInterval(function () {
            scrollBy(dir * 24, false);
          }, 30);
        }, 350);
        btn.addEventListener("pointerup", stop);
        btn.addEventListener("pointercancel", stop);
        btn.addEventListener("pointerleave", stop);
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          scrollBy(dir * 40, false);
        }
      });
    }
    arrow(up, -1);
    arrow(down, 1);

    // Click the track beside the thumb: one page at a time.
    track.addEventListener("pointerdown", function (e) {
      if (e.target === knob) return;
      var k = knob.getBoundingClientRect();
      scrollBy((e.clientY < k.top ? -1 : 1) * view.clientHeight * 0.9, true);
    });

    // Drag the thumb to scrub through the page.
    knob.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      knob.setPointerCapture(e.pointerId);
      var startY = e.clientY;
      var startScroll = view.scrollTop;
      var room = track.clientHeight - knob.offsetHeight;
      var max = maxScroll();
      function move(ev) {
        if (room <= 0) return;
        view.scrollTop = startScroll + (ev.clientY - startY) * (max / room);
      }
      function done() {
        knob.removeEventListener("pointermove", move);
        knob.removeEventListener("pointerup", done);
        knob.removeEventListener("pointercancel", done);
      }
      knob.addEventListener("pointermove", move);
      knob.addEventListener("pointerup", done);
      knob.addEventListener("pointercancel", done);
    });

    // Keep the thumb in step with the wheel, keys, resizing and the window being collapsed.
    var ticking = false;
    view.addEventListener(
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
      ro.observe(view);
      ro.observe(track);
    }
    update();
  }

  // Set up every scroll box under root. Boxes built later (the About window) call this themselves.
  function initAll(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("[data-vscroll]"), init);
  }
  window.initVScrolls = initAll;
  initAll(document);
})();
