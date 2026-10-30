/* questionnaires.js: demographics, AQ (50 items) and CAPS (32 items).

   buildQuestionnaires(jsPsych) returns jsPsych timeline nodes. Every question
   is required. Item wording is taken from the paper versions; instructions are
   adapted for clicking instead of circling.

   Data: one row per page (task = "questionnaire_page"), then a single
   "questionnaire_summary" row with every answer in its own column plus scores:
     age, gender, handedness, native_english
     AQ_1 ... AQ_50       1 = definitely agree, 2 = slightly agree,
                          3 = slightly disagree, 4 = definitely disagree
     AQ_total (0-50) and the five AQ subscales, using the standard binary scoring
     CAPS_1 ... CAPS_32   "yes" / "no"
     CAPS_n_distress, CAPS_n_distracting, CAPS_n_frequency   1-5 (blank if "no")
     CAPS_total (number of "yes", 0-32), CAPS_distress, CAPS_distracting,
     CAPS_frequency (sums of ratings across endorsed items, 0-160) */

// ---- Item content -------------------------------------------------------------

var AQ_OPTIONS = ["definitely agree", "slightly agree", "slightly disagree", "definitely disagree"];

var AQ_ITEMS = [
  "I prefer to do things with others rather than on my own.",
  "I prefer to do things the same way over and over again.",
  "If I try to imagine something, I find it very easy to create a picture in my mind.",
  "I frequently get so strongly absorbed in one thing that I lose sight of other things.",
  "I often notice small sounds when others do not.",
  "I usually notice car number plates or similar strings of information.",
  "Other people frequently tell me that what I\u2019ve said is impolite, even though I think it is polite.",
  "When I\u2019m reading a story, I can easily imagine what the characters might look like.",
  "I am fascinated by dates.",
  "In a social group, I can easily keep track of several different people\u2019s conversations.",
  "I find social situations easy.",
  "I tend to notice details that others do not.",
  "I would rather go to a library than a party.",
  "I find making up stories easy.",
  "I find myself drawn more strongly to people than to things.",
  "I tend to have very strong interests which I get upset about if I can\u2019t pursue.",
  "I enjoy social chit-chat.",
  "When I talk, it isn\u2019t always easy for others to get a word in edgeways.",
  "I am fascinated by numbers.",
  "When I\u2019m reading a story, I find it difficult to work out the characters\u2019 intentions.",
  "I don\u2019t particularly enjoy reading fiction.",
  "I find it hard to make new friends.",
  "I notice patterns in things all the time.",
  "I would rather go to the theatre than a museum.",
  "It does not upset me if my daily routine is disturbed.",
  "I frequently find that I don\u2019t know how to keep a conversation going.",
  "I find it easy to \u201Cread between the lines\u201D when someone is talking to me.",
  "I usually concentrate more on the whole picture, rather than the small details.",
  "I am not very good at remembering phone numbers.",
  "I don\u2019t usually notice small changes in a situation, or a person\u2019s appearance.",
  "I know how to tell if someone listening to me is getting bored.",
  "I find it easy to do more than one thing at once.",
  "When I talk on the phone, I\u2019m not sure when it\u2019s my turn to speak.",
  "I enjoy doing things spontaneously.",
  "I am often the last to understand the point of a joke.",
  "I find it easy to work out what someone is thinking or feeling just by looking at their face.",
  "If there is an interruption, I can switch back to what I was doing very quickly.",
  "I am good at social chit-chat.",
  "People often tell me that I keep going on and on about the same thing.",
  "When I was young, I used to enjoy playing games involving pretending with other children.",
  "I like to collect information about categories of things (e.g. types of car, types of bird, types of train, types of plant, etc.).",
  "I find it difficult to imagine what it would be like to be someone else.",
  "I like to plan any activities I participate in carefully.",
  "I enjoy social occasions.",
  "I find it difficult to work out people\u2019s intentions.",
  "New situations make me anxious.",
  "I enjoy meeting new people.",
  "I am a good diplomat.",
  "I am not very good at remembering people\u2019s date of birth.",
  "I find it very easy to play games with children that involve pretending."
];

