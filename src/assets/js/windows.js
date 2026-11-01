// Mac OS 8-style window behaviour.
//  - Only the window in front is "active" (it shows its stripes); click a window to bring it forward.
//  - The collapse box, or a double-click on the title bar, rolls the window up to its title bar (windowshade).
//  - On a desktop browser, drag a window by its title bar. An outline moves with the pointer and the
//    window follows when you let go, like Mac OS 8.
// Without JavaScript the windows simply stay put and open.
(function () {
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canDrag = window.matchMedia("(min-width: 52rem) and (hover: hover) and (pointer: fine)");
  var wins = Array.prototype.slice.call(document.querySelectorAll(".window"));
  if (!wins.length) return;

  var front = 2; // z-index of the window in front

  function activate(win) {
    wins.forEach(function (w) {
      w.classList.toggle("is-inactive", w !== win);
    });
    win.style.zIndex = ++front;
  }

  function pauseVideos(el) {
    Array.prototype.forEach.call(el.querySelectorAll("video"), function (v) {
      if (!v.paused) v.pause();
    });
  }

  function setup(win, index) {
    var bar = win.querySelector(":scope > .titlebar");
    var body = win.querySelector(":scope > .winbody");
    if (!bar || !body) return;

    var heading = bar.querySelector("h1, h2");
    var title = heading ? heading.textContent.trim() : "window";
    if (!body.id) body.id = "winbody-" + index;

    // Collapse box (windowshade), added here so it only exists when it works.
    var box = document.createElement("button");
    box.type = "button";
    box.className = "collapsebox";
    box.setAttribute("aria-controls", body.id);
    box.setAttribute("aria-expanded", "true");
    box.setAttribute("aria-label", "Collapse " + title);
    bar.appendChild(box);

    var busy = false;
    function toggle() {
      if (busy) return;
      var shaded = win.classList.contains("is-shaded");
      var animate = !reduceMotion && typeof body.animate === "function";

      if (!shaded) {
        pauseVideos(body);
        box.setAttribute("aria-expanded", "false");
        box.setAttribute("aria-label", "Expand " + title);
        if (!animate) {
          win.classList.add("is-shaded");
          return;
        }
        busy = true;
        var h = body.offsetHeight;
        body.style.overflow = "hidden";
        var roll = body.animate([{ height: h + "px" }, { height: "0px" }], {
          duration: 180,
          easing: "ease-in",
          fill: "forwards",
        });
        roll.onfinish = function () {
          win.classList.add("is-shaded");
          roll.cancel();
          body.style.overflow = "";
          busy = false;
        };
      } else {
        box.setAttribute("aria-expanded", "true");
        box.setAttribute("aria-label", "Collapse " + title);
        win.classList.remove("is-shaded");
        if (!animate) return;
        busy = true;
        var full = body.offsetHeight;
        body.style.overflow = "hidden";
        var unroll = body.animate([{ height: "0px" }, { height: full + "px" }], {
          duration: 180,
          easing: "ease-out",
        });
        unroll.onfinish = function () {
          body.style.overflow = "";
          busy = false;
        };
      }
    }

    box.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });
    bar.addEventListener("dblclick", function (e) {
      if (e.target.closest("a, button")) return;
      toggle();
    });

    // Bring the window forward when it is clicked anywhere.
    win.addEventListener(
      "pointerdown",
      function () {
        if (win.classList.contains("is-inactive")) activate(win);
      },
      true
    );

    // Dragging, with an outline like Mac OS 8.
    bar.addEventListener("pointerdown", function (e) {
      if (!canDrag.matches || e.button !== 0 || e.target.closest("a, button")) return;
      e.preventDefault();
      activate(win);

      var rect = win.getBoundingClientRect();
      var ox = parseFloat(win.getAttribute("data-dx")) || 0;
      var oy = parseFloat(win.getAttribute("data-dy")) || 0;
      var pageW = document.documentElement.clientWidth;
      var pageH = document.documentElement.scrollHeight;
      var left = rect.left + window.scrollX - ox; // where the window would sit with no offset
      var top = rect.top + window.scrollY - oy;
      var menu = document.querySelector(".menubar");
      var minY = (menu ? menu.offsetHeight : 22) + 4; // never under the menu bar
      // Keep a handle of the title bar on the page.
      var minDx = 80 - rect.width - left;
      var maxDx = pageW - 80 - left;
      var minDy = minY - top;
      var maxDy = pageH - 30 - top;

      var outline = document.createElement("div");
      outline.className = "drag-outline";
      outline.style.cssText =
        "left:" + rect.left + "px;top:" + rect.top + "px;width:" + rect.width + "px;height:" + rect.height + "px";
      document.body.appendChild(outline);
      document.body.classList.add("is-dragging");
      bar.setPointerCapture(e.pointerId);

      var startX = e.clientX;
      var startY = e.clientY;
      var dx = ox;
      var dy = oy;

      function clamp(v, lo, hi) {
        return Math.min(hi, Math.max(lo, v));
      }
      function move(ev) {
        dx = clamp(ox + ev.clientX - startX, minDx, maxDx);
        dy = clamp(oy + ev.clientY - startY, minDy, maxDy);
        outline.style.transform = "translate(" + (dx - ox) + "px," + (dy - oy) + "px)";
      }
      function up() {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
        outline.remove();
        document.body.classList.remove("is-dragging");
        win.setAttribute("data-dx", dx);
        win.setAttribute("data-dy", dy);
        win.style.setProperty("--dx", dx + "px");
        win.style.setProperty("--dy", dy + "px");
      }
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
  }

  wins.forEach(setup);
  // The window in front at the start: the one marked data-front, or the first.
  // On a desktop browser the windows overlap and the topmost one starts in front. Elsewhere the first
  // window below the sticky note starts in front, so the top of the page is not all grey.
  var plain = wins.filter(function (w) {
    return !w.classList.contains("sticky");
  });
  var start = canDrag.matches ? document.querySelector(".window[data-front]") : null;
  activate(start || plain[0] || wins[0]);

  // If the screen stops allowing drags (narrow window, rotated phone), put windows back in place.
  function resetIfNeeded() {
    if (canDrag.matches) return;
    wins.forEach(function (w) {
      w.removeAttribute("data-dx");
      w.removeAttribute("data-dy");
      w.style.removeProperty("--dx");
      w.style.removeProperty("--dy");
    });
  }
  if (canDrag.addEventListener) canDrag.addEventListener("change", resetIfNeeded);
  else if (canDrag.addListener) canDrag.addListener(resetIfNeeded);
})();
