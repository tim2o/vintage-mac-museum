// "Leave Me a Note": sends the form to Web3Forms, which emails it on. The page holds only a public access key.
// A hidden field and a minimum time on the page keep simple bots out; Web3Forms filters spam as well.
(function () {
  function init(form) {
    var opened = Date.now();
    var status = form.querySelector("[data-note-status]");
    var send = form.querySelector("[data-note-send]");
    var busy = false;
    function sent() {
      say("Thanks, your note is on its way.");
      // Lets the window that holds the form close itself shortly after (see windows.js).
      form.dispatchEvent(new CustomEvent("note-sent", { bubbles: true }));
    }
    function say(text, bad) {
      status.textContent = text;
      status.classList.toggle("is-bad", !!bad);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var data = new FormData(form);
      var message = String(data.get("message") || "").trim();
      if (!message) {
        say("Please write a note first.", true);
        return;
      }
      // A person takes longer than a few seconds to write a note; a hidden field filled in means a bot.
      if (data.get("website") || Date.now() - opened < 3000) {
        if (data.get("website")) {
          sent();
          return;
        }
        say("One moment, then press Send again.", true);
        return;
      }
      var body = {
        access_key: data.get("access_key"),
        subject: data.get("subject"),
        from_name: String(data.get("name") || "").trim() || "Anonymous visitor",
        message: message,
      };
      var email = String(data.get("email") || "").trim();
      if (email) body.email = email;
      busy = true;
      send.disabled = true;
      say("Sending\u2026");
      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok && j && j.success, j: j };
          });
        })
        .then(function (res) {
          if (res.ok) {
            form.querySelector("textarea").value = "";
            sent();
          } else {
            say("Sorry, that did not send. Please try again later.", true);
          }
        })
        .catch(function () {
          say("Sorry, that did not send. Please check your connection and try again.", true);
        })
        .then(function () {
          busy = false;
          send.disabled = false;
        });
    });
  }
  function initAll(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("[data-note-form]"), init);
  }
  window.initNotes = initAll;
  initAll(document);
})();