// Standard AQ scoring (Baron-Cohen et al., 2001): 1 point for either "agree"
// response on these items, and for either "disagree" response on all others.
var AQ_AGREE_SCORED = [2, 4, 5, 6, 7, 9, 12, 13, 16, 18, 19, 20, 21, 22, 23, 26, 33, 35, 39, 41, 42, 43, 45, 46];
var AQ_SUBSCALES = {
  AQ_social_skill:        [1, 11, 13, 15, 22, 36, 44, 45, 47, 48],
  AQ_attention_switching: [2, 4, 10, 16, 25, 32, 34, 37, 43, 46],
  AQ_attention_to_detail: [5, 6, 9, 12, 19, 23, 28, 29, 30, 49],
  AQ_communication:       [7, 17, 18, 26, 27, 31, 33, 35, 38, 39],
  AQ_imagination:         [3, 8, 14, 20, 21, 24, 40, 41, 42, 50]
};

var CAPS_ITEMS = [
  "Do you ever notice that sounds are much louder than they normally would be?",
  "Do you ever sense the presence of another being, despite being unable to see any evidence?",
  "Do you ever hear your own thoughts repeated or echoed?",
  "Do you ever see shapes, lights or colours even though there is nothing really there?",
  "Do you ever experience unusual burning sensations or other strange feelings in or on your body?",
  "Do you ever hear noises or sounds when there is nothing about to explain them?",
  "Do you ever hear your own thoughts spoken aloud in your head, so that someone near might be able to hear them?",
  "Do you ever detect smells which don\u2019t seem to come from your surroundings?",
  "Do you ever have the sensation that your body, or a part of it, is changing or has changed shape?",
  "Do you ever have the sensation that your limbs might not be your own or might not be properly connected to your body?",
  "Do you ever hear voices commenting on what you are thinking or doing?",
  "Do you ever feel that someone is touching you, but when you look nobody is there?",
  "Do you ever hear voices saying words or sentences when there is no-one around that might account for it?",
  "Do you ever experience unexplained tastes in your mouth?",
  "Do you ever find that sensations happen all at once and flood you with information?",
  "Do you ever find that sounds are distorted in strange or unusual ways?",
  "Do you ever have difficulty distinguishing one sensation from another?",
  "Do you ever smell everyday odours and think that they are unusually strong?",
  "Do you ever find the appearance of things or people seems to change in a puzzling way, e.g. distorted shapes or sizes or colour?",
  "Do you ever find that your skin is more sensitive to touch, heat or cold than usual?",
  "Do you ever think that food or drink tastes much stronger than it normally would?",
  "Do you ever look in the mirror and think that your face seems different from usual?",
  "Do you ever have days where lights or colours seem brighter or more intense than usual?",
  "Do you ever have the feeling that of being uplifted, as if driving or rolling over a road while sitting quietly?",
  "Do you ever find that common smells sometimes seem unusually different?",
  "Do you ever think that everyday things look abnormal to you?",
  "Do you ever find that your experience of time changes dramatically?",
  "Have you ever heard two or more unexplained voices talking with each other?",
  "Do you ever notice smells or odours that people next to you seem unaware of?",
  "Do you ever notice that food or drink seems to have an unusual taste?",
  "Do you ever see things that other people cannot?",
  "Do you ever hear sounds or music that people near you don\u2019t hear?"
];

var CAPS_SCALES = [
  { key: "distress",    left: "Not at all distressing", right: "Very distressing" },
  { key: "distracting", left: "Not at all distracting", right: "Completely intrusive" },
  { key: "frequency",   left: "Happens hardly at all",  right: "Happens all the time" }
];

