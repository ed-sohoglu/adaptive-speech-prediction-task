/* experiment.js: jsPsych port of Experiment_SiN.m

   URL parameters (all optional):
     id      participant ID (also accepts PROLIFIC_PID). Seeds the word-list
             shuffle, like rng(subject) did, so a participant gets the same lists
             in every session. A random ID is generated if missing.
     group   1 = Context, 2 = NoContext. If missing, assigned at random.
     blocks  which blocks to run, e.g. blocks=2 or blocks=1,2 (default: all
             N_BLOCKS blocks, i.e. 1-3)
     order   'counterbalance' for half sample-first trials (default: target
             always first, as in the original script)
     skiphp  1 = skip the headphone screen (for your own testing only)
     questionnaires  1 = always run them, 0 = never (default: only in the
             session that includes the last block, N_BLOCKS)

   Example: https://<user>.github.io/<repo>/?id=12&group=1&blocks=1,2,3 */

// ---- Settings ---------------------------------------------------------------
// DataPipe experiment ID (pipe.jspsych.org). DataPipe forwards each data file to
// the storage provider you choose there (Google Drive, Zenodo or Dataverse).
// Empty = download the CSV to this computer instead (for testing).
var DATAPIPE_ID = "";
var COMPLETION_URL = "";             // e.g. a Prolific completion link; empty = none
var SCREENOUT_URL = "";              // where people who fail the headphone check go
                                     // (e.g. a Prolific "screened out" completion link)
var CONTACT_TEXT = "";               // e.g. "If you have any questions, please email j.smith@uni.ac.uk."
                                     // Shown on every ending screen; empty = nothing shown
var REQUIRE_ID = true;               // true = refuse to start without ?id= in the link

// Headphone screen (see headphone-check.js for all options and defaults)
var HEADPHONE_SETTINGS = {
  pass_threshold: 6,   // out of 6 correct
  max_attempts: 1      // 2 = allow one retry
};
var STIM_DIR = "online_stimuli/";

// Parameters (same values as Experiment_SiN.m)
var TRIALS_PER_BLOCK = 30;
var N_BLOCKS = 3;    // blocks per participant (30 words each, from the 180 recorded);
                     // the questionnaires follow the last block
var SNR_TARGET = -6;
var SNR_SAMPLE_START = 40;
var STEP_START = 9;
var STEP_LEADIN = 6;
var LEADIN_SNR_THRESHOLD = 9;
var STEP_AFTER_FIRST_REVERSAL = 3;
var MAX_REVERSALS = 7;
var SNR_MIN = -26;   // must match snrMin in make_stimuli.m
var SNR_MAX = 58;    // must match snrMax in make_stimuli.m
var ITI_MS = [];
for (var k = 750; k <= 1250; k += 25) ITI_MS.push(k);

var PROMPT_HTML = "Which was clearer? Word 1 or Word 2?" +
  '<div class="sin-hint">&larr; Word 1 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Word 2 &rarr;</div>';

// ---- File names -------------------------------------------------------------
function snrTag(snr) { return snr < 0 ? "m" + (-snr) : "p" + snr; }
function targetFile(w) { return STIM_DIR + "T_" + w + ".wav"; }
function sampleFile(w, snr) { return STIM_DIR + "S_" + w + "_" + snrTag(snr) + ".wav"; }

