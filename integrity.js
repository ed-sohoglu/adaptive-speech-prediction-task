/* integrity.js: evidence for checking that sessions come from real, separate,
   attentive participants. Nothing here blocks anyone; it records information
   and raises flags for you to review.

   Added to every data row (so even unfinished sessions have it):
     browser_id               random code stored in this browser the first time
                              the study is opened; the same browser keeps it
     browser_sessions_before  how many times the study was started before in this browser
     browser_previous_ids     participant IDs used before in this browser ("+"-separated)
     screen, window_size, timezone, language, touch, user_agent, start_time

   A final "integrity_summary" row adds duration and quality measures, and
   integrity_flags, a "+"-separated list of anything unusual (empty = nothing).

   Private browsing or clearing the browser's data resets browser_id, so treat
   these as evidence alongside the participant-ID checks, not as proof. */

var INTEGRITY_THRESHOLDS = {
  fast_rt_ms: 250,               // speech responses faster than this count as "fast"
  max_prop_fast_rt: 0.25,        // flag if more than this proportion are fast
  min_key_balance: 0.1,          // flag if fewer than 10% (or more than 90%) left-arrow presses
  aq_straightline_run: 20,       // flag if this many consecutive AQ answers are identical
  min_seconds_per_item: 1.5,     // flag questionnaires answered faster than this per item
  max_tab_leaves: 5              // flag if the participant left the tab more often than this
};

var Integrity = (function () {
  var KEY_ID = "sin_browser_id", KEY_COUNT = "sin_session_count", KEY_IDS = "sin_participant_ids";

  function randomCode(n) {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", out = "";
    var bytes = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    for (var i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
    return out;
  }

  // Call once at the start, with the participant ID from the link.
  function startSession(participantId) {
    var rec = { browser_id: "", browser_sessions_before: "", browser_previous_ids: "" };
    try {
      var id = localStorage.getItem(KEY_ID);
      if (!id) { id = randomCode(10); localStorage.setItem(KEY_ID, id); }
      var count = parseInt(localStorage.getItem(KEY_COUNT) || "0", 10) || 0;
      var ids = JSON.parse(localStorage.getItem(KEY_IDS) || "[]");
      rec.browser_id = id;
      rec.browser_sessions_before = count;
      rec.browser_previous_ids = ids.join("+");
      localStorage.setItem(KEY_COUNT, String(count + 1));
      if (ids.indexOf(participantId) < 0) ids.push(participantId);
      localStorage.setItem(KEY_IDS, JSON.stringify(ids.slice(-50)));
    } catch (e) {
      rec.browser_id = "storage_unavailable";
    }
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { }
    rec.screen = screen.width + "x" + screen.height;
    rec.window_size = window.innerWidth + "x" + window.innerHeight;
    rec.timezone = tz;
    rec.language = navigator.language || "";
    rec.touch = (navigator.maxTouchPoints || 0) > 0;
    rec.user_agent = navigator.userAgent;
    rec.start_time = new Date().toISOString();
    rec._participant = participantId;
    rec._t0 = performance.now();
    return rec;
  }

  function median(a) {
    if (!a.length) return "";
    var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // jsPsych node that adds the summary row at the end of the session.
  function summaryNode(jsPsych, rec) {
    var T = INTEGRITY_THRESHOLDS;
    return {
      type: jsPsychCallFunction,
      func: function () { },
      on_finish: function (d) {
        var data = jsPsych.data.get(), flags = [], out = { task: "integrity_summary" };
        out.duration_min = Math.round((performance.now() - rec._t0) / 600) / 100;

        // Same browser used before for a different participant ID
        var prev = rec.browser_previous_ids ? rec.browser_previous_ids.split("+") : [];
        var others = prev.filter(function (x) { return x && x !== rec._participant; });
        out.browser_other_ids = others.length;
        if (others.length) flags.push("browser_used_for_other_ids");

        // Headphone check
        var hpRows = data.filter({ task: "headphone_result" }).values();
        if (hpRows.length) out.hp_score = hpRows[hpRows.length - 1].hp_score;

        // Speech task responses
        var trials = data.filter({ task: "trial" }).values();
        out.speech_trials = trials.length;
        if (trials.length) {
          var rts = trials.map(function (t) { return t.rt; });
          var left = trials.filter(function (t) { return jsPsych.pluginAPI.compareKeys(t.response, "ArrowLeft"); }).length;
          var fast = rts.filter(function (r) { return r < T.fast_rt_ms; }).length;
          out.speech_median_rt_ms = median(rts);
          out.speech_prop_left = Math.round(100 * left / trials.length) / 100;
          out.speech_prop_fast_rt = Math.round(100 * fast / trials.length) / 100;
          if (trials.length >= 10 && (out.speech_prop_left < T.min_key_balance || out.speech_prop_left > 1 - T.min_key_balance)) flags.push("speech_one_key");
          if (out.speech_prop_fast_rt > T.max_prop_fast_rt) flags.push("speech_fast_responses");
        }

        // Questionnaires: straight-lining on the AQ and answering speed
        var q = data.filter({ task: "questionnaire_summary" }).values()[0];
        if (q) {
          var run = 1, best = 1;
          for (var i = 2; i <= 50; i++) {
            run = q["AQ_" + i] === q["AQ_" + (i - 1)] ? run + 1 : 1;
            if (run > best) best = run;
          }
          out.aq_longest_same_run = best;
          if (best >= T.aq_straightline_run) flags.push("aq_straightlining");
        }
        var perItem = data.filter({ task: "questionnaire_page" }).values().map(function (p) {
          var n = Object.keys(p.responses || {}).filter(function (k) { return !/_(distress|distracting|frequency)$/.test(k); }).length;
          return n ? p.rt / 1000 / n : null;
        }).filter(function (x) { return x !== null; });
        if (perItem.length) {
          out.q_median_sec_per_item = Math.round(100 * median(perItem)) / 100;
          if (out.q_median_sec_per_item < T.min_seconds_per_item) flags.push("questionnaires_too_fast");
        }

        // Leaving the tab (jsPsych records focus changes automatically)
        out.tab_leaves = jsPsych.data.getInteractionData().filter({ event: "blur" }).count();
        if (out.tab_leaves > T.max_tab_leaves) flags.push("left_tab_often");

        // Withdrawal on the debrief page: delete these sessions before analysis
        var deb = data.filter({ task: "debrief" }).values()[0];
        out.withdrawn = deb ? deb.withdrawn === true : "";
        if (out.withdrawn === true) flags.unshift("withdrawn");

        out.integrity_flags = flags.join("+");
        Object.assign(d, out);
      }
    };
  }

  // The fields to attach to every row (internal values left out)
  function rowFields(rec) {
    var o = {};
    for (var k in rec) if (k.charAt(0) !== "_") o[k] = rec[k];
    return o;
  }

  return { startSession: startSession, summaryNode: summaryNode, rowFields: rowFields };
})();