// ---- Plugin: one questionnaire page ---------------------------------------------
// Item types:
//   {type: "number", id, text, min, max}
//   {type: "choice", id, text, options: [...]}
//   {type: "matrix", id, num, text}        rows of a table with columns = page.matrix_options
//   {type: "caps", id, num, text}          YES/NO, then three 1-5 ratings if YES
var jsPsychQuestionPage = (function (jspsych) {
  "use strict";
  var info = {
    name: "question-page",
    version: "1.0.0",
    parameters: {
      title: { type: jspsych.ParameterType.HTML_STRING, default: "" },
      preamble: { type: jspsych.ParameterType.HTML_STRING, default: "" },
      items: { type: jspsych.ParameterType.COMPLEX, default: [] },
      matrix_options: { type: jspsych.ParameterType.STRING, array: true, default: [] },
      page_label: { type: jspsych.ParameterType.STRING, default: "" },
      button_label: { type: jspsych.ParameterType.STRING, default: "Continue" }
    },
    data: {
      responses: { type: jspsych.ParameterType.OBJECT },
      rt: { type: jspsych.ParameterType.INT }
    }
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  function radio(name, value, label, extraClass) {
    return '<label class="q-opt ' + (extraClass || "") + '"><input type="radio" name="' + name +
      '" value="' + esc(value) + '"><span>' + label + "</span></label>";
  }

  class QuestionPagePlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    trial(display_element, trial) {
      var self = this;
      var tStart = performance.now();
      var html = '<div class="q-page">';
      if (trial.page_label) html += '<div class="q-label">' + trial.page_label + "</div>";
      if (trial.title) html += "<h2>" + trial.title + "</h2>";
      if (trial.preamble) html += '<div class="q-preamble">' + trial.preamble + "</div>";
      html += '<form id="q-form" novalidate>';

      var matrixItems = trial.items.filter(function (it) { return it.type === "matrix"; });
      if (matrixItems.length) {
        html += '<div class="q-matrix-wrap"><table class="q-matrix"><thead><tr><th></th>' +
          trial.matrix_options.map(function (o) { return "<th>" + o + "</th>"; }).join("") + "</tr></thead><tbody>";
        matrixItems.forEach(function (it) {
          html += '<tr class="q-item" data-id="' + it.id + '"><td class="q-text">' +
            (it.num ? "<b>" + it.num + ".</b> " : "") + it.text + "</td>";
          trial.matrix_options.forEach(function (o, k) {
            html += '<td class="q-cell"><label><input type="radio" name="' + it.id + '" value="' + (k + 1) +
              '" aria-label="' + esc(o) + '"></label></td>';
          });
          html += "</tr>";
        });
        html += "</tbody></table></div>";
      }

      trial.items.forEach(function (it) {
        if (it.type === "matrix") return;
        html += '<div class="q-item q-block" data-id="' + it.id + '"><div class="q-text">' +
          (it.num ? "<b>" + it.num + ")</b> " : "") + it.text + "</div>";
        if (it.type === "number") {
          html += '<input type="number" class="q-number" name="' + it.id + '" min="' + it.min + '" max="' + it.max +
            '" step="1" inputmode="numeric">';
        } else if (it.type === "choice") {
          html += '<div class="q-choices">' + it.options.map(function (o) { return radio(it.id, o, o); }).join("") + "</div>";
        } else if (it.type === "caps") {
          html += '<div class="q-choices">' + radio(it.id, "no", "NO") + radio(it.id, "yes", "YES") + "</div>";
          html += '<div class="q-caps-ratings" hidden>';
          CAPS_SCALES.forEach(function (sc) {
            html += '<div class="q-scale" data-scale="' + it.id + "_" + sc.key + '"><span class="q-anchor">' + sc.left + "</span>";
            for (var v = 1; v <= 5; v++) html += radio(it.id + "_" + sc.key, v, v, "q-num");
            html += '<span class="q-anchor">' + sc.right + "</span></div>";
          });
          html += "</div>";
        }
        html += '<div class="q-missing-msg">Please answer this question.</div></div>';
      });

      html += '<div class="q-error" hidden>Please answer the highlighted questions before continuing.</div>' +
        '<button type="submit" class="jspsych-btn q-submit">' + trial.button_label + "</button></form></div>";
      display_element.innerHTML = html;
      window.scrollTo(0, 0);

      var form = display_element.querySelector("#q-form");

      // Show the three ratings only after YES on a CAPS item
      trial.items.forEach(function (it) {
        if (it.type !== "caps") return;
        form.querySelectorAll('input[name="' + it.id + '"]').forEach(function (r) {
          r.addEventListener("change", function () {
            var box = form.querySelector('.q-item[data-id="' + it.id + '"] .q-caps-ratings');
            var yes = r.value === "yes" && r.checked;
            box.hidden = !yes;
            if (!yes) box.querySelectorAll("input").forEach(function (x) { x.checked = false; });
          });
        });
      });

      // Clear the "missing" highlight as soon as an item is answered
      // ("input" as well as "change", so a typed answer clears while typing; clearing
      // it later, on blur, would shift the page in the middle of the next click)
      var clearIfDone = function (ev) {
        var item = ev.target.closest(".q-item");
        if (item && isComplete(item.getAttribute("data-id"))) item.classList.remove("q-missing");
      };
      form.addEventListener("input", clearIfDone);
      form.addEventListener("change", clearIfDone);

      function val(name) {
        var el = form.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : null;
      }

      function isComplete(id) {
        var it = trial.items.filter(function (x) { return x.id === id; })[0];
        if (!it) return true;
        if (it.type === "number") {
          var n = form.querySelector('input[name="' + id + '"]');
          var v = n.value === "" ? NaN : Number(n.value);
          return Number.isInteger(v) && v >= it.min && v <= it.max;
        }
        if (it.type === "caps") {
          var a = val(id);
          if (a === null) return false;
          if (a === "no") return true;
          return CAPS_SCALES.every(function (sc) { return val(id + "_" + sc.key) !== null; });
        }
        return val(id) !== null;
      }

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var firstMissing = null;
        trial.items.forEach(function (it) {
          var el = form.querySelector('.q-item[data-id="' + it.id + '"]');
          var ok = isComplete(it.id);
          el.classList.toggle("q-missing", !ok);
          if (!ok && !firstMissing) firstMissing = el;
        });
        form.querySelector(".q-error").hidden = !firstMissing;
        if (firstMissing) { firstMissing.scrollIntoView({ block: "center" }); return; }

        var responses = {};
        trial.items.forEach(function (it) {
          if (it.type === "number") {
            responses[it.id] = Number(form.querySelector('input[name="' + it.id + '"]').value);
          } else if (it.type === "matrix") {
            responses[it.id] = Number(val(it.id));
          } else if (it.type === "caps") {
            responses[it.id] = val(it.id);
            CAPS_SCALES.forEach(function (sc) {
              var r = val(it.id + "_" + sc.key);
              responses[it.id + "_" + sc.key] = r === null ? null : Number(r);
            });
          } else {
            responses[it.id] = val(it.id);
          }
        });
        display_element.innerHTML = "";
        self.jsPsych.finishTrial({ responses: responses, rt: Math.round(performance.now() - tStart) });
      });
    }
  }
  QuestionPagePlugin.info = info;
  return QuestionPagePlugin;
})(jsPsychModule);

