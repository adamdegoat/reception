/* Reception signup modal. Any element with [data-signup] opens it; [data-trade] pre-selects a trade.
   Submits to the worker /signup endpoint, which alerts the owner on Telegram. */
(function () {
  var WORKER = "https://nimbus-desk.propsightsg.workers.dev";
  var BELL = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="45.5" width="46" height="5.8" rx="2.9" fill="#171512"/><path d="M15.5 45.5 a16.5 15.5 0 0 1 33 0 Z" fill="#171512"/><circle cx="32" cy="26.5" r="3.9" fill="#e8663a"/></svg>';
  var lastTrigger = null;

  var overlay = document.createElement("div");
  overlay.className = "rf-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="rf-modal" role="dialog" aria-modal="true" aria-labelledby="rfTitle">' +
      '<button class="rf-x" type="button" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
      '<div class="rf-body">' +
        '<span class="rf-mk">' + BELL + '</span>' +
        '<h2 id="rfTitle">Start your front desk</h2>' +
        '<p class="rf-sub">Tell us where to reach you and we\'ll build your desk in your name, free to try, before you pay a cent. We reply within a day.</p>' +
        '<form id="rfForm" novalidate>' +
          '<label class="rf-field"><span class="rf-lbl">Your name</span>' +
            '<input class="rf-input" id="rfName" type="text" autocomplete="name" placeholder="e.g. Marcus Lim" required></label>' +
          '<label class="rf-field"><span class="rf-lbl">Mobile</span>' +
            '<input class="rf-input" id="rfMobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 9123 4567" required></label>' +
          '<div class="rf-field"><span class="rf-lbl">What do you do</span>' +
            '<div class="rf-trades" id="rfTrades" role="radiogroup" aria-label="What do you do">' +
              '<button type="button" class="rf-trade" data-t="Property agent" role="radio" aria-checked="false">Property agent</button>' +
              '<button type="button" class="rf-trade" data-t="Insurance agent" role="radio" aria-checked="false">Insurance agent</button>' +
              '<button type="button" class="rf-trade" data-t="Financial adviser" role="radio" aria-checked="false">Financial adviser</button>' +
              '<button type="button" class="rf-trade" data-t="Something else" role="radio" aria-checked="false">Something else</button>' +
            '</div></div>' +
          '<label class="rf-field"><span class="rf-lbl">Anything else <span class="rf-opt">optional</span></span>' +
            '<input class="rf-input" id="rfNote" type="text" maxlength="200" placeholder="A line about your business"></label>' +
          '<button class="rf-submit" id="rfSubmit" type="submit">Request my desk</button>' +
          '<p class="rf-err" id="rfErr" hidden></p>' +
          '<p class="rf-alt">Prefer WhatsApp? <a href="https://wa.me/6583219747" target="_blank" rel="noopener">Message us</a></p>' +
        '</form>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var modal = overlay.querySelector(".rf-modal");
  var body = overlay.querySelector(".rf-body");
  var form = overlay.querySelector("#rfForm");
  var trades = overlay.querySelector("#rfTrades");
  var errEl = overlay.querySelector("#rfErr");
  var submitBtn = overlay.querySelector("#rfSubmit");
  var chosenTrade = "";
  var source = (document.body.getAttribute("data-page") || (location.pathname.split("/").pop() || "home").replace(/\.html$/, "")) || "home";

  function selectTrade(val) {
    chosenTrade = val || "";
    [].forEach.call(trades.querySelectorAll(".rf-trade"), function (b) {
      var on = b.getAttribute("data-t") === chosenTrade;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function open(trigger) {
    lastTrigger = trigger || null;
    var pre = trigger && trigger.getAttribute("data-trade");
    selectTrade(pre || "");
    errEl.hidden = true;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    // force reflow so the transition runs
    void overlay.offsetWidth;
    overlay.classList.add("rf-show");
    setTimeout(function () { overlay.querySelector("#rfName").focus(); }, 60);
    document.addEventListener("keydown", onKey);
  }

  function close() {
    overlay.classList.remove("rf-show");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    setTimeout(function () {
      overlay.hidden = true;
      // reset to the form (in case it showed the success state)
      if (!overlay.querySelector("#rfForm")) { body.innerHTML = initialBody; wire(); }
      if (form) { form.reset(); selectTrade(""); }
    }, 300);
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") {
      var f = modal.querySelectorAll('button,input,textarea,a[href]');
      f = [].filter.call(f, function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  var initialBody = body.innerHTML;

  function wire() {
    body.querySelector(".rf-x") && overlay.querySelector(".rf-x").addEventListener("click", close);
    trades = overlay.querySelector("#rfTrades");
    form = overlay.querySelector("#rfForm");
    errEl = overlay.querySelector("#rfErr");
    submitBtn = overlay.querySelector("#rfSubmit");
    if (trades) trades.addEventListener("click", function (e) {
      var b = e.target.closest(".rf-trade"); if (b) selectTrade(b.getAttribute("data-t"));
    });
    if (form) form.addEventListener("submit", onSubmit);
  }

  function onSubmit(e) {
    e.preventDefault();
    var name = overlay.querySelector("#rfName").value.trim();
    var mobile = overlay.querySelector("#rfMobile").value.trim();
    var note = overlay.querySelector("#rfNote").value.trim();
    if (!name) { showErr("Please add your name."); overlay.querySelector("#rfName").focus(); return; }
    if (!mobile || mobile.replace(/\D/g, "").length < 8) { showErr("Please add a mobile number we can reach you on."); overlay.querySelector("#rfMobile").focus(); return; }
    errEl.hidden = true;
    submitBtn.disabled = true; submitBtn.textContent = "Sending...";
    fetch(WORKER + "/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, mobile: mobile, trade: chosenTrade, note: note, source: source })
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d && d.ok) { success(name); }
        else { throw new Error("bad"); }
      })
      .catch(function () {
        submitBtn.disabled = false; submitBtn.textContent = "Request my desk";
        showErr("That didn't go through. Try again, or message us on WhatsApp.");
      });
  }

  function showErr(msg) { errEl.textContent = msg; errEl.hidden = false; }

  function success(name) {
    var first = (name.split(/\s+/)[0] || "").slice(0, 40);
    body.innerHTML =
      '<button class="rf-x" type="button" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="rf-done">' +
        '<div class="rf-check"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>' +
        '<h2>Thanks' + (first ? ", " + escapeHtml(first) : "") + ".</h2>" +
        '<p>We\'ve got your details and will be in touch within a day to build your front desk.</p>' +
        '<button class="rf-submit" type="button" id="rfClose2">Done</button>' +
      '</div>';
    overlay.querySelector(".rf-x").addEventListener("click", close);
    overlay.querySelector("#rfClose2").addEventListener("click", close);
    overlay.querySelector("#rfClose2").focus();
  }

  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // close on scrim click
  overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });

  // open triggers
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-signup]");
    if (t) { e.preventDefault(); open(t); }
  });

  wire();
})();