// ---- Seeded randomisation (stands in for rng(subject)) ----------------------
function seededRandom(str) {
  var h = 1779033703 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  var a = h >>> 0;
  return function () { // mulberry32
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  var b = arr.slice();
  for (var i = b.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var t = b[i]; b[i] = b[j]; b[j] = t;
  }
  return b;
}

// Same as the original: shuffle twice, reshuffle the sample list until no
// position pairs a word with itself.
function makeWordLists(seed) {
  var rand = seededRandom(String(seed));
  var target = shuffle(WORDS, rand);
  var sample = shuffle(WORDS, rand);
  var clash = function () { return target.some(function (w, i) { return w === sample[i]; }); };
  while (clash()) sample = shuffle(sample, rand);
  return { target: target, sample: sample };
}

// ---- Main -------------------------------------------------------------------
var subject = "";     // set in main(); used by the filename function below
var sessionStamp = 0;
var aborted = false;
var hp = null;        // headphone screen; set in main()
var dataFilename = function () { return "SiN_" + subject + "_" + sessionStamp + ".csv"; };

// With a DataPipe ID, registering the pipe extension is the whole integration:
// it uploads each trial as it finishes (so a participant who quits part-way
// can still be recovered) and submits the full CSV when the experiment ends.
var jsPsych = initJsPsych({
  extensions: DATAPIPE_ID ? [{
    type: jsPsychExtensionPipe,
    params: { experiment_id: DATAPIPE_ID, filename: dataFilename }
  }] : [],
  on_finish: function () {
    if (!DATAPIPE_ID) jsPsych.data.get().localSave("csv", dataFilename());
    var msg, link;
    if (hp && !hp.passed()) {
      msg = "Thank you. Unfortunately, the headphone check suggests this study won't work well " +
            "with your current listening setup, so the study ends here.";
      link = SCREENOUT_URL;
    } else if (aborted) {
      msg = "Sorry, there was a problem loading the sounds. Your data so far have been saved.";
      link = COMPLETION_URL;
    } else {
      msg = "All done. Thank you for taking part!";
      link = COMPLETION_URL;
    }
    if (link) msg += '<br><br><a href="' + link + '">Click here to return to the study site</a>';
    if (CONTACT_TEXT) msg += "<br><br>" + CONTACT_TEXT;
    jsPsych.getDisplayElement().innerHTML = '<div class="sin-text" style="font-size:24px">' + msg + "</div>";
  }
});

function main() {
  var url = function (name) { return jsPsych.data.getURLVariable(name); };

  subject = url("id") || url("PROLIFIC_PID") || "";
  if (!subject && REQUIRE_ID) {
    jsPsych.getDisplayElement().innerHTML =
      '<div class="sin-text" style="font-size:24px;max-width:800px">' +
      "This link is incomplete. Please use the full web address you were sent." +
      (CONTACT_TEXT ? "<br><br>" + CONTACT_TEXT : "") + "</div>";
    return;
  }
  if (!subject) subject = jsPsych.randomization.randomID(10);

  var group = parseInt(url("group"), 10);
  if (group !== 1 && group !== 2) group = Math.random() < 0.5 ? 1 : 2;
  var condition = group === 1 ? "Context" : "NoContext";

  var allBlocks = [];
  for (var bk = 1; bk <= N_BLOCKS; bk++) allBlocks.push(bk);
  var blocks = (url("blocks") || allBlocks.join(",")).split(",")
    .map(function (s) { return parseInt(s, 10); })
    .filter(function (b) { return b >= 1 && b <= N_BLOCKS && WORDS.length >= b * TRIALS_PER_BLOCK; });

  var counterbalance = url("order") === "counterbalance";
  var lists = makeWordLists(subject);

  jsPsych.data.addProperties({ subject: subject, group: group, condition: condition });

  var timeline = [];

  // ---- 1. Sound setup: headphones on, set volume ----
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus:
      '<div class="sin-text" style="font-size:24px;max-width:800px">' +
      "This study involves listening to sounds, so please put on your <b>headphones</b> " +
      "and find a quiet place.<br><br>" +
      "Click the button to hear an example sound and set your volume to a comfortable level. " +
      "Please don't change the volume after this.<br><br>" +
      '<button id="play-vol" class="jspsych-btn">Play example</button><br><br>' +
      "Press the spacebar when you are ready to continue</div>",
    choices: [" "],
    on_load: function () {
      SinAudio.prefetch([STIM_DIR + "volume_check.wav"]);
      document.getElementById("play-vol").addEventListener("click", function (ev) {
        SinAudio.resume();
        SinAudio.load(STIM_DIR + "volume_check.wav").then(function (b) { SinAudio.play(b); });
        ev.target.blur(); // so SPACE doesn't re-trigger the button
      });
    },
    on_finish: function (d) { SinAudio.resume(); d.task = "sound_setup"; }
  });

  // ---- 2. Headphone screen (skip with ?skiphp=1 while testing) ----
  if (url("skiphp") === "1") {
    hp = { timeline: [], passed: function () { return true; } };
  } else {
    hp = buildHeadphoneScreen(jsPsych, HEADPHONE_SETTINGS);
  }
  if (hp.timeline.length) timeline.push({ timeline: hp.timeline });

  // ---- 3. Speech task instructions (only if the screen was passed) ----
  // Illustrated pages are in instructions-sin.js
  timeline.push({
    timeline: buildSpeechInstructions(group, blocks.length),
    conditional_function: function () { return hp.passed(); }
  });

  // ---- Blocks ----
  blocks.forEach(function (block, bIdx) {
    var first = (block - 1) * TRIALS_PER_BLOCK;
    var targets = lists.target.slice(first, first + TRIALS_PER_BLOCK);
    var samples = lists.sample.slice(first, first + TRIALS_PER_BLOCK);
    var n = targets.length;
    var S = {}; // staircase state for this block

    function prepare(i) {
      var ord = S.order[i];
      var fT = targetFile(targets[i]);
      var fS = sampleFile(samples[i], S.snrSample);
      S.cur = {
        targetWord: targets[i], fileT: fT, fileS: fS,
        order: ord,
        sound1: ord === 1 ? fT : fS,
        sound2: ord === 1 ? fS : fT,
        iti: ITI_MS[Math.floor(Math.random() * ITI_MS.length)],
        snrSample: S.snrSample,
        clamped: S.clamped
      };
      SinAudio.prefetch([fT, fS]);
    }

    var init = {
      type: jsPsychCallFunction,
      func: function () {
        var order = [];
        for (var i = 0; i < n; i++) order.push(counterbalance && i >= n / 2 ? 2 : 1);
        S.order = jsPsych.randomization.shuffle(order);
        S.trial = 0;
        S.snrSample = SNR_SAMPLE_START;
        S.step = STEP_START;
        S.nRev = 0;
        S.prev = "";
        S.clamped = 0;
        S.done = false;
        S.endReason = "";
        prepare(0);
      },
      on_finish: function (d) { d.task = "block_start"; d.block = block; }
    };

    var trial = {
      type: jsPsychSinPair,
      sound1: function () { return S.cur.sound1; },
      sound2: function () { return S.cur.sound2; },
      context_text: function () { return group === 1 ? S.cur.targetWord : ""; },
      prompt: PROMPT_HTML,
      choices: ["ArrowLeft", "ArrowRight"],
      iti: function () { return S.cur.iti; },
      on_finish: function (d) {
        var i = S.trial;
        if (d.load_error) { aborted = true; S.done = true; S.endReason = "load_error"; d.task = "error"; return; }

        // Left = word 1, Right = word 2
        var pressedLeft = jsPsych.pluginAPI.compareKeys(d.response, "ArrowLeft");
        var answer = ((S.cur.order === 1) === pressedLeft) ? "Target" : "Sample";

        // Staircase bookkeeping, same order as the MATLAB loop
        var stepUsed = S.step;
        var reversal = 0;
        if (i > 0) {
          if (answer !== S.prev) { reversal = 1; S.nRev++; }
          if (S.nRev === 0 && S.cur.snrSample <= LEADIN_SNR_THRESHOLD) S.step = STEP_LEADIN;
          if (S.nRev === 1) S.step = STEP_AFTER_FIRST_REVERSAL;
        }
        S.prev = answer;

        Object.assign(d, {
          task: "trial", block: block, trial: i + 1, context: S.cur.targetWord,
          fileNameTarget: S.cur.fileT, fileNameSample: S.cur.fileS, ITI: S.cur.iti / 1000,
          step_size: stepUsed, snr_target: SNR_TARGET, snr_sample: S.cur.snrSample,
          snr_clamped: S.cur.clamped, answer: answer, order: S.cur.order,
          reversal: reversal, n_reversals: S.nRev
        });

        if (i > 0 && S.nRev === MAX_REVERSALS) { S.done = true; S.endReason = "max_reversals"; return; }

        var next = answer === "Target" ? S.cur.snrSample + S.step : S.cur.snrSample - S.step;
        S.clamped = 0;
        if (next > SNR_MAX) { next = SNR_MAX; S.clamped = 1; }
        if (next < SNR_MIN) { next = SNR_MIN; S.clamped = 1; }
        S.snrSample = next;
        S.trial++;

        if (S.trial >= n) { S.done = true; S.endReason = "all_trials_done"; return; }
        prepare(S.trial);
      }
    };

    var loop = { timeline: [trial], loop_function: function () { return !S.done; } };

    var summary = {
      type: jsPsychCallFunction,
      func: function () {},
      on_finish: function (d) {
        Object.assign(d, {
          task: "block_end", block: block, end_reason: S.endReason,
          n_reversals: S.nRev, final_snr_sample: S.snrSample, final_step_size: S.step
        });
      }
    };

    // Short pause before the first trial (WaitSecs(2) in the original)
    var preWait = {
      type: jsPsychHtmlKeyboardResponse, stimulus: "", choices: "NO_KEYS", trial_duration: 2000,
      on_finish: function (d) { d.task = "pre_block_wait"; }
    };

    var blockNodes = [init, preWait, loop, summary];

    if (bIdx < blocks.length - 1) {
      blockNodes.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div class="sin-text" style="font-size:24px">Part ' + (bIdx + 1) + " of " + blocks.length +
          " finished. Take a short break if you like.<br><br>Press the spacebar to continue.</div>",
        choices: [" "],
        on_finish: function (d) { d.task = "break"; }
      });
    }

    timeline.push({
      timeline: blockNodes,
      conditional_function: function () { return !aborted && hp.passed(); }
    });
  });

  // ---- Questionnaires (questionnaires.js) ----
  // By default they run in the session that includes the final block, so a
  // participant doing blocks over two sessions answers them only once.
  // Override with ?questionnaires=1 (always) or ?questionnaires=0 (never).
  var qParam = url("questionnaires");
  var runQuestionnaires = qParam === "1" ? true : qParam === "0" ? false : blocks.indexOf(N_BLOCKS) >= 0;
  if (runQuestionnaires) {
    timeline.push({
      timeline: buildQuestionnaires(jsPsych),
      conditional_function: function () { return !aborted && hp.passed(); }
    });
  }

  // Data are saved when the timeline ends (see initJsPsych above), so there is
  // no save trial. Timestamp in the file name: DataPipe refuses a duplicate
  // name, and a participant may run blocks in separate sessions.
  sessionStamp = Date.now();

  jsPsych.run(timeline);
}

main();
