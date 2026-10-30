/* headphone-check.js: Huggins-pitch headphone screen (Milne et al., 2021)
   A jsPsych re-implementation of the authors' Huggins-pitch headphone screen.

   Each trial: three 1000 ms white-noise intervals. Two are diotic (identical
   noise in both ears). In the third, the right ear gets the same noise with a
   180 degree phase shift in a narrow band (600 Hz +/- 6%). Over headphones this
   produces a faint tone (Huggins pitch); over loudspeakers it is weak or absent.
   The listener picks which interval (1, 2 or 3) contained the tone.

   Stimuli are generated in the browser, so there are no sound files to host.
   Requires plugin-sin-pair.js to be loaded first (it provides SinAudio).

   Please cite: Milne, Bianco, Poole, Zhao, Oxenham, Billig & Chait (2021).
   An online headphone screening test based on dichotic pitch.
   Behavior Research Methods, 53, 1551-1562. doi:10.3758/s13428-020-01514-0 */

var HP_DEFAULTS = {
  n_trials: 6,          // test trials per attempt
  pass_threshold: 6,    // correct responses needed to pass (6/6 is the strict criterion)
  max_attempts: 1,      // set to 2 to allow one retry
  centre_hz: 600,
  band_half_width: 0.06, // +/- 6%
  interval_ms: 1000,
  gap_ms: 500,          // silence between intervals
  ramp_ms: 10,          // onset/offset ramps (same in both ears, so the cue is unaffected)
  rms: 0.025            // noise level; the authors' version was made quieter in 2021
};

