/** Display name shown in Gmail toolbar and card headers. */
var ADDON_NAME = "Quill Draft";

/**
 * Primary actions — teal to match addOns.common.layoutProperties in appsscript.json
 * (distinct from default Gmail / Google blues).
 */
var ACCENT_BUTTON = "#0d9488";
/** Card header + manifest logo: neutral “writing” icon, not the Gmail product mark. */
var BRAND_HEADER_ICON_URL =
  "https://www.gstatic.com/images/icons/material/system/1x/edit_note_black_48dp.png";

/** OpenAI Chat Completions model for reply drafts. */
var OPENAI_MODEL = "gpt-5.4-mini";

/** Script property name for the API key (Project settings → Script properties). */
var OPENAI_API_KEY_PROPERTY = "OPENAI_API_KEY";

/** User cache prefix so Insert uses the same draft as the card preview. */
var DRAFT_CACHE_PREFIX = "quill_draft_v1_";

/** Max characters of thread body sent to the model (keeps requests bounded). */
var OPENAI_MAX_BODY_CHARS = 32000;

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
    var fromAddr = message.getFrom() || "";
    var draftBody =
      getCachedDraftForMessage_(message.getId()) ||
      buildSuggestedReplyPlain_(subject, plain, fromAddr, message.getId());
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
  var suggestion = buildSuggestedReplyPlain_(subject, plain, from, message.getId());
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
    .setImageUrl(BRAND_HEADER_ICON_URL)
    .setImageStyle(CardService.ImageStyle.SQUARE)
    .setImageAltText(ADDON_NAME + " add-on");
}

/**
 * Builds a reply draft: OpenAI when OPENAI_API_KEY is set, otherwise a small static fallback.
 * Caches the result per message so "Insert draft" matches the card.
 */
function buildSuggestedReplyPlain_(subject, plainBody, fromAddr, messageId) {
  var draft = fetchSuggestedReplyFromOpenAI_(subject, plainBody, fromAddr);
  if (!draft) {
    draft = buildStaticFallbackReply_(subject, plainBody);
  }
  if (messageId) {
    cacheDraftForMessage_(messageId, draft);
  }
  return draft;
}

function buildStaticFallbackReply_(subject, plainBody) {
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

function normalizeChatContent_(content) {
  if (content == null) {
    return "";
  }
  if (typeof content === "string") {
    return content.replace(/^\s+|\s+$/g, "");
  }
  if (Object.prototype.toString.call(content) === "[object Array]") {
    var parts = [];
    for (var i = 0; i < content.length; i++) {
      var p = content[i];
      if (p && typeof p.text === "string") {
        parts.push(p.text);
      } else if (typeof p === "string") {
        parts.push(p);
      }
    }
    return parts.join("").replace(/^\s+|\s+$/g, "");
  }
  return "";
}

function getOpenAIApiKey_() {
  return PropertiesService.getScriptProperties().getProperty(OPENAI_API_KEY_PROPERTY);
}

function cacheDraftForMessage_(messageId, draftText) {
  if (!messageId || !draftText) {
    return;
  }
  try {
    CacheService.getUserCache().put(DRAFT_CACHE_PREFIX + messageId, draftText, 600);
  } catch (err) {
    Logger.log("cacheDraftForMessage_: " + err);
  }
}

function getCachedDraftForMessage_(messageId) {
  if (!messageId) {
    return null;
  }
  try {
    return CacheService.getUserCache().get(DRAFT_CACHE_PREFIX + messageId) || null;
  } catch (err) {
    Logger.log("getCachedDraftForMessage_: " + err);
    return null;
  }
}

function fetchSuggestedReplyFromOpenAI_(subject, plainBody, fromAddr) {
  var apiKey = getOpenAIApiKey_();
  if (!apiKey) {
    return null;
  }

  var stripped = stripQuotedReply_(plainBody || "");
  if (stripped.length > OPENAI_MAX_BODY_CHARS) {
    stripped = stripped.substring(0, OPENAI_MAX_BODY_CHARS) + "\n…";
  }
  var subj = (subject || "").replace(/\s+/g, " ").trim() || "(no subject)";
  var fromLine = (fromAddr || "").replace(/\s+/g, " ").trim() || "(unknown)";

  var userPrompt =
    "From: " +
    fromLine +
    "\nSubject: " +
    subj +
    "\n\nMessage (quoted sections may be omitted):\n" +
    (stripped || "(empty)");

  var systemPrompt =
    "You are a helpful email assistant. Draft a reply body in plain text only—no subject line, " +
    "no markdown code fences unless the thread clearly needs them. Match tone to the thread " +
    "(professional, friendly, concise, or detailed as appropriate). Anticipate likely questions " +
    "and next steps; be proactive but accurate. Do not invent facts, meetings, or commitments " +
    "not implied by the message. If the sender asked for something specific, address it directly. " +
    "Output only the reply text—no preamble like \"Here is a draft\".";

  var payload = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_completion_tokens: 2048
  };

  try {
    var response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    var raw = response.getContentText();
    if (code !== 200) {
      Logger.log("OpenAI error HTTP " + code + ": " + raw.substring(0, 800));
      return null;
    }
    var data = JSON.parse(raw);
    var choice = data.choices && data.choices[0];
    var msg = choice && choice.message;
    var text = normalizeChatContent_(msg && msg.content);
    if (!text.replace(/\s/g, "")) {
      Logger.log("OpenAI empty content");
      return null;
    }
    return text;
  } catch (err) {
    Logger.log("fetchSuggestedReplyFromOpenAI_: " + err);
    return null;
  }
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
