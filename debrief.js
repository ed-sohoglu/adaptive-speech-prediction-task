/* debrief.js: debrief page at the end of the study.

   Shown to everyone who reaches the end (not to people screened out by the
   headphone check). It comes before the data are finally submitted, so the
   participant can withdraw here: "Withdraw my responses" asks for confirmation,
   then marks the session as withdrawn (column withdrawn = true, and a
   "withdrawn" flag in the integrity summary). Delete those files before analysis.

   The researchers' names and emails come from STUDENT_RESEARCHERS in consent.js.
   The questionnaire paragraph is only shown if the questionnaires ran in this
   session. */

var DEBRIEF_LINKS = [
  { url: "https://mentalhealth-uk.org/help-and-information/conditions/schizophrenia/useful-contacts/",
    label: "Mental Health UK: useful contacts" },
  { url: "https://www.mind.org.uk/information-support/tips-for-everyday-living/autism-and-mental-health/",
    label: "Mind: autism and mental health" }
];

function buildDebrief(jsPsych, opts) {
  opts = opts || {};
  var withdrawn = false;

  function researcherList() {
    return STUDENT_RESEARCHERS.map(function (r) {
      return r.name + " (" + r.email + ")";
    }).join(" or ");
  }

  function debriefHtml() {
    var h = '<div class="c-page d-page">' +
      "<h1>Debrief information</h1>" +
      "<p><b>Thank you very much for taking part in our research!</b></p>" +

      "<h2>Study aims</h2>" +
      "<p>In this study, we are interested in which personality traits and cognitive factors determine how well " +
      "a person understands noisy speech. Do not feel concerned if you found the speech task difficult as it was " +
      "meant to be challenging.</p>";

    if (opts.questionnairesRan) {
      h += "<p>Two of the questionnaires assessed autistic traits and schizotypal traits, as two of our research aims " +
        "are to investigate the effect of these traits on speech perception. These questionnaires do not provide a " +
        "clinical diagnosis but only assess personality traits. You were not informed of this prior to the study, as " +
        "the information may have affected your answers. If you feel distressed or feel like you require further " +
        "support, please contact your GP. Please also see below for links to helpful support resources.</p>" +
        '<ul class="d-links">' + DEBRIEF_LINKS.map(function (l) {
          return '<li><a href="' + l.url + '" target="_blank" rel="noopener">' + l.label + "</a> " +
            '<span class="d-url">' + l.url + "</span></li>";
        }).join("") + "</ul>" +
        '<p class="d-note">Links open in a new tab, so you won\u2019t lose this page.</p>';
    }

    h += "<h2>Raffle</h2>" +
      "<p>If you wish to be entered in the raffle for a cash prize of \u00A325, please email one of the researchers, " +
      researcherList() + ", notifying them that you completed the study and that you wish to take part in the raffle.</p>" +

      "<h2>Option to withdraw</h2>" +
      "<p>If at this point you would like to withdraw your responses for any reason so they are not included in any " +
      "of the analyses, please click <b>Withdraw my responses</b> below. We will permanently delete your data before " +
      "any analysis begins. Once you click <b>Finish</b>, your responses are submitted and, because the study is " +
      "anonymous, can no longer be withdrawn.</p>" +

      '<div class="c-actions">' +
      '<button class="c-btn" id="d-print">Print or save a copy</button>' +
      '<button class="c-btn c-primary" id="d-finish">Finish and submit my responses</button></div>' +
      '<p class="c-decline"><button class="c-link" id="d-withdraw">Withdraw my responses</button></p>' +
      "</div>";
    return Consent.highlight(h);
  }

  return {
    timeline: [{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () { return '<div id="d-root">' + debriefHtml() + "</div>"; },
      choices: "NO_KEYS",
      on_load: function () {
        window.scrollTo(0, 0);
        var el = jsPsych.getDisplayElement();
        var finish = function () { jsPsych.finishTrial({ withdrawn: withdrawn }); };
        var showMain = function () {
          el.querySelector("#d-root").innerHTML = debriefHtml();
          window.scrollTo(0, 0);
          wire();
        };
        var wire = function () {
          el.querySelector("#d-print").onclick = function () { window.print(); };
          el.querySelector("#d-finish").onclick = finish;
          el.querySelector("#d-withdraw").onclick = function () {
            el.querySelector("#d-root").innerHTML =
              '<div class="c-page d-page"><h1>Withdraw your responses?</h1>' +
              "<p>Your responses will be marked for deletion and permanently deleted before any analysis begins. " +
              "They will not be included in the study.</p>" +
              '<div class="c-actions"><button class="c-btn" id="d-back">No, go back</button>' +
              '<button class="c-btn c-primary" id="d-confirm">Yes, withdraw my responses</button></div></div>';
            window.scrollTo(0, 0);
            el.querySelector("#d-back").onclick = showMain;
            el.querySelector("#d-confirm").onclick = function () { withdrawn = true; finish(); };
          };
        };
        wire();
      },
      on_finish: function (d) { d.task = "debrief"; d.withdrawn = withdrawn; }
    }],
    withdrawn: function () { return withdrawn; }
  };
}
