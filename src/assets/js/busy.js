// The busy cursor: after you click a link, an icon or a button, a black-and-white wheel turns at the pointer for a
// moment, as the old Mac OS did while it worked. (No sound for now: the hard drive sound is parked, see commit 30f3c95.)
// Going to another page keeps the wheel turning until that page has loaded. Desktop browsers with a mouse only,
// and it adds no delay to anything: it is drawn over the page, and only while it is showing.
(function () {
  "use strict";

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // no turning for people who ask for less motion

  var wheel = document.createElement("div");
  wheel.className = "busy-wheel" + (still ? " is-still" : "");
  wheel.hidden = true;
  wheel.setAttribute("aria-hidden", "true");
  var spokes = "";
  for (var i = 0; i < 8; i++) {
    var a0 = (i * 45 - 90) * Math.PI / 180, a1 = ((i + 1) * 45 - 90) * Math.PI / 180;
    var p = function (a) { return (11 + 9.5 * Math.cos(a)).toFixed(2) + " " + (11 + 9.5 * Math.sin(a)).toFixed(2); };
    spokes += '<path d="M11 11L' + p(a0) + "A9.5 9.5 0 0 1 " + p(a1) + 'Z" fill="' + (i % 2 ? "#fff" : "#000") + '"/>';
  }
  wheel.innerHTML =
    '<svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false">' + spokes +
    '<circle cx="11" cy="11" r="9.5" fill="none" stroke="#000" stroke-width="1.3"/></svg>';
  document.body.appendChild(wheel);

  var x = 0, y = 0, frame = 0, timer = null, busy = false;
  function draw() {
    frame = 0;
    wheel.style.transform = "translate(" + (x - 11) + "px," + (y - 11) + "px)";
  }
  function move(nx, ny) {
    x = nx;
    y = ny;
    if (!frame) frame = window.requestAnimationFrame(draw);
  }
  window.addEventListener("pointermove", function (e) { if (busy) move(e.clientX, e.clientY); }, { passive: true });

  function show(nx, ny) {
    x = nx;
    y = ny;
    busy = true;
    draw();
    wheel.hidden = false;
    document.body.classList.add("is-busy");
  }
  function hide() {
    window.clearTimeout(timer);
    busy = false;
    wheel.hidden = true;
    document.body.classList.remove("is-busy");
  }
  function busyFor(ms, nx, ny) {
    window.clearTimeout(timer);
    show(nx, ny);
    timer = window.setTimeout(hide, ms);
  }

  // What counts as clicking "something": places that open or do things, not scroll bars, window boxes or fields.
  var OPENERS = "a[href], .desk-icon, .icon-item, .btn:not(.btn-mag), .app-list button[role=menuitem]";

  document.addEventListener("click", function (e) {
    if (e.button !== 0 || !e.target.closest) return;
    var el = e.target.closest(OPENERS);
    if (!el || el.closest(".window.sticky")) return;
    var nx = e.clientX, ny = e.clientY;
    var link = el.closest("a[href]");
    var leaving = link && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey &&
      link.target !== "_blank" && link.origin === window.location.origin &&
      (link.pathname !== window.location.pathname || link.search !== window.location.search);
    if (leaving) {
      try { window.sessionStorage.setItem("busy-xy", nx + "," + ny); } catch (err) { /* then the next page just starts quietly */ }
      show(nx, ny);
    } else {
      busyFor(600 + Math.random() * 500, nx, ny);
    }
  });

  // On the page we arrive at, keep the wheel turning until it has loaded (and for a moment more, so it is seen).
  var carried = null;
  try { carried = window.sessionStorage.getItem("busy-xy"); window.sessionStorage.removeItem("busy-xy"); } catch (e) { /* none */ }
  if (carried) {
    var xy = carried.split(",");
    show(parseFloat(xy[0]) || 0, parseFloat(xy[1]) || 0);
    var done = function () { window.setTimeout(hide, 350); };
    if (document.readyState === "complete") done(); else window.addEventListener("load", done, { once: true });
    window.setTimeout(hide, 4000); // never leave it up if something is slow
  }
  // The wheel must not stay up if the page is shown again from the back-forward cache.
  window.addEventListener("pageshow", function (e) { if (e.persisted) hide(); });
})();
