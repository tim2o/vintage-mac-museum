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
  var count = wins.length; // used to give each window body a unique id

  var front = 10; // z-index of the window in front (popups start at 10)

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

  // "Coming soon" windows, opened from the desktop icons. Each one is built here, joins the other
  // windows (drag, collapse, bring forward) and is removed again by its close box or OK button.
  var popups = 0;
  function openPopup(trigger) {
    var key = trigger.getAttribute("data-popup");
    var title = trigger.getAttribute("data-popup-title") || "Coming soon";
    var existing = document.getElementById("popup-" + key);
    if (existing) {
      // Already open: roll it back down if needed and bring it to the front.
      if (existing.classList.contains("is-shaded")) {
        var b = existing.querySelector(".collapsebox");
        if (b) b.click();
      }
      activate(existing);
      var again = existing.querySelector(".btn");
      if (again) again.focus();
      return;
    }

    var win = document.createElement("section");
    win.className = "window popup";
    win.id = "popup-" + key;
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-labelledby", "popup-title-" + key);

    var bar = document.createElement("div");
    bar.className = "titlebar";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "closebox";
    close.setAttribute("aria-label", "Close " + title);
    var h = document.createElement("h2");
    h.id = "popup-title-" + key;
    h.textContent = title;
    bar.appendChild(close);
    bar.appendChild(h);

    var body = document.createElement("div");
    body.className = "winbody";
    var inner = document.createElement("div");
    inner.className = "popup-body";
    var iconSrc = trigger.getAttribute("data-popup-icon");
    if (iconSrc) {
      var pic = document.createElement("img");
      pic.className = "icon";
      pic.src = iconSrc;
      pic.width = 64;
      pic.height = 64;
      pic.alt = "";
      inner.appendChild(pic);
    }
    var text = document.createElement("div");
    text.className = "popup-text";
    var h3 = document.createElement("h3");
    h3.textContent = "Coming soon";
    var p = document.createElement("p");
    p.textContent = title + " aren't on the shelf yet. Check back later.";
    text.appendChild(h3);
    text.appendChild(p);
    inner.appendChild(text);
    var actions = document.createElement("div");
    actions.className = "popup-actions";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "btn btn-default";
    ok.textContent = "OK";
    actions.appendChild(ok);
    body.appendChild(inner);
    body.appendChild(actions);

    win.appendChild(bar);
    win.appendChild(body);

    // Open near the middle of the part of the page you are looking at, a little offset each time.
    document.body.appendChild(win);
    var menu = document.querySelector(".menubar");
    var minY = (menu ? menu.offsetHeight : 22) + 4;
    var left = window.scrollX + Math.max(16, (document.documentElement.clientWidth - 120 - win.offsetWidth) / 2) + (popups % 4) * 26;
    var top = window.scrollY + Math.max(minY + 8, window.innerHeight / 2 - 110) + (popups % 4) * 26;
    popups++;
    win.style.left = left + "px";
    win.style.top = top + "px";

    wins.push(win);
    setup(win, count++);
    activate(win);

    function dismiss() {
      var i = wins.indexOf(win);
      if (i > -1) wins.splice(i, 1);
      win.remove();
      // Hand the front back to the topmost window that is left.
      var topmost = null;
      wins.forEach(function (w) {
        if (!topmost || (parseInt(w.style.zIndex, 10) || 0) >= (parseInt(topmost.style.zIndex, 10) || 0)) topmost = w;
      });
      if (topmost) activate(topmost);
      var back = trigger.closest(".app-menu") ? document.querySelector(".app-menu-button") : trigger;
      if (back) back.focus();
    }
    close.addEventListener("click", dismiss);
    ok.addEventListener("click", dismiss);
    win.addEventListener("keydown", function (e) {
      if (e.key === "Escape") dismiss();
    });
    ok.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-popup]"), function (t) {
    t.addEventListener("click", function () {
      openPopup(t);
    });
  });

  // The Application menu in the menu bar: click to open, click outside or press Esc to close.
  var appMenu = document.querySelector(".app-menu");
  if (appMenu) {
    var appBtn = appMenu.querySelector(".app-menu-button");
    var appList = appMenu.querySelector(".app-list");
    var setOpen = function (open) {
      appList.hidden = !open;
      appBtn.setAttribute("aria-expanded", open ? "true" : "false");
    };
    var items = function () {
      return Array.prototype.slice.call(appList.querySelectorAll("a, button"));
    };
    appBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(appList.hidden);
    });
    document.addEventListener("click", function (e) {
      if (!appMenu.contains(e.target)) setOpen(false);
    });
    appList.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) setOpen(false);
    });
    appMenu.addEventListener("keydown", function (e) {
      var list = items();
      var i = list.indexOf(document.activeElement);
      if (e.key === "Escape" && !appList.hidden) {
        setOpen(false);
        appBtn.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (appList.hidden) setOpen(true);
        var next = e.key === "ArrowDown" ? i + 1 : i - 1;
        list[(next + list.length) % list.length].focus();
      }
    });
  }

  wins.forEach(setup);
  // On a desktop browser the windows overlap and the topmost one starts in front. Elsewhere the first
  // window below the sticky note starts in front, so the top of the page is not all grey.
  var plain = wins.filter(function (w) {
    return !w.classList.contains("sticky");
  });
  var start = canDrag.matches ? document.querySelector(".window[data-front]") : null;
  if (wins.length) activate(start || plain[0] || wins[0]);

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