// ---- Scoring --------------------------------------------------------------------
function scoreQuestionnaires(all) {
  var s = {};
  for (var k in all) s[k] = all[k];

  var aqPoint = function (n) {
    var r = all["AQ_" + n];
    if (r == null) return null;
    var agree = r <= 2;
    return (AQ_AGREE_SCORED.indexOf(n) >= 0 ? agree : !agree) ? 1 : 0;
  };
  var total = 0;
  for (var n = 1; n <= 50; n++) total += aqPoint(n) || 0;
  s.AQ_total = total;
  Object.keys(AQ_SUBSCALES).forEach(function (name) {
    s[name] = AQ_SUBSCALES[name].reduce(function (acc, i) { return acc + (aqPoint(i) || 0); }, 0);
  });

  var yes = 0, sums = { distress: 0, distracting: 0, frequency: 0 };
  for (var c = 1; c <= 32; c++) {
    if (all["CAPS_" + c] === "yes") {
      yes++;
      CAPS_SCALES.forEach(function (sc) { sums[sc.key] += all["CAPS_" + c + "_" + sc.key] || 0; });
    }
  }
  s.CAPS_total = yes;
  s.CAPS_distress = sums.distress;
  s.CAPS_distracting = sums.distracting;
  s.CAPS_frequency = sums.frequency;
  return s;
}

