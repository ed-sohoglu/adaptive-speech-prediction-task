/* instructions-sin.js: illustrated instructions for the speech clarity task.
   buildSpeechInstructions(group, nParts) returns jsPsych timeline nodes:
   four click-through pages with diagrams, then a "press space to begin" screen.
   The trial diagram matches the participant's group (with or without the
   on-screen word). Edit the wording in PAGE TEXT below. */

var SinInstr = (function () {
  var BLUE = "#4a7bd0", GREEN = "#2e8540", GREY = "#888", INK = "#222", PALE = "#f2f5fa";
  var FONT = "font-family:Arial,Helvetica,sans-serif";

  // Small deterministic random generator so the drawings look the same every time
  function rng(seed) {
    var a = seed;
    return function () { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
  }

  // A speech-like waveform; noise = 0 (clean) to 1 (buried in noise)
  function wave(x0, y0, w, h, noise, seed) {
    var r = rng(seed), d = "", n = 140;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var env = Math.exp(-Math.pow((t - 0.3) / 0.11, 2)) + 0.8 * Math.exp(-Math.pow((t - 0.64) / 0.13, 2));
      var y = env * Math.sin(t * 95) * (1 - 0.55 * noise) + noise * (r() - 0.5) * 1.5;
      d += (i ? "L" : "M") + (x0 + t * w).toFixed(1) + " " + (y0 - y * h / 2).toFixed(1);
    }
    return '<path d="' + d + '" fill="none" stroke="' + BLUE + '" stroke-width="1.6" stroke-linejoin="round"/>';
  }

  function speaker(x, y, s) { // speaker icon, top-left at x,y, size s
    var k = s / 40;
    return '<g transform="translate(' + x + "," + y + ") scale(" + k + ')" fill="' + INK + '" stroke="' + INK + '">' +
      '<path d="M4 14h8l10-9v30l-10-9H4z" stroke="none"/>' +
      '<path d="M27 13a10 10 0 0 1 0 14M31 8a17 17 0 0 1 0 24" fill="none" stroke-width="3" stroke-linecap="round"/></g>';
  }

  function screen(x, y, w, h, inner) { // a little computer screen
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="#fff" stroke="' + GREY + '" stroke-width="2"/>' +
      '<rect x="' + (x + w / 2 - 12) + '" y="' + (y + h) + '" width="24" height="8" fill="' + GREY + '"/>' + inner;
  }

  function text(x, y, s, size, opts) {
    opts = opts || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (opts.anchor || "middle") + '" font-size="' + size +
      '" fill="' + (opts.fill || INK) + '"' + (opts.bold ? ' font-weight="bold"' : "") +
      (opts.italic ? ' font-style="italic"' : "") + ' style="' + FONT + '">' + s + "</text>";
  }

  function arrow(x1, y, x2) {
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + (x2 - 8) + '" y2="' + y + '" stroke="' + GREY + '" stroke-width="2"/>' +
      '<path d="M' + (x2 - 10) + " " + (y - 6) + "L" + x2 + " " + y + "L" + (x2 - 10) + " " + (y + 6) + 'z" fill="' + GREY + '"/>';
  }

  function svg(w, h, body) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" style="width:100%;max-width:' + w + 'px;height:auto;display:block;margin:24px auto" ' +
      'role="img" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
  }

  // ---- Diagram 1: a clear word vs a noisy word ----
  function clarityFigure() {
    var b = "";
    [[20, "Word 1", 0.12, 7, "Clearer", GREEN], [340, "Word 2", 0.85, 11, "Harder to make out", GREY]].forEach(function (c) {
      var x = c[0];
      b += '<rect x="' + x + '" y="10" width="280" height="170" rx="12" fill="' + PALE + '" stroke="#d5dbe6"/>';
      b += speaker(x + 18, 24, 34) + text(x + 64, 48, c[1], 20, { anchor: "start", bold: true });
      b += wave(x + 20, 115, 240, 70, c[2], c[3]);
      b += text(x + 140, 168, c[4], 17, { fill: c[5], bold: c[5] === GREEN });
    });
    return svg(640, 190, b);
  }

  // ---- Diagram 2: what happens on each trial ----
  function trialFigure(group) {
    var steps = [];
    if (group === 1) {
      steps.push({ draw: function (x) { return screen(x, 20, 120, 80, text(x + 60, 67, "table", 20, { italic: true })); },
                   cap: ["A word appears", "on the screen"] });
    }
    steps.push({ draw: function (x) { return speaker(x + 38, 32, 44) + text(x + 60, 100, "Word 1", 16, { bold: true }); },
                 cap: ["You hear", "the first word"] });
    steps.push({ draw: function (x) { return speaker(x + 38, 32, 44) + text(x + 60, 100, "Word 2", 16, { bold: true }); },
                 cap: ["You hear", "the second word"] });
    steps.push({ draw: function (x) {
                   return screen(x, 20, 120, 80, text(x + 60, 55, "Which was", 13) + text(x + 60, 73, "clearer?", 13) +
                     text(x + 60, 92, "\u2190   \u2192", 14, { fill: BLUE, bold: true }));
                 },
                 cap: ["You choose", "with an arrow key"] });

    var gap = 40, w = 120, total = steps.length * w + (steps.length - 1) * gap;
    var x0 = (640 - total) / 2, b = "";
    steps.forEach(function (s, i) {
      var x = x0 + i * (w + gap);
      b += '<circle cx="' + (x + 60) + '" cy="12" r="11" fill="' + BLUE + '"/>' + text(x + 60, 17, String(i + 1), 13, { fill: "#fff", bold: true });
      b += '<g transform="translate(0,16)">' + s.draw(x);
      b += text(x + 60, 136, s.cap[0], 14) + text(x + 60, 154, s.cap[1], 14);
      if (i < steps.length - 1) b += arrow(x + w + 6, 62, x + w + gap - 6);
      b += "</g>";
    });
    return svg(640, 180, b);
  }

  // ---- Diagram 3: the two arrow keys ----
  function keysFigure() {
    var b = "";
    [[150, "\u2190", "Left arrow", "Word 1 was clearer"], [370, "\u2192", "Right arrow", "Word 2 was clearer"]].forEach(function (k) {
      var x = k[0];
      b += '<rect x="' + x + '" y="14" width="120" height="96" rx="14" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>';
      b += '<rect x="' + (x + 6) + '" y="20" width="108" height="78" rx="10" fill="' + PALE + '"/>';
      b += text(x + 60, 76, k[1], 46, { bold: true });
      b += text(x + 60, 136, k[2], 15, { fill: GREY });
      b += text(x + 60, 160, k[3], 17, { fill: BLUE, bold: true });
    });
    return svg(640, 172, b);
  }

  return { clarityFigure: clarityFigure, trialFigure: trialFigure, keysFigure: keysFigure };
})();

