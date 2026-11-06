/* The Control Strip, after Mac OS 9: a small bar of modules along the bottom of the desktop, with a tab that
   rolls it away. It only exists on desktop browsers; a phone gets none of it (window.macSound still works there,
   but only the windows' zip sound uses it). Settings are remembered with localStorage when it is allowed. */
(function () {
  "use strict";

  var desktop = window.matchMedia("(min-width: 52rem) and (hover: hover) and (pointer: fine)");
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function get(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function set(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private window: fine, it just won't be remembered */ }
  }

  /* ---------- Sound: one volume (0 to 7) for the movies and for the zip ---------- */

  var MAX = 7;
  var level = parseInt(get("cs-volume"), 10);
  if (isNaN(level) || level < 0 || level > MAX) level = MAX;

  var actx = null;
  function context() {
    if (!actx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { actx = new Ctx(); } catch (e) { return null; }
    }
    if (actx.state === "suspended" && actx.resume) actx.resume();
    return actx;
  }

  // The window "zip": a short burst of noise through a sweeping filter with a ratchet in it. Rolling a window up
  // sweeps down, unrolling sweeps up. Made with the Web Audio API, so there is no sound file to load.
  function zip(direction) {
    if (!level || reduceMotion) return;
    var c = context();
    if (!c) return;
    var t = c.currentTime;
    var length = 0.2;
    var frames = Math.ceil(c.sampleRate * length);
    var buffer = c.createBuffer(1, frames, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    var source = c.createBufferSource();
    source.buffer = buffer;

    var filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 3;
    var down = direction !== "up";
    filter.frequency.setValueAtTime(down ? 5200 : 700, t);
    filter.frequency.exponentialRampToValueAtTime(down ? 600 : 5200, t + length);

    // The teeth of the zipper: the loudness chops up and down about seventy times a second.
    var amp = c.createGain();
    amp.gain.value = 0.5;
    var teeth = c.createOscillator();
    teeth.type = "square";
    teeth.frequency.value = 72;
    var depth = c.createGain();
    depth.gain.value = 0.5;
    teeth.connect(depth);
    depth.connect(amp.gain);

    var master = c.createGain();
    var peak = 0.32 * (level / MAX);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(peak, t + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, t + length);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    master.connect(c.destination);
    source.start(t);
    teeth.start(t);
    source.stop(t + length);
    teeth.stop(t + length);
  }

  function applyVolume(video) {
    video.volume = level / MAX;
    video.muted = level === 0;
  }
  function applyVolumeAll() {
    Array.prototype.forEach.call(document.querySelectorAll("video"), applyVolume);
  }
  // Videos that are made later (a movie window opened from its template) pick the volume up as they load.
  document.addEventListener("loadedmetadata", function (e) {
    if (e.target && e.target.tagName === "VIDEO") applyVolume(e.target);
  }, true);

  window.macSound = {
    zip: zip,
    get level() { return level; }
  };

  function setLevel(n) {
    level = Math.max(0, Math.min(MAX, n));
    set("cs-volume", String(level));
    applyVolumeAll();
  }
  applyVolumeAll();

  if (!desktop.matches) return;

  /* ---------- The strip ---------- */

  var machineUrls = [];
  try {
    machineUrls = JSON.parse(document.getElementById("machine-urls").textContent);
  } catch (e) { /* no list: the random module just stays quiet */ }
  var home = document.body.getAttribute("data-home") || "/";

  var SVG = function (inner, cls) {
    return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true" focusable="false"' +
      (cls ? ' class="' + cls + '"' : "") + ">" + inner + "</svg>";
  };
  var ICONS = {
    sound: SVG(
      '<path d="M2.5 6.5h3l4-3.5v10l-4-3.5h-3z" fill="#fff" stroke="#000"/>' +
      '<path class="w1" d="M11.5 6v4M13.5 4.5v7" stroke="#000" fill="none"/>' +
      '<path class="w2" d="M11.5 6v4" stroke="#000" fill="none"/>' +
      '<path class="mute" d="M11 5l4 6M15 5l-4 6" stroke="#c00" fill="none"/>', "ic-sound"),
    desk: SVG(
      '<rect x="1.5" y="2.5" width="13" height="9" fill="#6464a0" stroke="#000"/>' +
      '<path d="M3 4h1v1H3zM6 4h1v1H6zM9 4h1v1H9zM12 4h1v1h-1zM4 7h1v1H4zM7 7h1v1H7zM10 7h1v1h-1z" fill="#cdf"/>' +
      '<path d="M5.5 12.5h5v2h-5z" fill="#ccc" stroke="#000"/>'),
    random: SVG(
      '<rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="#fff" stroke="#000"/>' +
      '<path d="M4 4h2v2H4zM10 4h2v2h-2zM7 7h2v2H7zM4 10h2v2H4zM10 10h2v2h-2z" fill="#000"/>'),
    view: SVG(
      '<rect x="1.5" y="1.5" width="5" height="5" fill="#9bd" stroke="#000"/>' +
      '<rect x="9.5" y="1.5" width="5" height="5" fill="#9bd" stroke="#000"/>' +
      '<rect x="1.5" y="9.5" width="5" height="5" fill="#9bd" stroke="#000"/>' +
      '<rect x="9.5" y="9.5" width="5" height="5" fill="#9bd" stroke="#000"/>'),
    date: SVG(
      '<rect x="2.5" y="3.5" width="11" height="10" fill="#fff" stroke="#000"/>' +
      '<rect x="2.5" y="3.5" width="11" height="3" fill="#c33" stroke="#000"/>' +
      '<path d="M4 8h2v1H4zM7 8h2v1H7zM10 8h2v1h-2zM4 10h2v1H4zM7 10h2v1H7zM10 10h2v1h-2z" fill="#444"/>' +
      '<path d="M5 2v2M11 2v2" stroke="#000"/>'),
    look: SVG(
      '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#000"/>' +
      '<rect x="2" y="2" width="6" height="6" fill="#99c"/>' +
      '<rect x="8" y="2" width="6" height="6" fill="#c99"/>' +
      '<rect x="2" y="8" width="6" height="6" fill="#9c9"/>' +
      '<rect x="8" y="8" width="6" height="6" fill="#ec8"/>')
  };

  var DESKS = [
    ["", "Finder Faces"],
    ["pinstripe", "Pinstripe"],
    ["dither", "Gray Dither"],
    ["sky", "Sky Blue"],
    ["teal", "Teal"],
    ["graphite", "Graphite"],
    ["black", "Black"]
  ];
  var LOOKS = [
    ["", "Lavender"],
    ["blue", "Blue"],
    ["graphite", "Graphite"],
    ["green", "Green"],
    ["orange", "Tangerine"]
  ];
  var VIEWS = [
    ["icons", "as Icons"],
    ["name", "by Name"],
    ["year", "by Year"]
  ];

  var strip = document.createElement("div");
  strip.className = "cstrip";
  strip.setAttribute("role", "toolbar");
  strip.setAttribute("aria-label", "Control Strip");
  strip.innerHTML =
    '<div class="cs-wrap"><div class="cs-modules"></div></div>' +
    '<button type="button" class="cs-tab" aria-expanded="true" aria-label="Hide the Control Strip">' +
    '<svg viewBox="0 0 8 10" width="8" height="10" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><polygon points="6,1 6,9 2,5" fill="#000"/></svg>' +
    "</button>";
  var modules = strip.querySelector(".cs-modules");
  var tab = strip.querySelector(".cs-tab");

  var pop = document.createElement("div");
  pop.className = "cs-pop";
  pop.hidden = true;

  var openMod = null; // the module button whose popup is showing

  function addModule(id, label, icon) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "cs-mod";
    b.setAttribute("data-mod", id);
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = icon;
    modules.appendChild(b);
    return b;
  }

  var bSound = addModule("sound", "Sound", ICONS.sound);
  var bDesk = addModule("desk", "Desktop Pattern", ICONS.desk);
  var bRandom = addModule("random", "Random Machine", ICONS.random);
  var bView = addModule("view", "Collection View", ICONS.view);
  var bDate = addModule("date", "Date", ICONS.date);
  var bLook = addModule("look", "Highlight Color", ICONS.look);
  [bSound, bDesk, bView, bDate, bLook].forEach(function (b) {
    b.setAttribute("aria-haspopup", "true");
    b.setAttribute("aria-expanded", "false");
  });

  function soundIcon() {
    var svg = bSound.querySelector("svg");
    svg.setAttribute("data-level", level === 0 ? "mute" : level <= 4 ? "low" : "high");
    bSound.title = level === 0 ? "Sound: muted" : "Sound: volume " + level;
  }
  soundIcon();

  /* ---------- Popups ---------- */

  function closePop(returnFocus) {
    if (!openMod) return;
    openMod.setAttribute("aria-expanded", "false");
    openMod.classList.remove("is-open");
    pop.hidden = true;
    pop.innerHTML = "";
    var m = openMod;
    openMod = null;
    if (returnFocus) m.focus();
  }

  function place(button) {
    var r = button.getBoundingClientRect();
    pop.style.left = "0px";
    pop.style.bottom = "auto";
    var w = pop.offsetWidth;
    var left = Math.max(4, Math.min(r.left, window.innerWidth - w - 8));
    pop.style.left = left + "px";
    pop.style.bottom = window.innerHeight - r.top + 1 + "px";
  }

  function menuItem(label, checked, onPick, swatchClass, swatchAttr, swatchValue) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "cs-item";
    b.setAttribute("role", "menuitemradio");
    b.setAttribute("aria-checked", checked ? "true" : "false");
    if (swatchClass) {
      var s = document.createElement("span");
      s.className = swatchClass;
      s.setAttribute(swatchAttr, swatchValue);
      b.appendChild(s);
    }
    b.appendChild(document.createTextNode(label));
    b.addEventListener("click", function () {
      onPick();
      closePop(true);
    });
    return b;
  }

  function show(button, build) {
    if (openMod === button) { closePop(true); return; }
    closePop(false);
    pop.innerHTML = "";
    pop.className = "cs-pop";
    build(pop);
    pop.hidden = false;
    openMod = button;
    button.setAttribute("aria-expanded", "true");
    button.classList.add("is-open");
    place(button);
    var first = pop.querySelector("[aria-checked=true], [aria-pressed=true], .cs-item, .cs-notch");
    if (first) first.focus();
  }

  function buildSound(p) {
    p.classList.add("cs-vol");
    p.setAttribute("role", "group");
    p.setAttribute("aria-label", "Sound volume");
    var col = document.createElement("div");
    col.className = "cs-notches";
    var label = document.createElement("div");
    label.className = "cs-vol-label";
    function refresh() {
      Array.prototype.forEach.call(col.children, function (n) {
        var v = parseInt(n.getAttribute("data-level"), 10);
        n.classList.toggle("is-on", v > 0 && v <= level);
        n.setAttribute("aria-pressed", v === level ? "true" : "false");
      });
      label.textContent = level === 0 ? "Muted" : "Volume " + level;
      soundIcon();
    }
    for (var v = MAX; v >= 0; v--) {
      var n = document.createElement("button");
      n.type = "button";
      n.className = "cs-notch";
      n.setAttribute("data-level", String(v));
      n.setAttribute("aria-label", v === 0 ? "Mute" : "Volume " + v);
      n.addEventListener("click", function (e) {
        setLevel(parseInt(e.currentTarget.getAttribute("data-level"), 10));
        refresh();
        zip("up");
      });
      col.appendChild(n);
    }
    p.appendChild(col);
    p.appendChild(label);
    refresh();
  }

  function buildDesk(p) {
    p.setAttribute("role", "menu");
    p.setAttribute("aria-label", "Desktop Pattern");
    var cur = root.getAttribute("data-desk") || "";
    DESKS.forEach(function (d) {
      p.appendChild(menuItem(d[1], cur === d[0], function () {
        if (d[0]) root.setAttribute("data-desk", d[0]); else root.removeAttribute("data-desk");
        set("cs-desk", d[0]);
      }, "cs-swatch desk-sw", "data-desk", d[0]));
    });
  }

  function buildLook(p) {
    p.setAttribute("role", "menu");
    p.setAttribute("aria-label", "Highlight Color");
    var cur = root.getAttribute("data-hilite") || "";
    LOOKS.forEach(function (d) {
      p.appendChild(menuItem(d[1], cur === d[0], function () {
        if (d[0]) root.setAttribute("data-hilite", d[0]); else root.removeAttribute("data-hilite");
        set("cs-hilite", d[0]);
      }, "cs-swatch look-sw", "data-hilite", d[0]));
    });
  }

  function buildView(p) {
    p.setAttribute("role", "menu");
    p.setAttribute("aria-label", "View the Collection");
    var cur = get("cs-view") || "icons";
    VIEWS.forEach(function (v) {
      p.appendChild(menuItem(v[1], cur === v[0], function () {
        set("cs-view", v[0]);
        if (document.querySelector(".finder .icons")) applyView(v[0]);
        else window.location.href = home; // the Collection window is on the home page
      }));
    });
  }

  function buildDate(p) {
    p.classList.add("cs-date");
    var now = new Date();
    var day = document.createElement("div");
    day.className = "cs-date-day";
    day.textContent = now.toLocaleDateString(undefined, { weekday: "long" });
    var full = document.createElement("div");
    full.textContent = now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    var time = document.createElement("div");
    time.className = "cs-date-time";
    time.textContent = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    p.appendChild(day);
    p.appendChild(full);
    p.appendChild(time);
  }

  /* ---------- The Collection view: icons, or a list by name or by year ---------- */

  var originalOrder = null;
  function applyView(mode) {
    var ul = document.querySelector(".finder .icons");
    if (!ul) return;
    if (!originalOrder) originalOrder = Array.prototype.slice.call(ul.children);
    var items = originalOrder.slice(); // the shelf is already in order of year
    if (mode === "name") {
      items.sort(function (a, b) {
        return a.querySelector(".name").textContent.localeCompare(b.querySelector(".name").textContent, undefined, { numeric: true, sensitivity: "base" });
      });
    }
    items.forEach(function (li) { ul.appendChild(li); });
    ul.classList.toggle("is-list", mode === "name" || mode === "year");
    var view = ul.closest("[data-vs-view]");
    if (view) view.scrollTop = 0;
    window.dispatchEvent(new Event("resize")); // so the scroll bar measures again
  }

  /* ---------- Random machine ---------- */

  function randomMachine() {
    if (!machineUrls.length) return;
    var here = window.location.pathname.replace(/\/?$/, "/");
    var others = machineUrls.filter(function (u) { return u.replace(/\/?$/, "/") !== here; });
    var pool = others.length ? others : machineUrls;
    window.location.href = pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------- Wiring ---------- */

  bSound.addEventListener("click", function () { show(bSound, buildSound); });
  bDesk.addEventListener("click", function () { show(bDesk, buildDesk); });
  bView.addEventListener("click", function () { show(bView, buildView); });
  bDate.addEventListener("click", function () { show(bDate, buildDate); });
  bLook.addEventListener("click", function () { show(bLook, buildLook); });
  bRandom.addEventListener("click", function () { closePop(false); randomMachine(); });

  document.addEventListener("pointerdown", function (e) {
    if (openMod && !pop.contains(e.target) && !e.target.closest(".cs-mod")) closePop(false);
  });
  document.addEventListener("keydown", function (e) {
    if (!openMod) return;
    if (e.key === "Escape") { e.preventDefault(); closePop(true); return; }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    var items = Array.prototype.slice.call(pop.querySelectorAll("button"));
    if (!items.length) return;
    var i = items.indexOf(document.activeElement);
    // The volume column runs from loud at the top to mute at the bottom, like the menus, so both go top to bottom.
    var next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    e.preventDefault();
    items[next].focus();
  });
  window.addEventListener("resize", function () { if (openMod) place(openMod); });

  // The tab: click to roll the strip away or back; drag it along the bottom edge to dock it left or right.
  function setCollapsed(c) {
    strip.classList.toggle("is-collapsed", c);
    tab.setAttribute("aria-expanded", c ? "false" : "true");
    tab.setAttribute("aria-label", c ? "Show the Control Strip" : "Hide the Control Strip");
    set("cs-collapsed", c ? "1" : "0");
    if (c) closePop(false);
  }
  function setDock(side) {
    strip.setAttribute("data-dock", side);
    set("cs-dock", side);
  }

  var drag = null;
  var justDragged = false;
  tab.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    var r = strip.getBoundingClientRect();
    drag = { startX: e.clientX, grab: e.clientX - r.left, width: r.width, moved: false, id: e.pointerId };
    tab.setPointerCapture(e.pointerId);
  });
  tab.addEventListener("pointermove", function (e) {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.startX) < 5) return;
    if (!drag.moved) { drag.moved = true; closePop(false); strip.classList.add("is-dragging"); }
    var left = Math.max(0, Math.min(e.clientX - drag.grab, window.innerWidth - drag.width));
    strip.style.left = left + "px";
    strip.style.right = "auto";
  });
  function endDrag(e) {
    if (!drag) return;
    var d = drag;
    drag = null;
    try { tab.releasePointerCapture(d.id); } catch (err) { /* already released */ }
    if (d.moved) {
      strip.classList.remove("is-dragging");
      var r = strip.getBoundingClientRect();
      var side = r.left + r.width / 2 < window.innerWidth / 2 ? "left" : "right";
      strip.style.left = "";
      strip.style.right = "";
      setDock(side);
      justDragged = true; // the click that ends a drag is not a request to roll the strip away
      window.setTimeout(function () { justDragged = false; }, 60);
    }
  }
  tab.addEventListener("pointerup", endDrag);
  tab.addEventListener("pointercancel", endDrag);
  tab.addEventListener("click", function () {
    if (justDragged) return;
    setCollapsed(!strip.classList.contains("is-collapsed"));
  });

  setDock(get("cs-dock") === "right" ? "right" : "left");
  strip.classList.toggle("is-collapsed", get("cs-collapsed") === "1");
  if (strip.classList.contains("is-collapsed")) {
    tab.setAttribute("aria-expanded", "false");
    tab.setAttribute("aria-label", "Show the Control Strip");
  }

  document.body.appendChild(strip);
  document.body.appendChild(pop);

  var savedView = get("cs-view");
  if (savedView === "name" || savedView === "year") applyView(savedView);
})();
