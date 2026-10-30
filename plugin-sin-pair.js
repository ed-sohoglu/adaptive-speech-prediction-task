/* plugin-sin-pair.js
   One trial of the speech-in-noise clarity task (port of Experiment_SiN.m):
     context text (or blank) -> blank -> sound 1 -> gap -> sound 2 -> blank
     -> prompt -> keyboard response -> ITI
   Sounds are played with the Web Audio API and scheduled on the audio clock,
   so the gaps between words are sample-accurate. */

// ---- Shared audio loader / cache -------------------------------------------
var SinAudio = (function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = new AC();
  var cache = {}; // url -> Promise<AudioBuffer>

  function decode(arrayBuffer) {
    return new Promise(function (resolve, reject) {
      ctx.decodeAudioData(arrayBuffer, resolve, reject); // callback form works in older Safari too
    });
  }

  function load(url) {
    if (!cache[url]) {
      cache[url] = fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error("Could not load " + url + " (HTTP " + r.status + ")");
          return r.arrayBuffer();
        })
        .then(decode)
        .catch(function (err) {
          delete cache[url]; // allow a retry
          throw err;
        });
    }
    return cache[url];
  }

  function loadMany(urls, tries) {
    return Promise.all(urls.map(load)).catch(function (err) {
      if (tries > 1) {
        return new Promise(function (r) { setTimeout(r, 500); }).then(function () {
          return loadMany(urls, tries - 1);
        });
      }
      throw err;
    });
  }

  function prefetch(urls) { urls.forEach(function (u) { load(u).catch(function () {}); }); }

  function resume() { if (ctx.state !== "running" && ctx.resume) ctx.resume(); }

  function play(buffer, when) {
    var s = ctx.createBufferSource();
    s.buffer = buffer;
    s.connect(ctx.destination);
    s.start(when || 0);
    return s;
  }

  return { ctx: ctx, load: load, loadMany: loadMany, prefetch: prefetch, resume: resume, play: play };
})();

// ---- Plugin -----------------------------------------------------------------
var jsPsychSinPair = (function (jspsych) {
  "use strict";

  var info = {
    name: "sin-pair",
    version: "1.0.0",
    parameters: {
      sound1: { type: jspsych.ParameterType.STRING, default: undefined },
      sound2: { type: jspsych.ParameterType.STRING, default: undefined },
      context_text: { type: jspsych.ParameterType.HTML_STRING, default: "" },
      context_duration: { type: jspsych.ParameterType.INT, default: 500 },
      pre_sound_delay: { type: jspsych.ParameterType.INT, default: 500 },
      gap: { type: jspsych.ParameterType.INT, default: 500 },
      post_sound_delay: { type: jspsych.ParameterType.INT, default: 500 },
      prompt: { type: jspsych.ParameterType.HTML_STRING, default: "" },
      choices: { type: jspsych.ParameterType.KEYS, default: ["ArrowLeft", "ArrowRight"] },
      iti: { type: jspsych.ParameterType.INT, default: 1000 }
    },
    data: {
      response: { type: jspsych.ParameterType.STRING },
      rt: { type: jspsych.ParameterType.INT },
      sound1_onset: { type: jspsych.ParameterType.FLOAT },
      sound1_offset: { type: jspsych.ParameterType.FLOAT },
      sound2_onset: { type: jspsych.ParameterType.FLOAT },
      sound2_offset: { type: jspsych.ParameterType.FLOAT },
      load_error: { type: jspsych.ParameterType.STRING }
    }
  };

  class SinPairPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    trial(display_element, trial) {
      var self = this;
      var api = this.jsPsych.pluginAPI;
      var ctx = SinAudio.ctx;
      var show = function (html) {
        display_element.innerHTML = '<div class="sin-text">' + (html || "") + "</div>";
      };
      var data = {};

      show("");
      var loadingMsg = api.setTimeout(function () { show("Loading&hellip;"); }, 300);

      SinAudio.loadMany([trial.sound1, trial.sound2], 3).then(function (bufs) {
        clearTimeout(loadingMsg);
        SinAudio.resume();

        // Context word (or blank)
        show(trial.context_text);
        api.setTimeout(function () {
          show("");

          // Schedule both sounds on the audio clock
          var t1 = ctx.currentTime + trial.pre_sound_delay / 1000;
          SinAudio.play(bufs[0], t1);
          var t2 = t1 + bufs[0].duration + trial.gap / 1000;
          SinAudio.play(bufs[1], t2);
          var tEnd = t2 + bufs[1].duration;

          data.sound1_onset = t1;
          data.sound1_offset = t1 + bufs[0].duration;
          data.sound2_onset = t2;
          data.sound2_offset = tEnd;

          api.setTimeout(function () {
            show(trial.prompt);
            api.getKeyboardResponse({
              callback_function: function (info) {
                show("");
                data.response = info.key;
                data.rt = Math.round(info.rt);
                api.setTimeout(function () {
                  display_element.innerHTML = "";
                  self.jsPsych.finishTrial(data);
                }, trial.iti);
              },
              valid_responses: trial.choices,
              rt_method: "performance",
              persist: false,
              allow_held_key: false
            });
          }, (tEnd - ctx.currentTime) * 1000 + trial.post_sound_delay);
        }, trial.context_duration);
      }).catch(function (err) {
        clearTimeout(loadingMsg);
        data.load_error = String(err && err.message ? err.message : err);
        show("Sorry, the sounds could not be loaded.<br><br>" +
          '<span style="font-size:18px">' + data.load_error + "</span>");
        self.jsPsych.finishTrial(data);
      });
    }
  }
  SinPairPlugin.info = info;

  return SinPairPlugin;
})(jsPsychModule);