// ---- Stimulus generation -----------------------------------------------------
var HugginsStim = (function () {
  // In-place iterative radix-2 complex FFT. inverse=true gives the inverse (scaled by 1/n).
  function fft(re, im, inverse) {
    var n = re.length, i, j, k, len;
    for (i = 1, j = 0; i < n; i++) {           // bit reversal
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (len = 2; len <= n; len <<= 1) {
      var ang = (inverse ? 2 : -2) * Math.PI / len;
      var wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var a = i + k, b = a + len / 2;
          var xr = re[b] * cr - im[b] * ci;
          var xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi;
          re[a] += xr; im[a] += xi;
          var ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    if (inverse) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  function gaussian() { // Box-Muller
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function nextPow2(n) { var p = 1; while (p < n) p <<= 1; return p; }

  // Returns {left, right} Float32Arrays of length nSamples.
  // huggins=false gives diotic noise (right = left).
  function noisePair(nSamples, fs, huggins, p) {
    var M = nextPow2(nSamples);
    var re = new Float64Array(M), im = new Float64Array(M), i;
    for (i = 0; i < M; i++) re[i] = gaussian();
    var left = new Float32Array(nSamples), right = new Float32Array(nSamples);

    if (!huggins) {
      for (i = 0; i < nSamples; i++) { left[i] = re[i]; right[i] = re[i]; }
    } else {
      var orig = Float64Array.from(re);
      fft(re, im, false);
      var lo = p.centre_hz * (1 - p.band_half_width), hi = p.centre_hz * (1 + p.band_half_width);
      for (var k = 1; k < M / 2; k++) {
        var f = k * fs / M;
        if (f >= lo && f <= hi) {          // 180 degree shift: multiply by -1 (and its mirror bin)
          re[k] = -re[k]; im[k] = -im[k];
          re[M - k] = -re[M - k]; im[M - k] = -im[M - k];
        }
      }
      fft(re, im, true);
      for (i = 0; i < nSamples; i++) { left[i] = orig[i]; right[i] = re[i]; }
    }

    // Scale both channels by the same factor (left-channel RMS) and ramp.
    var ss = 0;
    for (i = 0; i < nSamples; i++) ss += left[i] * left[i];
    var g = p.rms / Math.sqrt(ss / nSamples);
    var nRamp = Math.round(p.ramp_ms / 1000 * fs);
    for (i = 0; i < nSamples; i++) {
      var w = 1;
      if (i < nRamp) w = 0.5 - 0.5 * Math.cos(Math.PI * i / nRamp);
      else if (i >= nSamples - nRamp) w = 0.5 - 0.5 * Math.cos(Math.PI * (nSamples - 1 - i) / nRamp);
      left[i] *= g * w; right[i] *= g * w;
    }
    return { left: left, right: right };
  }

  // Three intervals with gaps; target (1-3) is the Huggins-pitch interval.
  function makeTrialBuffer(ctx, target, p) {
    var fs = ctx.sampleRate;
    var nInt = Math.round(p.interval_ms / 1000 * fs);
    var nGap = Math.round(p.gap_ms / 1000 * fs);
    var buf = ctx.createBuffer(2, 3 * nInt + 2 * nGap, fs);
    var L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (var j = 0; j < 3; j++) {
      var s = noisePair(nInt, fs, j === target - 1, p);
      L.set(s.left, j * (nInt + nGap));
      R.set(s.right, j * (nInt + nGap));
    }
    return buf;
  }

  return { fft: fft, noisePair: noisePair, makeTrialBuffer: makeTrialBuffer };
})();

// ---- Plugin: one 3AFC trial (or the worked example) ----------------------------
// Response buttons stay disabled until the sound has finished playing. "Finished"
// means the audio system reports the end of the sound AND its clock has passed
// the end time, plus the output device's own delay (e.g. Bluetooth headphones).
var jsPsychHugginsTrial = (function (jspsych) {
  "use strict";
  var info = {
    name: "huggins-trial",
    version: "1.1.0",
    parameters: {
      target: { type: jspsych.ParameterType.INT, default: 1 },
      example: { type: jspsych.ParameterType.BOOL, default: false },
      settings: { type: jspsych.ParameterType.OBJECT, default: {} },
      trial_label: { type: jspsych.ParameterType.STRING, default: "" }
    },
    data: {
      target: { type: jspsych.ParameterType.INT },
      response: { type: jspsych.ParameterType.INT },
      correct: { type: jspsych.ParameterType.BOOL },
      rt: { type: jspsych.ParameterType.INT },
      plays: { type: jspsych.ParameterType.INT },
      output_latency_ms: { type: jspsych.ParameterType.INT }
    }
  };

  class HugginsTrialPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    trial(display_element, trial) {
      var self = this;
      var api = this.jsPsych.pluginAPI;
      var p = Object.assign({}, HP_DEFAULTS, trial.settings);
      var ctx = SinAudio.ctx;
      var buffer = HugginsStim.makeTrialBuffer(ctx, trial.target, p);
      var plays = 0;
      var latency = 0;
      var labelHtml = trial.trial_label ? '<div class="hp-label">' + trial.trial_label + "</div>" : "";

      // Three numbered buttons; disabled while listening.
      function buttons(enabled, markTarget) {
        var h = '<div class="hp-boxes">';
        for (var i = 1; i <= 3; i++) {
          h += '<button class="hp-box hp-choice' + (markTarget && i === trial.target ? " hp-target" : "") +
               '" data-choice="' + i + '"' + (enabled ? "" : " disabled") + ">" + i + "</button>";
        }
        return h + "</div>";
      }

      function setLit(n) {
        display_element.querySelectorAll(".hp-box").forEach(function (b, i) {
          b.classList.toggle("hp-lit", i + 1 === n);
        });
      }

      // Make sure the audio system is running; if the browser has it paused,
      // ask for a click (which browsers accept as permission to play sound).
      function ensureRunning(cb) {
        if (ctx.state === "running") { cb(); return; }
        Promise.resolve(ctx.resume ? ctx.resume() : null).then(function () {
          if (ctx.state === "running") { cb(); return; }
          display_element.innerHTML = '<div class="sin-text" style="font-size:22px">' +
            "Sound is paused by your browser.<br><br>" +
            '<button class="jspsych-btn" id="hp-enable">Click to turn on sound</button></div>';
          display_element.querySelector("#hp-enable").onclick = function () {
            ctx.resume().then(function () { ensureRunning(cb); });
          };
        });
      }

      // Plays the trial, lighting each numbered box as its interval sounds,
      // and calls onDone only once the whole sound has been heard.
      function play(onDone) {
        ensureRunning(function () {
          plays++;
          latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
          display_element.innerHTML = '<div class="sin-text">' + labelHtml + "Listen&hellip;" +
            buttons(false, false) + "</div>";

          var t0 = ctx.currentTime + 0.3;
          var tEnd = t0 + buffer.duration;
          var src = SinAudio.play(buffer, t0);
          var step = (p.interval_ms + p.gap_ms) / 1000;
          var msUntil = function (t) { return Math.max(0, (t - ctx.currentTime + latency) * 1000); };

          [0, 1, 2].forEach(function (j) {
            api.setTimeout(function () { setLit(j + 1); }, msUntil(t0 + j * step));
            api.setTimeout(function () { setLit(0); }, msUntil(t0 + j * step + p.interval_ms / 1000));
          });

          var ended = false, clockPassed = false, finished = false;
          var finish = function () {
            if (finished || !ended || !clockPassed) return;
            finished = true;
            setLit(0);
            api.setTimeout(onDone, latency * 1000 + 300);
          };
          src.onended = function () { ended = true; finish(); };
          // The audio clock only advances while sound is actually being output,
          // so this cannot pass early (e.g. if the tab is hidden mid-trial).
          (function checkClock() {
            if (ctx.currentTime >= tEnd) { clockPassed = true; finish(); }
            else api.setTimeout(checkClock, 50);
          })();
        });
      }

      if (trial.example) {
        var showExample = function () {
          display_element.innerHTML = '<div class="sin-text" style="font-size:22px;max-width:760px">' +
            "In this example, the faint tone was in <b>sound " + trial.target + "</b>." +
            buttons(false, true) +
            "Listen again if you like. The tone is quiet, so it may take a couple of tries to notice it.<br><br>" +
            '<button class="jspsych-btn" id="hp-again">Play again</button> ' +
            '<button class="jspsych-btn" id="hp-continue">Continue</button></div>';
          display_element.querySelector("#hp-again").onclick = function () { play(showExample); };
          display_element.querySelector("#hp-continue").onclick = function () {
            display_element.innerHTML = "";
            self.jsPsych.finishTrial({ target: trial.target, plays: plays,
              output_latency_ms: Math.round(latency * 1000) });
          };
        };
        play(showExample);
        return;
      }

      play(function () {
        display_element.innerHTML = '<div class="sin-text" style="font-size:22px">' + labelHtml +
          "Which sound contained the faint tone?" + buttons(true, false) + "</div>";
        var tStart = performance.now();
        display_element.querySelectorAll(".hp-choice").forEach(function (btn) {
          btn.onclick = function () {
            var r = parseInt(btn.getAttribute("data-choice"), 10);
            display_element.innerHTML = "";
            self.jsPsych.finishTrial({
              target: trial.target, response: r, correct: r === trial.target,
              rt: Math.round(performance.now() - tStart), plays: plays,
              output_latency_ms: Math.round(latency * 1000)
            });
          };
        });
      });
    }
  }
  HugginsTrialPlugin.info = info;
  return HugginsTrialPlugin;
})(jsPsychModule);

// ---- Timeline builder ----------------------------------------------------------
// Returns { timeline, passed() }. Put `timeline` in your experiment and use
// passed() in a conditional_function to gate what comes next.
function buildHeadphoneScreen(jsPsych, options) {
  var p = Object.assign({}, HP_DEFAULTS, options || {});
  var state = { attempt: 0, passed: false, score: 0 };

  var text = function (html) {
    return '<div class="sin-text" style="font-size:22px;max-width:760px">' + html + "</div>";
  };

  var intro = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: text(
      "<b>Headphone check</b><br><br>" +
      "On each trial you will hear three bursts of noise. One of them has a faint tone hidden in it.<br>" +
      "Your task is to decide which noise (1, 2 or 3) contained the tone.<br><br>" +
      "This check only works with headphones, so please make sure you are wearing them.<br><br>" +
      "First, an example. Press the spacebar to hear it."),
    choices: [" "],
    on_finish: function (d) { SinAudio.resume(); d.task = "headphone_intro"; }
  };

  var example = {
    type: jsPsychHugginsTrial,
    target: function () { return 1 + Math.floor(Math.random() * 3); },
    example: true,
    settings: p,
    on_finish: function (d) { d.task = "headphone_example"; }
  };

  var testIntro = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      var again = state.attempt > 1 ? "Let's try once more.<br><br>" : "";
      return text(again + "Now the real check: " + p.n_trials + " trials.<br>" +
        "Each sound is played <b>once</b>, so please listen carefully, then click 1, 2 or 3.<br><br>" +
        "Press the spacebar to start.");
    },
    choices: [" "],
    on_finish: function (d) { d.task = "headphone_test_intro"; }
  };

  // Target positions balanced within an attempt (e.g. each position twice in 6 trials).
  var targets = [];
  for (var i = 0; i < p.n_trials; i++) targets.push((i % 3) + 1);
  var trialIdx = 0;

  var testTrial = {
    type: jsPsychHugginsTrial,
    target: jsPsych.timelineVariable("target"),
    settings: p,
    trial_label: function () { return "Trial " + (trialIdx + 1) + " of " + p.n_trials; },
    on_finish: function (d) {
      trialIdx++;
      d.task = "headphone_trial";
      d.attempt = state.attempt;
    }
  };

  var startAttempt = {
    type: jsPsychCallFunction,
    func: function () { state.attempt++; trialIdx = 0; },
    on_finish: function (d) { d.task = "headphone_attempt_start"; }
  };

  var scoreAttempt = {
    type: jsPsychCallFunction,
    func: function () {
      state.score = jsPsych.data.get()
        .filter({ task: "headphone_trial", attempt: state.attempt })
        .filter({ correct: true }).count();
      state.passed = state.score >= p.pass_threshold;
    },
    on_finish: function (d) {
      Object.assign(d, { task: "headphone_result", attempt: state.attempt,
        hp_score: state.score, hp_threshold: p.pass_threshold, hp_passed: state.passed });
    }
  };

  var attempt = {
    timeline: [startAttempt, testIntro, {
      timeline: [testTrial],
      timeline_variables: targets.map(function (t) { return { target: t }; }),
      randomize_order: true
    }, scoreAttempt],
    loop_function: function () { return !state.passed && state.attempt < p.max_attempts; }
  };

  return {
    timeline: [intro, example, attempt],
    passed: function () { return state.passed; },
    score: function () { return state.score; }
  };
}