// ---- Timeline -------------------------------------------------------------------
function buildQuestionnaires(jsPsych) {
  var AQ_PER_PAGE = 10, CAPS_PER_PAGE = 8;
  var nAQ = Math.ceil(AQ_ITEMS.length / AQ_PER_PAGE);
  var nCAPS = Math.ceil(CAPS_ITEMS.length / CAPS_PER_PAGE);
  var nPages = 1 + nAQ + nCAPS, pageNo = 0;
  var label = function () { pageNo++; return "Page " + pageNo + " of " + nPages; };

  var mark = function (name) {
    return function (d) { d.task = "questionnaire_page"; d.questionnaire = name; };
  };

  var timeline = [{
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="sin-instr"><h2>Listening task complete</h2>' +
      "<p>Thank you. You can take off your headphones now.</p>" +
      "<p>Finally, there are three short questionnaires: a few questions about yourself, " +
      "then two questionnaires about how you think and what you experience. " +
      "They take about 10\u201315 minutes. Please answer every question.</p>" +
      "<p>Press the <b>spacebar</b> to continue.</p></div>",
    choices: [" "],
    on_finish: function (d) { d.task = "questionnaire_intro"; }
  }];

  // Demographics
  timeline.push({
    type: jsPsychQuestionPage,
    page_label: label(),
    title: "About you",
    items: [
      { type: "number", id: "age", text: "What is your age in years?", min: 16, max: 100 },
      { type: "choice", id: "gender", text: "What gender do you identify with?",
        options: ["Female", "Male", "Nonbinary", "Prefer not to say"] },
      { type: "choice", id: "handedness", text: "Which hand do you write with?", options: ["Right", "Left"] },
      { type: "choice", id: "native_english", text: "Is English your native language?", options: ["Yes", "No"] }
    ],
    on_finish: mark("demographics")
  });

  // AQ
  var aqPreamble = "<p>Below is a list of statements. Please read each statement very carefully and rate " +
    "how strongly you agree or disagree with it by clicking your answer.</p>" +
    "<p><b>Please do not miss any statement out.</b></p>";
  for (var p = 0; p < nAQ; p++) {
    var aqItems = [];
    for (var i = p * AQ_PER_PAGE; i < Math.min((p + 1) * AQ_PER_PAGE, AQ_ITEMS.length); i++) {
      aqItems.push({ type: "matrix", id: "AQ_" + (i + 1), num: i + 1, text: AQ_ITEMS[i] });
    }
    timeline.push({
      type: jsPsychQuestionPage,
      page_label: label(),
      title: p === 0 ? "Questionnaire 1" : "",
      preamble: p === 0 ? aqPreamble : "",
      matrix_options: AQ_OPTIONS,
      items: aqItems,
      on_finish: mark("AQ")
    });
  }

  // CAPS
  var capsPreamble =
    "<p>This questionnaire asks about sensations and perceptions you may have experienced. " +
    "Some of the experiences are unusual, some of them are more everyday.</p>" +
    "<p>We realise the answer options may not always represent your experience as accurately as you might like. " +
    "However, please choose the answers that most closely match your experience, and don't miss any questions out. " +
    "We would appreciate it if you could be as honest as possible.</p>" +
    "<p>The only experiences we are not interested in are those that may have occurred whilst under the influence of drugs.</p>" +
    "<p><b>For each question, choose YES or NO.</b> If you choose YES, three rating scales will appear. " +
    "Please rate how <b>distressing</b> you find the experience, how <b>distracting</b> you find it, " +
    "and how <b>often</b> it happens, by clicking a number from 1 to 5.</p>";
  for (var q = 0; q < nCAPS; q++) {
    var capsItems = [];
    for (var j = q * CAPS_PER_PAGE; j < Math.min((q + 1) * CAPS_PER_PAGE, CAPS_ITEMS.length); j++) {
      capsItems.push({ type: "caps", id: "CAPS_" + (j + 1), num: j + 1, text: CAPS_ITEMS[j] });
    }
    timeline.push({
      type: jsPsychQuestionPage,
      page_label: label(),
      title: q === 0 ? "Questionnaire 2" : "",
      preamble: q === 0 ? capsPreamble : "",
      items: capsItems,
      button_label: q === nCAPS - 1 ? "Finish" : "Continue",
      on_finish: mark("CAPS")
    });
  }

  // Summary row: every answer in its own column, plus scores
  timeline.push({
    type: jsPsychCallFunction,
    func: function () {},
    on_finish: function (d) {
      var all = {};
      jsPsych.data.get().filter({ task: "questionnaire_page" }).values().forEach(function (row) {
        for (var k in row.responses) all[k] = row.responses[k];
      });
      Object.assign(d, scoreQuestionnaires(all), { task: "questionnaire_summary" });
    }
  });

  return timeline;
}
