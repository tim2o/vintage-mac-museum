// Mac OS 8-style window behaviour.
//  - Only the window in front is "active" (it shows its stripes); click a window to bring it forward.
//  - The collapse box, or a double-click on the title bar, rolls the window up to its title bar (windowshade).
//  - On a desktop browser, drag a window by its title bar. An outline moves with the pointer and the
//    window follows when you let go, like Mac OS 8.
// This is all for a desktop browser (a wide screen with a mouse or trackpad). On a phone or tablet the windows
// are plain, fixed boxes and the About, Checklist and Videos links go to pages of their own.
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
    if (!canDrag.matches) return;
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

    // In Mac OS, rolling a window up leaves every other window where it is. A window that sits in the page's
    // layout (not one floating over it) keeps the space it had while it is rolled up: the room its body
    // took is held as a bottom margin, grown and shrunk in step with the roll so nothing below it moves.
    var reserved = 0; // the space being held, in px
    function inFlow() {
      return window.getComputedStyle(win).position !== "absolute";
    }

    var busy = false;
    function toggle() {
      if (busy) return;
      var shaded = win.classList.contains("is-shaded");
      var animate = !reduceMotion && typeof body.animate === "function";

      if (window.macSound) window.macSound.zip(shaded ? "up" : "down");
      if (!shaded) {
        pauseVideos(body);
        box.setAttribute("aria-expanded", "false");
        box.setAttribute("aria-label", "Expand " + title);
        var flow = inFlow();
        var before = win.offsetHeight;
        win.classList.add("is-shaded"); // measured only; nothing is drawn in between
        reserved = flow ? before - win.offsetHeight : 0;
        if (!animate) {
          if (reserved) win.style.marginBottom = reserved + "px";
          return;
        }
        win.classList.remove("is-shaded");
        busy = true;
        var h = body.offsetHeight;
        body.style.overflow = "hidden";
        var timing = { duration: 180, easing: "ease-in", fill: "forwards" };
        var roll = body.animate([{ height: h + "px" }, { height: "0px" }], timing);
        var hold = reserved
          ? win.animate([{ marginBottom: "0px" }, { marginBottom: reserved + "px" }], timing)
          : null;
        roll.onfinish = function () {
          win.classList.add("is-shaded");
          if (reserved) win.style.marginBottom = reserved + "px";
          roll.cancel();
          if (hold) hold.cancel();
          body.style.overflow = "";
          busy = false;
        };
      } else {
        box.setAttribute("aria-expanded", "true");
        box.setAttribute("aria-label", "Collapse " + title);
        var held = reserved;
        reserved = 0;
        win.classList.remove("is-shaded");
        win.style.marginBottom = "";
        if (!animate) return;
        busy = true;
        var full = body.offsetHeight;
        body.style.overflow = "hidden";
        var timing2 = { duration: 180, easing: "ease-out" };
        var unroll = body.animate([{ height: "0px" }, { height: full + "px" }], timing2);
        // Give back the held space in step with the unroll.
        if (held) win.animate([{ marginBottom: held + "px" }, { marginBottom: "0px" }], timing2);
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
      if (e.target.closest("a, button, .zoombox")) return;
      toggle();
    });

    // Zoom box: toggles between the window's own size and the size of its contents (as big as will fit in the
    // part of the desktop you are looking at, clear of the menu bar and the desktop icons). Click again to put
    // it back.
    var zoom = bar.querySelector(".zoombox");
    if (zoom) {
      zoom.removeAttribute("aria-hidden");
      zoom.setAttribute("role", "button");
      zoom.setAttribute("tabindex", "0");
      zoom.setAttribute("aria-label", "Zoom " + title);
      zoom.setAttribute("aria-pressed", "false");
      var before = null;
      var place = function (dx, dy) {
        win.setAttribute("data-dx", dx);
        win.setAttribute("data-dy", dy);
        win.style.setProperty("--dx", dx + "px");
        win.style.setProperty("--dy", dy + "px");
      };
      var toggleZoom = function () {
        if (win.classList.contains("is-shaded")) {
          box.click(); // a rolled-up window is unrolled first
          return;
        }
        var view = win.querySelector("[data-vs-view]");
        activate(win);
        if (before) {
          win.style.width = before.width;
          place(before.dx, before.dy);
          if (view) {
            view.style.maxHeight = before.maxHeight;
            view.style.height = before.height;
          }
          before = null;
          win.classList.remove("is-zoomed");
          zoom.setAttribute("aria-pressed", "false");
          return;
        }
        var menu = document.querySelector(".menubar");
        var deskIcons = document.querySelector(".desk-icons");
        var top = (menu ? menu.offsetHeight : 22) + 8;
        var left = 12;
        var right = document.documentElement.clientWidth - 12;
        if (deskIcons && window.getComputedStyle(deskIcons).display !== "none") {
          right = deskIcons.getBoundingClientRect().left - 12;
        }
        var maxW = right - left;
        var room = window.innerHeight - top - 40; // 40: clear of the Control Strip
        var r = win.getBoundingClientRect();
        before = {
          width: win.style.width,
          dx: parseFloat(win.getAttribute("data-dx")) || 0,
          dy: parseFloat(win.getAttribute("data-dy")) || 0,
          maxHeight: view ? view.style.maxHeight : "",
          height: view ? view.style.height : "",
        };

        // The standard size is the size of the contents, as in Mac OS: just big enough to show everything,
        // or as big as the desktop allows if everything will not fit.
        var slides = win.querySelector("[data-strip-slides]");
        var grid = win.querySelector(".icons");
        // The list takes the height it needs, so the window can be measured.
        var natural = function () {
          view.style.maxHeight = "none";
          view.style.height = "auto";
          var content = view.scrollHeight;
          return { content: content, chrome: win.getBoundingClientRect().height - content };
        };
        var targetW;
        if (slides) {
          // A strip of photos or videos: wide enough to show one whole slide.
          win.style.width = maxW + "px";
          var first = slides.querySelector(".slide");
          var cs = window.getComputedStyle(slides);
          var frame = win.getBoundingClientRect().width - slides.clientWidth;
          var peek = win.querySelector(".strip-multi") ? 28 : 0; // room the strip leaves for the next slide
          targetW = first
            ? first.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + frame + peek + 2
            : maxW;
        } else if (grid && view) {
          // A grid of icons: the narrowest window, no narrower than now, in which every icon fits on screen.
          var from = Math.min(r.width, maxW);
          targetW = maxW;
          for (var i = 0; i <= 12; i++) {
            win.style.width = from + ((maxW - from) * i) / 12 + "px";
            var n0 = natural();
            if (n0.content + n0.chrome <= room) {
              targetW = from + ((maxW - from) * i) / 12;
              break;
            }
          }
        } else {
          // Anything else: as wide as its contents want to be.
          win.style.width = "max-content";
          targetW = win.getBoundingClientRect().width;
          // Text and forms wrap, so only a movie is allowed to grow past its usual width.
          if (!win.hasAttribute("data-movie-window")) targetW = Math.min(targetW, r.width);
        }
        targetW = Math.max(320, Math.min(targetW, maxW));
        win.style.width = Math.ceil(targetW) + "px";
        if (view) {
          var n = natural();
          view.style.height = Math.max(120, Math.min(n.content, room - n.chrome)) + "px";
        }

        // Stay where it is, unless that would put part of it off the screen.
        var r2 = win.getBoundingClientRect();
        var nx = Math.max(left, Math.min(r2.left, right - r2.width));
        var ny = Math.max(top, Math.min(r2.top, window.innerHeight - 40 - r2.height));
        place(before.dx + (nx - r2.left), before.dy + (ny - r2.top));
        win.classList.add("is-zoomed");
        zoom.setAttribute("aria-pressed", "true");
      };
      zoom.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleZoom();
      });
      zoom.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleZoom();
        }
      });
    }

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
      if (!canDrag.matches || e.button !== 0 || e.target.closest("a, button, .zoombox")) return;
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

    // Size box: drag the bottom-right corner to resize the window. As in Mac OS 8, an outline shows the
    // new size while you drag and the window takes it when you let go. The scrolling list inside takes
    // up the change in height.
    var grow = win.querySelector("[data-growbox]");
    var view = win.querySelector("[data-vs-view]");
    if (grow && view) {
      grow.classList.add("is-live");
      grow.addEventListener("pointerdown", function (e) {
        if (!canDrag.matches || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        activate(win);
        var rect = win.getBoundingClientRect();
        var viewH = view.clientHeight;
        var minW = 320;
        var maxW = document.documentElement.clientWidth - rect.left - 8;
        var minH = rect.height - viewH + 120; // keep a few rows of icons showing
        var outline = document.createElement("div");
        outline.className = "drag-outline";
        outline.style.cssText =
          "left:" + rect.left + "px;top:" + rect.top + "px;width:" + rect.width + "px;height:" + rect.height + "px";
        document.body.appendChild(outline);
        document.body.classList.add("is-dragging");
        grow.setPointerCapture(e.pointerId);
        var startX = e.clientX;
        var startY = e.clientY;
        var w = rect.width;
        var h = rect.height;
        function move(ev) {
          w = Math.min(maxW, Math.max(minW, rect.width + ev.clientX - startX));
          h = Math.max(minH, rect.height + ev.clientY - startY);
          outline.style.width = w + "px";
          outline.style.height = h + "px";
        }
        function up() {
          grow.removeEventListener("pointermove", move);
          grow.removeEventListener("pointerup", up);
          grow.removeEventListener("pointercancel", up);
          outline.remove();
          document.body.classList.remove("is-dragging");
          win.style.width = w + "px";
          view.style.maxHeight = "none";
          view.style.height = Math.max(120, viewH + h - rect.height) + "px";
        }
        grow.addEventListener("pointermove", move);
        grow.addEventListener("pointerup", up);
        grow.addEventListener("pointercancel", up);
      });
    }
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
    // The words come from the icon (data-popup-heading, data-popup-text); an empty text leaves out the second line.
    h3.textContent = trigger.getAttribute("data-popup-heading") || "Coming soon";
    text.appendChild(h3);
    var more = trigger.getAttribute("data-popup-text");
    if (more === null) more = title + " aren't on the shelf yet. Check back later.";
    if (more) {
      var p = document.createElement("p");
      p.textContent = more;
      text.appendChild(p);
    }
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
      if (canDrag.matches) openPopup(t);
    });
  });

  // The Apple menu in the menu bar: click or tap to open, click elsewhere or press Esc to close.
  var appleMenu = document.querySelector(".menu-apple");
  if (appleMenu) {
    var appleBtn = appleMenu.querySelector(".menu-logo");
    var setApple = function (open) {
      appleMenu.classList.toggle("is-open", open);
      appleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    };
    appleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setApple(!appleMenu.classList.contains("is-open"));
    });
    document.addEventListener("click", function (e) {
      if (!appleMenu.contains(e.target)) setApple(false);
    });
    appleMenu.addEventListener("click", function (e) {
      var item = e.target.closest(".dropdown a");
      if (!item) return;
      item.blur(); // so the menu does not stay open through :focus-within
      setApple(false);
      appleMenu.classList.add("is-dismissed");
    });
    appleMenu.addEventListener("mouseleave", function () {
      appleMenu.classList.remove("is-dismissed");
    });
    appleMenu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        setApple(false);
        appleBtn.focus();
      }
    });
  }

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

  // The About, Checklist and Videos windows. None is part of the page until it is opened from the menu bar
  // or a desktop icon: then it is built from its template, so no video is fetched before that, and it is
  // removed again when closed. Each opens over the Collection window, offset a little differently so that
  // several can be seen when they are open together.
  function topmostWindow() {
    var top = null;
    wins.forEach(function (w) {
      if (!top || (parseInt(w.style.zIndex, 10) || 0) >= (parseInt(top.style.zIndex, 10) || 0)) top = w;
    });
    return top;
  }
  function placeWindow(win, inset, drop) {
    if (!canDrag.matches) return;
    var host = document.querySelector(".finder") || document.querySelector(".stack");
    var r = host.getBoundingClientRect();
    var menu = document.querySelector(".menubar");
    var minTop = window.scrollY + (menu ? menu.offsetHeight : 22) + 24;
    win.style.left = r.left + window.scrollX + inset + "px";
    win.style.top = Math.max(r.top + window.scrollY + drop, minTop) + "px";
    win.style.width = r.width - inset * 2 + "px";
  }
  // A movie window is sized to its video (wide or tall, from the video's data-aspect) so the whole picture
  // fits on screen under the menu bar, and sits centred over the Collection window. Each movie is stepped
  // down and across a little from the last so that several can be seen when they are open together.
  function placeMovie(win, step) {
    if (!canDrag.matches) return;
    var host = document.querySelector(".finder") || document.querySelector(".stack");
    var r = host.getBoundingClientRect();
    var menu = document.querySelector(".menubar");
    var menuH = menu ? menu.offsetHeight : 22;
    var bar = win.querySelector(":scope > .titlebar");
    var chrome = (bar ? bar.offsetHeight : 22) + 6; // title bar and window frame
    var video = win.querySelector("video");
    var aspect = (video && parseFloat(video.getAttribute("data-aspect"))) || 16 / 9;
    var offset = step * 28;
    // Top of the window in the viewport; the video then gets the height left below it.
    var topInView = Math.min(Math.max(r.top + 40, menuH + 24), window.innerHeight * 0.3) + offset;
    var maxVideoH = window.innerHeight - topInView - chrome - 24;
    var width = Math.min(r.width - 88, Math.max(240, maxVideoH * aspect + 6));
    win.style.width = width + "px";
    win.style.left = r.left + window.scrollX + (r.width - width) / 2 + offset + "px";
    win.style.top = topInView + window.scrollY + "px";
  }
  // A window that is built from a <template> when it is first asked for and removed when it is closed.
  // place, if given, positions the new window in place of placeWindow.
  function lazyWindow(templateId, inset, drop, onBuild, place) {
    var template = document.getElementById(templateId);
    var win = null;
    function close() {
      if (!win) return;
      var i = wins.indexOf(win);
      if (i > -1) wins.splice(i, 1);
      win.remove(); // this also stops any video that is playing
      win = null;
      var top = topmostWindow();
      if (top) activate(top);
    }
    return {
      available: !!template,
      current: function () {
        return win;
      },
      open: function () {
        if (!template) return null;
        if (!win) {
          win = document.importNode(template.content.firstElementChild, true);
          win.classList.add("is-open");
          (document.querySelector(".stack") || document.body).appendChild(win);
          wins.push(win);
          setup(win, count++);
          var closer = win.querySelector("button.closebox");
          if (closer) closer.addEventListener("click", close);
          if (onBuild) onBuild(win);
          if (place) place(win);
          else placeWindow(win, inset, drop);
          activate(win);
          win.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
        } else {
          if (win.classList.contains("is-shaded")) {
            var box = win.querySelector(".collapsebox");
            if (box) box.click();
          }
          activate(win);
        }
        return win;
      }
    };
  }
  // Some browsers skip the poster of a video built from a template; setting it again loads it.
  function reloadPosters(win) {
    Array.prototype.forEach.call(win.querySelectorAll("video[poster]"), function (v) {
      var src = v.getAttribute("poster");
      v.removeAttribute("poster");
      v.setAttribute("poster", src);
    });
  }
  // "All videos": every montage in one window, side by side.
  var videosWin = lazyWindow("videos-template", 44, 56, function (win) {
    reloadPosters(win);
    if (window.initStrips) window.initStrips(win);
  });
  // One movie window per video, titled with its name, each opened from its own item in the Videos menu.
  var movieWins = Array.prototype.map.call(document.querySelectorAll("template[data-movie-template]"), function (t, i) {
    return lazyWindow(t.id, 0, 0, reloadPosters, function (win) {
      placeMovie(win, i);
    });
  });
  function openMovie(index) {
    var movie = movieWins[index];
    if (!movie) return openVideos();
    var win = movie.open();
    var video = win && win.querySelector("video");
    if (video) video.focus({ preventScroll: true });
  }
  var checklistWin = lazyWindow("checklist-template", 88, 88);
  var aboutWin = lazyWindow("about-template", 120, 40, function (win) {
    if (window.initVScrolls) window.initVScrolls(win);
  });
  // Scroll the strip to video i. The slides only get their real width once their posters have loaded, so
  // keep trying as the layout settles, and stop at once if you scroll the strip yourself.
  function showVideo(win, i) {
    var slides = win.querySelector("[data-strip-slides]");
    var items = slides ? slides.querySelectorAll(".slide") : [];
    var item = items[i];
    if (!item || i === 0) return;
    var pad = parseFloat(window.getComputedStyle(slides).paddingLeft) || 0;
    var ro = null;
    var stop = function () {
      if (ro) ro.disconnect();
      slides.removeEventListener("pointerdown", stop);
      slides.removeEventListener("wheel", stop);
    };
    var go = function () {
      var want = item.offsetLeft - pad;
      if (want <= 0 || slides.scrollWidth <= slides.clientWidth) return false; // not laid out yet
      slides.style.scrollBehavior = "auto";
      slides.scrollLeft = want;
      slides.style.scrollBehavior = "";
      return true;
    };
    if (go()) return;
    slides.addEventListener("pointerdown", stop);
    slides.addEventListener("wheel", stop, { passive: true });
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () {
        if (go()) stop();
      });
      ro.observe(slides);
      Array.prototype.forEach.call(items, function (it) {
        ro.observe(it);
      });
    }
    window.setTimeout(stop, 6000);
  }
  function openVideos(index) {
    var fresh = !videosWin.current();
    var win = videosWin.open();
    if (win && typeof index === "number") showVideo(win, index);
    return fresh;
  }
  var noteWin = lazyWindow("note-template", 250, 70, function (win) {
    if (window.initNotes) window.initNotes(win);
    var cancel = win.querySelector("[data-note-cancel]");
    var closer = win.querySelector("button.closebox");
    if (cancel && closer) cancel.addEventListener("click", function () { closer.click(); });
    // After a note is sent, leave the thank-you showing for a moment and then close the window.
    win.addEventListener("note-sent", function () {
      var send = win.querySelector("[data-note-send]");
      if (send) send.disabled = true;
      window.setTimeout(function () {
        if (closer && closer.isConnected) closer.click();
      }, 1800);
    });
    var field = win.querySelector("textarea");
    if (field) field.focus({ preventScroll: true });
  });
  var spawn = {
    note: { win: noteWin, open: function () { noteWin.open(); } },
    videos: { win: videosWin, open: function () { openVideos(); } },
    movie: { win: { available: movieWins.length > 0 }, open: openMovie },
    checklist: { win: checklistWin, open: function () { checklistWin.open(); } },
    about: { win: aboutWin, open: function () { aboutWin.open(); } },
  };
  // Menu items and desktop icons are ordinary links to pages (what a phone uses). On a desktop browser a
  // click spawns the window instead; from a page that has no templates, it goes to the home page to do so.
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-window]"), function (a) {
    var name = a.getAttribute("data-open-window");
    var item = spawn[name];
    if (!item) return;
    a.addEventListener("click", function (e) {
      if (!canDrag.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      var n = a.getAttribute("data-video");
      var index = n === null ? undefined : parseInt(n, 10);
      if (item.win.available) item.open(index);
      else {
        var home = document.body.getAttribute("data-home") || "/";
        window.location.href = home + "#" + (typeof index === "number" ? "video-" + (index + 1) : name);
      }
    });
  });

  // On a desktop browser a menu title such as Videos only shows its menu, as in Mac OS; you choose what to
  // open from the menu. On a phone, where there are no drop-down menus, the title is still a link.
  Array.prototype.forEach.call(document.querySelectorAll("[data-menu-title]"), function (a) {
    a.addEventListener("click", function (e) {
      if (canDrag.matches) e.preventDefault();
    });
  });

  // Menus other than the Apple menu: close after you pick an item, even with the pointer still over it.
  Array.prototype.forEach.call(document.querySelectorAll(".menu:not(.menu-apple)"), function (m) {
    m.addEventListener("click", function (e) {
      var item = e.target.closest(".dropdown a");
      if (!item) return;
      item.blur();
      m.classList.add("is-dismissed");
    });
    m.addEventListener("mouseleave", function () {
      m.classList.remove("is-dismissed");
    });
  });

  wins.forEach(setup);
  var desktop = canDrag.matches;
  // On a desktop browser the windows overlap and the topmost one starts in front. Elsewhere the first
  // window below the sticky note starts in front, so the top of the page is not all grey.
  var plain = wins.filter(function (w) {
    return !w.classList.contains("sticky");
  });
  var start = canDrag.matches ? document.querySelector(".window[data-front]") : null;
  if (wins.length && desktop) activate(start || plain[0] || wins[0]);
  function openFromHash() {
    var hash = window.location.hash;
    var deepLink = /^#videos?(?:-(\d+))?$/.exec(hash);
    if (desktop && deepLink && deepLink[1] && movieWins.length) openMovie(parseInt(deepLink[1], 10) - 1);
    else if (desktop && deepLink && videosWin.available) openVideos();
    else if (desktop && hash === "#checklist" && checklistWin.available) checklistWin.open();
    else if (desktop && hash === "#about" && aboutWin.available) aboutWin.open();
    else if (desktop && hash === "#note" && noteWin.available) noteWin.open();
    else if (deepLink && deepLink[1]) {
      // The Videos page itself, opened at one video.
      var page = document.getElementById("videos");
      if (page) showVideo(page, parseInt(deepLink[1], 10) - 1);
    }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

  // Windows are built differently for a desktop browser and for a phone. If the browser crosses over
  // (a resized window, a rotated tablet), start the page again so it is built the right way.
  function modeChanged() {
    if (canDrag.matches !== desktop) window.location.reload();
  }
  if (canDrag.addEventListener) canDrag.addEventListener("change", modeChanged);
  else if (canDrag.addListener) canDrag.addListener(modeChanged);
})();
