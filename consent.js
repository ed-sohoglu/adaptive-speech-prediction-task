/* consent.js: combined information and consent sheet.

   Shown before jsPsych starts, so nothing is recorded, stored in the browser or
   sent to DataPipe unless the participant agrees. Declining ends the study with
   no data saved.

   Anything in [square brackets] is shown highlighted in yellow so unfilled
   placeholders are easy to spot. Change INFO_SHEET_VERSION whenever the wording
   changes; it is saved with the data.

   Saved with every data row:
     consent_given        true
     consent_time         when the participant clicked to continue
     info_sheet_version   INFO_SHEET_VERSION below */

var INFO_SHEET_VERSION = "v1 [date]";

// Student researchers: used on the information sheet and the debrief page
var STUDENT_RESEARCHERS = [
  { name: "[student researcher 1]", email: "[email 1]@sussex.ac.uk" },
  { name: "[student researcher 2]", email: "[email 2]@sussex.ac.uk" }
];
var ETHICS_REFERENCE = "[study ID]";

var INFO_CONSENT_HTML =
  "<h1>Information &amp; consent sheet</h1>" +
  "<p class='c-sub'>School of Psychology, University of Sussex &middot; Ethics reference: " + ETHICS_REFERENCE + "</p>" +

  "<h2>Invitation to take part</h2>" +
  "<p>You are being invited to take part in a research study to further our understanding of which " +
  "personality traits and cognitive factors determine how well a person understands noisy speech. " +
  "Thank you for carefully reading this information sheet, a copy of which you can keep for your records " +
  "(use the <b>Print or save a copy</b> button at the bottom of this page). This study is being conducted by " +
  "student researchers, " + STUDENT_RESEARCHERS.map(function (r) { return r.name + " (" + r.email + ")"; }).join(", ") +
  ", and project supervisor Dr Ediz Sohoglu from the School of Psychology, " +
  "University of Sussex, who are happy to be contacted if you have any questions.</p>" +

  "<h2>Requirements for the study</h2>" +
  "<p>We are seeking adults who have no history of hearing difficulties. We will also require you to wear " +
  "headphones or earphones (ideally wired rather than Bluetooth).</p>" +

  "<h2>Why have I been invited to take part and what will I do?</h2>" +
  "<p>The test will take around 30 minutes. It starts with a short check that your headphones are working. " +
  "If the check suggests your setup won\u2019t work for this study, it will end there. For the main task, you " +
  "will hear noisy speech and make a simple decision about those sounds (\u201CWhich word was clearer?\u201D). " +
  "You will also complete questionnaires analysing personality traits and " +
  "basic demographics (your first language, age in years, handedness and the gender you identify with). " +
  "By participating in this study, you can request to be entered in a raffle for a cash prize of \u00A325 by " +
  "emailing one of the researchers.</p>" +

  "<h2>What will happen to the results and my personal information?</h2>" +
  "<p>The results of this research may be written into a scientific report for a BSc Psychology dissertation, " +
  "and potentially, also for publication. We anticipate being able to provide a summary of our findings on " +
  "request from 01/06/2027 (by emailing one of the email addresses shown above). Your anonymity will be " +
  "ensured in the way described in the consent information below. Please read this information carefully " +
  "and then, if you wish to take part, please tick the box at the bottom of this page to show you have fully " +
  "understood this sheet, and that you consent to take part in the study as it is described here.</p>" +

  "<h2>Consent</h2>" +
  "<ul class='c-list'>" +
  "<li>I understand that by clicking below I am agreeing to take part in the University of Sussex research " +
  "described here, and that I have read and understood this information sheet.</li>" +
  "<li>I understand that my participation is entirely voluntary, that I can choose not to participate in part " +
  "or all of the study, and that I can withdraw at any stage without having to give a reason and without being " +
  "penalised in any way (e.g., if I am a student, my decision whether or not to take part will not affect my grades). " +
  "I understand that if I stop before the end, my partial responses will not be used.</li>" +
  "<li>I understand that since the study is anonymous, it will be impossible to withdraw my data once I have " +
  "completed and submitted the test/questionnaire.</li>" +
  "<li>I consent to the processing of my data for the purposes of this research study. I understand that such " +
  "information will be treated as strictly confidential (subject to legal limitations) and handled in accordance " +
  "with data protection legislation.</li>" +
  "<li>I understand that the researchers will not collect or have access to my IP address. However, the study " +
  "will record basic technical information about my browser and device (such as screen size and browser type) " +
  "and store a random code in my browser, to check that each person takes part only once.</li>" +
  "<li>I understand that my collected data will be stored in a de-identified way (e.g. using ID numbers not names), " +
  "and stored securely on a University server. De-identified data may be made publicly available through online " +
  "data repositories or at the request of other researchers.</li>" +
  "<li>I understand that my identity will remain confidential in any written reports of this research, and that no " +
  "information I disclose will lead to the identification in those reports of any individual either by the " +
  "researchers or by any other party, without first obtaining my written permission.</li>" +
  "<li>I understand that my data may be used again in future studies if these have gained independent ethical " +
  "approval, based on the strict confidentiality terms described above.</li>" +
  "</ul>";

