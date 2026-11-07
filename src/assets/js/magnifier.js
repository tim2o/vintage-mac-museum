// Magnifier: a loupe for the photos in a machine's window, so a label, a port or a screen can be read without
// leaving the page. Clicking a photo turns it on (clicking a photo again turns it off, as does Escape); while it is on, a square lens follows the mouse over the photos and
// shows that spot at a larger size, from the full-size picture. Desktop browsers with a mouse only: on a touch screen
// the photo still opens full size, where you can pinch to zoom. The "Open Full Image" button in the info bar opens
// the photo in a window of its own (the loupe works there too); ctrl/cmd/middle-click on a photo still follows its link.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var strips = document.querySelectorAll("[data-strip]");
  if (!strips.length) return;

  try { window.localStorage.removeItem("magnifier"); } catch (e) { /* the old remembered setting is gone: it starts off now */ }

  var LENS = 200;    // the lens is a square this many pixels across
  var on = false;
  var lens = document.createElement("div");
  lens.className = "loupe";
  lens.hidden = true;
  lens.setAttribute("aria-hidden", "true");
  document.body.appendChild(lens);

  function setOn(value) {
    on = value;
    document.body.classList.toggle("is-magnifying", on);
    Array.prototype.forEach.call(strips, function (strip) { strip.classList.toggle("is-magnifying", on); });
    if (!on) lens.hidden = true;
  }

  // The photo at the left of a strip (the one the "Photo 2 of 3" count is showing), as the strip's own script sees it.
  function currentPhoto(strip) {
    var slides = strip.querySelector("[data-strip-slides]");
    var items = slides ? Array.prototype.slice.call(slides.querySelectorAll(".slide")) : [];
    var pad = slides ? parseFloat(window.getComputedStyle(slides).paddingLeft) || 0 : 0;
    var best = null;
    var bestDist = Infinity;
    items.forEach(function (item) {
      var img = item.querySelector("img");
      if (!img) return;
      var d = Math.abs(item.offsetLeft - pad - slides.scrollLeft);
      if (d <= bestDist) { best = img; bestDist = d; }
    });
    return best;
  }

  // "Open Full Image" in the info bar: the photo in a window of its own, which can be resized (see windows.js).
  // Where there is no room for windows it simply goes to the picture.
  Array.prototype.forEach.call(strips, function (strip) {
    var bar = strip.querySelector(".infobar");
    var status = strip.querySelector("[data-strip-status]");
    if (!bar || !status || !strip.querySelector(".slide img")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-full";
    b.title = "Open this photo at full size in its own window";
    b.innerHTML =
      '<svg viewBox="0 0 14 14" width="14" height="14" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' +
      '<rect x="0.5" y="1.5" width="13" height="11" fill="#fff" stroke="#000"/><rect x="1" y="2" width="12" height="2" fill="#999"/>' +
      '<rect x="3" y="6" width="8" height="5" fill="#cde" stroke="#000" stroke-width="1"/></svg>' +
      "Open Full Image";
    status.after(b);
    b.addEventListener("click", function () {
      var img = currentPhoto(strip);
      if (!img || !img.naturalWidth) return;
      var link = img.closest("a");
      var windowTitle = strip.closest(".window") && strip.closest(".window").querySelector(".titlebar h1");
      var count = /^(Photo|Item) \d+ of \d+$/.test(status.textContent.trim()) ? status.textContent.trim() : "";
      var opened = window.openFullImage && window.openFullImage({
        src: img.currentSrc || img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
        title: (windowTitle ? windowTitle.textContent.trim() : "Photo") + (count ? " \u2013 " + count : "")
      });
      if (!opened && link) window.location.href = link.href;
    });
  });

  var current = null; // the photo the lens is over

  function show(img, e) {
    var w = img.clientWidth;
    var h = img.clientHeight;
    if (!w || !h || !img.naturalWidth) { lens.hidden = true; return; }
    var r = img.getBoundingClientRect();
    var x = e.clientX - (r.left + img.clientLeft);
    var y = e.clientY - (r.top + img.clientTop);
    if (x < 0 || y < 0 || x > w || y > h) { lens.hidden = true; return; }
    // As large as the picture's own pixels allow, up to three times its size on the page.
    var zoom = Math.max(1.5, Math.min(3, img.naturalWidth / w));
    if (current !== img) {
      current = img;
      lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
    }
    lens.style.backgroundSize = w * zoom + "px " + h * zoom + "px";
    lens.style.backgroundPosition = LENS / 2 - x * zoom + "px " + (LENS / 2 - y * zoom) + "px";
    lens.style.left = e.clientX - LENS / 2 + "px";
    lens.style.top = e.clientY - LENS / 2 + "px";
    lens.hidden = false;
  }

  // A photo in a machine's window, or the full-size photo window; unless `anyTime` is set, only while the magnifier is on.
  function photoAt(e, anyTime) {
    var t = e.target;
    if (!t || t.tagName !== "IMG") return null;
    if (t.classList.contains("full-img")) return anyTime || on ? t : null;
    return t.closest(anyTime ? ".strip .slide" : ".strip.is-magnifying .slide") ? t : null;
  }
  document.addEventListener("pointermove", function (e) {
    if (!on || e.pointerType !== "mouse") return;
    var img = photoAt(e);
    if (img) show(img, e); else lens.hidden = true;
  });
  document.addEventListener("pointerleave", function () { lens.hidden = true; });
  // The photo moves under a still mouse when the strip scrolls, and the window may be dragged or closed.
  document.addEventListener("scroll", function () { lens.hidden = true; }, true);
  document.addEventListener("pointerdown", function (e) {
    if (on && !photoAt(e)) lens.hidden = true;
  });
  // Clicking a photo turns the magnifier on, and clicking one again turns it off, instead of going off to the
  // full-size picture. Keyboard (Enter on the link), ctrl/cmd/shift/middle clicks and touch still follow the link.
  document.addEventListener("click", function (e) {
    if (e.button !== 0 || e.detail === 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var img = photoAt(e, true);
    if (!img) return;
    e.preventDefault();
    setOn(!on);
    if (on) show(img, e);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && on && !lens.hidden) setOn(false);
  });
})();