function buildSpeechInstructions(group, nParts) {
  var page = function (title, body) {
    return '<div class="sin-instr"><h2>' + title + "</h2>" + body + "</div>";
  };

  // ---- PAGE TEXT (edit wording here) ----
  var contextLine = group === 1
    ? "<p>First, a word appears on the screen for a moment. Then you hear two words, one after the other.</p>"
    : "<p>You hear two words, one after the other.</p>";

  var pages = [
    page("The listening task",
      "<p>Thank you, the headphone check is complete. Now for the main task.</p>" +
      "<p>You will hear pairs of spoken words with background noise. The noise makes some words " +
      "easier to make out than others. Your job is to decide <b>which word of each pair sounded clearer</b>.</p>" +
      SinInstr.clarityFigure()),

    page("What happens on each trial",
      contextLine + SinInstr.trialFigure(group) +
      "<p>Each word is played only <b>once</b>, so please listen carefully. " +
      "You can answer as soon as both words have finished.</p>"),

    page("How to answer",
      "<p>When you see <i>Which was clearer? Word 1 or Word 2?</i>, press an arrow key on your keyboard:</p>" +
      SinInstr.keysFigure() +
      "<p>There is no time limit. Take a moment to decide, then press the key.</p>"),

    page("Good to know",
      "<ul>" +
      "<li>The task <b>adapts to your answers</b>, so some pairs will be easy and others very hard. " +
      "That is expected. If you can't tell, just give your <b>best guess</b>.</li>" +
      "<li>Please keep your headphones on and <b>don't change the volume</b> from now on.</li>" +
      (nParts > 1
        ? "<li>The task is split into <b>" + nParts + " short parts</b>, each lasting a few minutes, " +
          "with a chance for a break in between.</li>"
        : "<li>This part lasts a few minutes.</li>") +
      "<li>Please stay in a quiet place and avoid distractions until you finish.</li>" +
      "</ul>")
  ];

  return [
    {
      type: jsPsychInstructions,
      pages: pages,
      show_clickable_nav: true,
      allow_backward: true,
      allow_keys: false, // arrow keys are the response keys, so don't use them to turn pages
      button_label_previous: "Back",
      button_label_next: "Next",
      show_page_number: true,
      on_finish: function (d) { d.task = "instructions"; }
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus:
        '<div class="sin-instr"><h2>Ready?</h2>' +
        "<p>Remember: <b>\u2190 left arrow</b> if Word 1 was clearer, <b>right arrow \u2192</b> if Word 2 was clearer.</p>" +
        "<p>Rest your fingers on the two arrow keys, then press the <b>spacebar</b> to begin.</p></div>",
      choices: [" "],
      on_finish: function (d) { d.task = "ready"; }
    }
  ];
}