// The tick box(es). "required" boxes must be ticked to continue; each box's
// key is saved in the data as true/false.
var CONSENT_BOXES = [
  { key: "consent_given", required: true,
    text: "Please tick this box if you have fully understood this sheet, and that you consent to take part in the study." }
];

var Consent = (function () {
  function highlightPlaceholders(html) {
    return html.replace(/\[([^\]]+)\]/g, '<mark class="c-todo">[$1]</mark>');
  }

  function shell(inner) {
    document.body.innerHTML = '<div class="c-page">' + inner + "</div>";
    window.scrollTo(0, 0);
    return document.body.querySelector(".c-page");
  }

  // Returns a Promise that resolves (only) if the participant consents.
  function run() {
    return new Promise(function (resolve) {
      var boxesHtml = CONSENT_BOXES.map(function (b, i) {
        return '<label class="c-check' + (b.required ? " c-required" : "") + '"><input type="checkbox" data-i="' + i + '">' +
          "<span>" + highlightPlaceholders(b.text) +
          (b.required ? "" : ' <span class="c-optional">(optional)</span>') + "</span></label>";
      }).join("");

      var el = shell(highlightPlaceholders(INFO_CONSENT_HTML) + boxesHtml +
        '<div class="c-actions">' +
        '<button class="c-btn" id="c-print">Print or save a copy</button>' +
        '<button class="c-btn c-primary" id="c-agree" disabled>Continue to the study</button></div>' +
        '<p class="c-hint" id="c-hint">Tick the final box to continue.</p>' +
        '<p class="c-decline"><button class="c-link" id="c-no">I do not wish to take part</button></p>');

      var inputs = el.querySelectorAll("input[type=checkbox]");
      var agree = el.querySelector("#c-agree");
      var update = function () {
        var ok = CONSENT_BOXES.every(function (b, i) { return !b.required || inputs[i].checked; });
        agree.disabled = !ok;
        el.querySelector("#c-hint").style.visibility = ok ? "hidden" : "visible";
      };
      inputs.forEach(function (x) { x.onchange = update; });

      el.querySelector("#c-print").onclick = function () { window.print(); };
      el.querySelector("#c-no").onclick = function () {
        shell("<h1>Thank you</h1><p>You have chosen not to take part. No data have been recorded, " +
          "and you can now close this window.</p>");
      };
      agree.onclick = function () {
        var out = { consent_time: new Date().toISOString(), info_sheet_version: INFO_SHEET_VERSION };
        CONSENT_BOXES.forEach(function (b, i) { out[b.key] = inputs[i].checked; });
        document.body.innerHTML = "";
        resolve(out);
      };
    });
  }

  return { run: run, highlight: highlightPlaceholders };
})();
