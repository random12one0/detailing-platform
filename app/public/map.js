// Moved out of map.html for ROADMAP 97.90: the site policy allows no inline script.
(function () {
  var KEY = "dp.review.v1";
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }

  var rows = [].slice.call(document.querySelectorAll(".row[data-key]"));
  var prog = document.getElementById("prog");

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function paint(row) {
    var k = row.getAttribute("data-key");
    var s = state[k] || {};
    row.classList.toggle("is-ok", s.mark === "ok");
    row.classList.toggle("is-bad", s.mark === "bad");
    var note = row.querySelector(".note");
    note.hidden = s.mark !== "bad";
    if (note.value !== (s.note || "")) note.value = s.note || "";
  }
  function count() {
    var done = rows.filter(function (r) {
      var s = state[r.getAttribute("data-key")] || {};
      return s.mark === "ok" || s.mark === "bad";
    }).length;
    var bad = rows.filter(function (r) {
      return (state[r.getAttribute("data-key")] || {}).mark === "bad";
    }).length;
    prog.textContent = done + " of " + rows.length + (bad ? " · " + bad + " to fix" : "");
  }

  rows.forEach(function (row) {
    var k = row.getAttribute("data-key");
    row.querySelector(".tick").addEventListener("click", function () {
      var s = state[k] || (state[k] = {});
      s.mark = s.mark === "ok" ? null : "ok";
      save(); paint(row); count(); filter();
    });
    row.querySelector(".cross").addEventListener("click", function () {
      var s = state[k] || (state[k] = {});
      s.mark = s.mark === "bad" ? null : "bad";
      save(); paint(row); count();
      if (s.mark === "bad") row.querySelector(".note").focus();
    });
    row.querySelector(".note").addEventListener("input", function (e) {
      var s = state[k] || (state[k] = {});
      s.note = e.target.value;
      save();
    });
    paint(row);
  });
  count();

  // ── WHAT IS LEFT, WHICH IS WHAT HE ASKED THE LIST TO BE ────────────────
  //
  // *"Can you remove all the stuff that I already checked off?"* Hidden rather
  // than deleted, and hidden in the BROWSER rather than out of the file: the
  // ticks are his, they live in this browser's own storage, and a page that
  // deleted rows would be guessing which ones he meant — and would be wrong
  // for anybody else opening it.
  //
  // **A CROSS IS NOT HIDDEN.** Only the green ticks go. A page he looked at and
  // disliked is still work; a page he looked at and liked is finished, and
  // finished work is exactly what a to-do list should stop showing him.
  //
  // **AND A SECTION WITH NOTHING LEFT IN IT GOES TOO**, heading and all,
  // otherwise "Every settings screen" stays on the page as a title over a gap.
  var showAll = false;
  function filter() {
    rows.forEach(function (row) {
      var s = state[row.getAttribute("data-key")] || {};
      row.hidden = !showAll && s.mark === "ok";
    });
    [].slice.call(document.querySelectorAll("section")).forEach(function (sec) {
      var live = [].slice.call(sec.querySelectorAll(".row[data-key]"))
        .filter(function (r) { return !r.hidden; }).length;
      sec.hidden = !showAll && live === 0;
    });
    var btn = document.getElementById("showall");
    btn.textContent = showAll ? "Hide the done ones" : "Show all " + rows.length;
    btn.setAttribute("aria-pressed", showAll ? "true" : "false");
  }
  document.getElementById("showall").addEventListener("click", function () {
    showAll = !showAll;
    filter();
  });

  document.getElementById("copy").addEventListener("click", function () {
    var lines = [];
    var bad = [], notLooked = [];
    rows.forEach(function (row) {
      var k = row.getAttribute("data-key");
      var s = state[k] || {};
      var name = (row.querySelector(".n") || {}).textContent || k;
      var where = (row.querySelector(".u") || {}).textContent || "";
      if (s.mark === "bad") bad.push("- " + name + " (" + where + ")" + (s.note ? " — " + s.note : ""));
      else if (s.mark !== "ok") notLooked.push("- " + name + " (" + where + ")");
    });
    lines.push("REVIEW — " + prog.textContent);
    if (bad.length) { lines.push("", "NEEDS WORK (" + bad.length + "):"); lines.push.apply(lines, bad); }
    if (notLooked.length) {
      lines.push("", "NOT LOOKED AT YET (" + notLooked.length + "):");
      lines.push.apply(lines, notLooked);
    }
    if (!bad.length && !notLooked.length) lines.push("", "Everything looked at, nothing wrong.");
    var text = lines.join("\n");
    var btn = document.getElementById("copy");
    function done(ok) { btn.textContent = ok ? "Copied" : "Press Ctrl+C"; setTimeout(function () { btn.textContent = "Copy my notes"; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(text, done); });
    } else { fallback(text, done); }
    function fallback(t, cb) {
      var ta = document.createElement("textarea");
      ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta); cb(ok);
    }
  });

  filter();

  document.getElementById("clear").addEventListener("click", function () {
    if (!confirm("Clear every tick and note?")) return;
    state = {}; save(); rows.forEach(paint); count(); filter();
  });
}());
