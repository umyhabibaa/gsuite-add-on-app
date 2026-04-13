/** Display name shown in Gmail toolbar and card headers. */
var ADDON_NAME = "Quill Draft";

/** Accent used for primary button (CardService accepts #RRGGBB). */
var ACCENT_BUTTON = "#4f46e5";

function onHomepage(e) {
  return [buildHomeOrWaitCard_(e)];
}

function onGmailMessageOpen(e) {
  if (!e || !e.gmail || !e.gmail.accessToken || !e.gmail.messageId) {
    return [buildWaitForMessageCard_()];
  }
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    var message = GmailApp.getMessageById(e.gmail.messageId);
    return [buildReplyDraftCard_(message)];
  } catch (err) {
    return [buildErrorCard_(err && err.message ? err.message : String(err))];
  }
}

function insertSuggestedReplyDraft(e) {
  if (!e || !e.gmail || !e.gmail.accessToken || !e.gmail.messageId) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Open an email in Gmail first, then use Quill Draft from the side panel."
        )
      )
      .build();
  }
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    var message = GmailApp.getMessageById(e.gmail.messageId);
    var plain = message.getPlainBody();
    var subject = message.getSubject();
    var draftBody = buildSuggestedReplyPlain_(subject, plain);
    var draft = message.createDraftReply(draftBody);
    return CardService.newComposeActionResponseBuilder().setGmailDraft(draft).build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Could not create draft: " + (err && err.message ? err.message : String(err))
        )
      )
      .build();
  }
}

function buildHomeOrWaitCard_(e) {
  var host = e && e.commonEventObject && e.commonEventObject.hostApp;
  if (host === "GMAIL") {
    return buildWaitForMessageCard_();
  }
  return buildNonGmailCard_();
}

function buildWaitForMessageCard_() {
  return CardService.newCardBuilder()
    .setHeader(brandHeader_("Open a message", "Select any email to read it and shape a reply draft."))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newDecoratedText()
            .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
            .setTopLabel("How it works")
            .setText(
              "Click a conversation in your inbox. Quill Draft appears here with a suggested reply you can drop into the composer—nothing sends until you press Send."
            )
            .setWrapText(true)
        )
        .addWidget(CardService.newDivider())
        .addWidget(
          CardService.newDecoratedText()
            .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
            .setTopLabel("Tip")
            .setText("Pin this add-on in Gmail for one-click access while triaging mail.")
            .setWrapText(true)
        )
    )
    .build();
}

function buildNonGmailCard_() {
  return CardService.newCardBuilder()
    .setHeader(brandHeader_("Gmail only", "Quill Draft lives in your inbox."))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newDecoratedText()
            .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.MAP_PIN))
            .setTopLabel("Switch to Gmail")
            .setText(
              "Open mail.google.com, choose a message, then launch this add-on from the right sidebar."
            )
            .setWrapText(true)
        )
    )
    .build();
}

function buildReplyDraftCard_(message) {
  var subject = message.getSubject() || "(no subject)";
  var from = message.getFrom() || "";
  var plain = message.getPlainBody() || "";
  var preview = truncateForCard_(stripQuotedReply_(plain), 720);
  var suggestion = buildSuggestedReplyPlain_(subject, plain);
  var suggestionPreview = truncateForCard_(suggestion, 1100);

  return CardService.newCardBuilder()
    .setHeader(
      brandHeader_(
        "Your draft is ready",
        "Review the thread, then insert into reply—edit before you send."
      )
    )
    .addSection(
      CardService.newCardSection()
        .setHeader("Thread")
        .setCollapsible(true)
        .setNumUncollapsibleWidgets(2)
        .addWidget(
          CardService.newDecoratedText()
            .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON))
            .setTopLabel("From")
            .setText(from || "Unknown")
            .setWrapText(true)
        )
        .addWidget(
          CardService.newDecoratedText()
            .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
            .setTopLabel("Subject")
            .setText(subject)
            .setWrapText(true)
        )
        .addWidget(CardService.newDivider())
        .addWidget(
          CardService.newTextParagraph().setText(preview || "(empty body)")
        )
    )
    .addSection(
      CardService.newCardSection()
        .setHeader("Suggested reply")
        .addWidget(CardService.newTextParagraph().setText(suggestionPreview))
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            "Insert opens Gmail's reply box with this text as a draft."
          )
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Insert draft into reply")
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setBackgroundColor(ACCENT_BUTTON)
            .setOnClickAction(
              CardService.newAction().setFunctionName("insertSuggestedReplyDraft")
            )
        )
    )
    .build();
}

function buildErrorCard_(msg) {
  return CardService.newCardBuilder()
    .setHeader(brandHeader_("Something went wrong", "Try reopening the message."))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(msg))
    )
    .build();
}

function brandHeader_(subtitle, hint) {
  return CardService.newCardHeader()
    .setTitle(ADDON_NAME)
    .setSubtitle(hint ? subtitle + " · " + hint : subtitle)
    .setImageUrl(
      "https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png"
    )
    .setImageStyle(CardService.ImageStyle.SQUARE)
    .setImageAltText(ADDON_NAME);
}

function buildSuggestedReplyPlain_(subject, plainBody) {
  var body = stripQuotedReply_(plainBody);
  body = body.replace(/\s+/g, " ").trim();
  var subj = (subject || "").replace(/\s+/g, " ").trim() || "(no subject)";

  var lines = [
    "Hi,",
    "",
    "Thanks for your message" +
      (subj !== "(no subject)" ? ' about "' + subj + '".' : "."),
    ""
  ];
  if (body) {
    lines.push(
      "I've read your note and will follow up soon. Let me know if you need anything urgently."
    );
    lines.push("");
  }
  lines.push("Best regards");
  return lines.join("\n");
}

function stripQuotedReply_(text) {
  if (!text) {
    return "";
  }
  var lines = text.split(/\r?\n/);
  var kept = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^>+\s?/.test(line)) {
      continue;
    }
    if (/^On .+ wrote:$/i.test(line.trim())) {
      break;
    }
    if (/^-{3,}\s*Forwarded message\s*-{3,}/i.test(line)) {
      break;
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function truncateForCard_(text, maxLen) {
  if (!text || text.length <= maxLen) {
    return text;
  }
  return text.substring(0, maxLen - 1) + "…";
}
