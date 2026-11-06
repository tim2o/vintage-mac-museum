// Desktop icons you can move. Drag an icon and it snaps to a grid when you let go (never on top of another
// icon); Shift and the arrow keys move a focused icon one square. Where you leave them is remembered, and
// "Clean Up Icons" in the Control Strip's Desktop Pattern menu puts them back. Desktop browsers only.
(function () {
  "use strict";

  var wide = window.matchMedia("(min-width: 64rem) and (hover: hover) and (pointer: fine)");
  var nav = document.querySelector(".desk-icons");
  if (!nav) return;
  if (!wide.matches) {
    // Resized across the line where the icons appear or go: build the page again.
    var again = function () { if (wide.matches) window.location.reload(); };
    if (wide.addEventListener) wide.addEventListener("change", again); else if (wide.addListener) wide.addListener(again);
    return;
  }

  var icons = Array.prototype.slice.call(nav.querySelectorAll(".desk-icon"));
  if (!icons.length) return;

  var CELL_W = 100;   // a square of the grid: as wide as an icon (6.25rem) ...
  var CELL_H = 112;   // ... and tall enough for the picture and a two-line name
  var EDGE_R = 14;    // gap to the right edge of the screen, as before
  var TOP = 38;       // top of the first row, just below the menu bar
  var KEY = "desk-icons";

  function load() {
    try { return JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    var out = {};
    icons.forEach(function (el) {
      if (el._saved) out[el.getAttribute("data-icon-id")] = [el._col, el._row];
    });
    try { window.localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* not remembered; fine */ }
  }

  function maxRow() { return Math.max(0, Math.floor((window.innerHeight - TOP - 30) / CELL_H)); }
  function maxCol() { return Math.max(0, Math.floor((window.innerWidth - EDGE_R - CELL_W - 8) / CELL_W)); }
  function xOf(col) { return window.innerWidth - EDGE_R - CELL_W - col * CELL_W; } // column 0 is at the right edge
  function yOf(row) { return TOP + row * CELL_H; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function put(el, col, row) {
    el._col = col;
    el._row = row;
    el.style.left = xOf(col) + "px";
    el.style.top = yOf(row) + "px";
  }
  function taken(col, row, except) {
    return icons.some(function (el) { return el !== except && el._col === col && el._row === row; });
  }
  // The free square nearest to the one wanted.
  function nearestFree(col, row, except) {
    col = clamp(col, 0, maxCol());
    row = clamp(row, 0, maxRow());
    if (!taken(col, row, except)) return [col, row];
    var best = null;
    for (var r = 0; r <= maxRow(); r++) {
      for (var c = 0; c <= maxCol(); c++) {
        if (taken(c, r, except)) continue;
        var d = (c - col) * (c - col) * 1.0 + (r - row) * (r - row) * 1.3;
        if (!best || d < best.d) best = { d: d, c: c, r: r };
      }
    }
    return best ? [best.c, best.r] : [col, row];
  }

  // Where the icons start: down the right-hand side in order, with the Trash at the bottom of that column
  // (above the Control Strip when that is docked on the right).
  function defaultCell(el, index) {
    if (el.classList.contains("desk-trash")) {
      var stripOnRight = document.documentElement.getAttribute("data-cs-dock") === "right";
      var bottomGap = stripOnRight ? window.innerHeight * 0.05 + 40 : 24;
      var h = el.offsetHeight || 90;
      return [0, clamp(Math.floor((window.innerHeight - bottomGap - h - TOP) / CELL_H), 0, maxRow())];
    }
    return [0, index];
  }
  function layout(useSaved) {
    var saved = useSaved ? load() : {};
    icons.forEach(function (el) { el._col = el._row = -1; el._saved = false; });
    var order = 0;
    icons.forEach(function (el) {
      var id = el.getAttribute("data-icon-id");
      var cell;
      if (saved[id] && saved[id].length === 2) { cell = saved[id]; el._saved = true; }
      else cell = defaultCell(el, order);
      if (!el.classList.contains("desk-trash")) order++;
      var free = nearestFree(cell[0], cell[1], el);
      put(el, free[0], free[1]);
    });
  }

  nav.classList.add("is-free");
  icons.forEach(function (el) {
    el.setAttribute("draggable", "false");
    Array.prototype.forEach.call(el.querySelectorAll("img"), function (img) { img.setAttribute("draggable", "false"); });
  });
  layout(true);

  /* ---------- Dragging ---------- */

  var drag = null;
  var suppressClick = false;
  icons.forEach(function (el) {
    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.pointerType !== "mouse") return;
      var r = el.getBoundingClientRect();
      drag = { el: el, id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", function (e) {
      if (!drag || drag.el !== el) return;
      if (!drag.moved && Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        el.classList.add("is-dragging");
        document.body.classList.add("is-dragging");
      }
      el.style.left = clamp(e.clientX - drag.dx, 0, window.innerWidth - CELL_W) + "px";
      el.style.top = clamp(e.clientY - drag.dy, 24, window.innerHeight - 40) + "px";
    });
    function finish() {
      if (!drag || drag.el !== el) return;
      var d = drag;
      drag = null;
      try { el.releasePointerCapture(d.id); } catch (err) { /* already released */ }
      if (!d.moved) return;
      el.classList.remove("is-dragging");
      document.body.classList.remove("is-dragging");
      suppressClick = true;
      window.setTimeout(function () { suppressClick = false; }, 60);
      // The square the middle of the icon is over
      var rect = el.getBoundingClientRect();
      var col = Math.round((window.innerWidth - EDGE_R - CELL_W - rect.left) / CELL_W);
      var row = Math.round((rect.top - TOP) / CELL_H);
      var cell = nearestFree(col, row, el);
      put(el, cell[0], cell[1]);
      el._saved = true;
      save();
    }
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", finish);
    // The click that ends a drag must not open the icon.
    el.addEventListener("click", function (e) {
      if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    // Shift and the arrow keys move a focused icon one square, for people who do not use a mouse.
    el.addEventListener("keydown", function (e) {
      if (!e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
      var dc = 0, dr = 0;
      if (e.key === "ArrowLeft") dc = 1;          // columns count from the right edge
      else if (e.key === "ArrowRight") dc = -1;
      else if (e.key === "ArrowUp") dr = -1;
      else if (e.key === "ArrowDown") dr = 1;
      else return;
      e.preventDefault();
      var c = clamp(el._col + dc, 0, maxCol());
      var r = clamp(el._row + dr, 0, maxRow());
      if (taken(c, r, el)) return;
      put(el, c, r);
      el._saved = true;
      save();
    });
  });

  window.addEventListener("resize", function () {
    icons.forEach(function (el) {
      var cell = nearestFree(el._col, el._row, el);
      put(el, cell[0], cell[1]);
    });
  });

  window.deskIcons = {
    cleanUp: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* nothing to forget */ }
      layout(false);
    }
  };
})();
