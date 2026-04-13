import http from "node:http";

const screens = {
  home: {
    title: "Quill Draft",
    subtitle: "Your draft is ready · Review the thread, then insert into reply",
    accent: "#4f46e5",
    sections: [
      {
        heading: "Thread",
        collapsible: true,
        items: [
          { kind: "meta", label: "From", value: "Alex Rivera <alex@example.com>" },
          { kind: "meta", label: "Subject", value: "Q4 roadmap check-in" },
          { kind: "divider" },
          {
            kind: "text",
            value:
              "Hey — circling back on the timeline we discussed. Can we lock the design review for next Tuesday? Happy to jump on a quick call if easier."
          }
        ]
      },
      {
        heading: "Suggested reply",
        items: [
          {
            kind: "text",
            value:
              "Hi,\n\nThanks for your message about \"Q4 roadmap check-in\".\n\nI've read your note and will follow up soon. Let me know if you need anything urgently.\n\nBest regards"
          }
        ]
      },
      {
        items: [
          {
            kind: "hint",
            value:
              "Insert opens Gmail's reply box with this text as a draft. Nothing sends until you press Send."
          },
          { kind: "cta", label: "Insert draft into reply" }
        ]
      }
    ]
  }
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quill Draft — Local Preview</title>
    <style>
      :root {
        --bg: #0f172a;
        --panel: #ffffff;
        --ink: #0f172a;
        --muted: #64748b;
        --primary: #4f46e5;
        --primary-soft: #eef2ff;
        --line: #e2e8f0;
        --shadow: 0 24px 64px rgba(15, 23, 42, 0.2);
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Google Sans", "Segoe UI", system-ui, sans-serif;
        background:
          radial-gradient(1200px 600px at 10% -10%, rgba(99, 102, 241, 0.35), transparent 55%),
          radial-gradient(900px 500px at 100% 0%, rgba(79, 70, 229, 0.25), transparent 50%),
          var(--bg);
        color: var(--ink);
        min-height: 100vh;
      }
      .shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 40px 16px;
      }
      .frame {
        width: min(420px, 100%);
        background: var(--panel);
        border-radius: 20px;
        box-shadow: var(--shadow);
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .bar {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 20px;
        background: linear-gradient(135deg, #312e81 0%, var(--primary) 55%, #6366f1 100%);
        color: #fff;
      }
      .bar img {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.15);
      }
      .bar h1 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .bar p {
        margin: 4px 0 0;
        font-size: 0.78rem;
        opacity: 0.92;
        line-height: 1.35;
      }
      .content {
        padding: 18px 18px 22px;
      }
      .section {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px 14px 12px;
        margin-top: 12px;
        background: #fafbff;
      }
      .section:first-of-type {
        margin-top: 0;
      }
      .section h2 {
        margin: 0 0 10px;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        font-weight: 600;
      }
      .section.collapsible h2::after {
        content: " · tap to expand";
        text-transform: none;
        letter-spacing: 0;
        font-weight: 400;
        font-size: 0.68rem;
        color: #94a3b8;
      }
      .divider {
        height: 1px;
        background: var(--line);
        margin: 10px 0;
      }
      .meta {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 8px 12px;
        align-items: start;
        margin-top: 8px;
      }
      .meta:first-of-type {
        margin-top: 0;
      }
      .label {
        color: var(--muted);
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 600;
      }
      .body {
        margin-top: 8px;
        line-height: 1.5;
        font-size: 0.9rem;
        color: #334155;
        white-space: pre-wrap;
      }
      .hint {
        font-size: 0.82rem;
        color: var(--muted);
        line-height: 1.45;
        margin-bottom: 12px;
      }
      .cta {
        width: 100%;
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: default;
        background: var(--primary);
        color: #fff;
        box-shadow: 0 8px 24px rgba(79, 70, 229, 0.35);
      }
      .ribbon {
        text-align: center;
        font-size: 0.72rem;
        color: #64748b;
        padding: 12px 16px 0;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="frame">
        <div class="bar">
          <img src="https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png" alt="" width="44" height="44" />
          <div>
            <h1 id="cardTitle">Quill Draft</h1>
            <p id="cardSubtitle"></p>
          </div>
        </div>
        <div class="content" id="app"></div>
        <div class="ribbon">Local preview · real Gmail UI comes from your Apps Script deployment</div>
      </div>
    </div>
    <script>
      const screens = ${JSON.stringify(screens)};
      const app = document.getElementById("app");

      function render(screenKey) {
        const screen = screens[screenKey];
        document.getElementById("cardSubtitle").textContent = screen.subtitle;
        app.innerHTML = "";

        screen.sections.forEach((section) => {
          const wrapper = document.createElement("section");
          wrapper.className = "section" + (section.collapsible ? " collapsible" : "");

          if (section.heading && section.heading.length) {
            const heading = document.createElement("h2");
            heading.textContent = section.heading;
            wrapper.appendChild(heading);
          }

          section.items.forEach((item) => {
            if (item.kind === "meta") {
              const row = document.createElement("div");
              row.className = "meta";
              const label = document.createElement("div");
              label.className = "label";
              label.textContent = item.label;
              const value = document.createElement("div");
              value.textContent = item.value;
              row.appendChild(label);
              row.appendChild(value);
              wrapper.appendChild(row);
              return;
            }
            if (item.kind === "divider") {
              const d = document.createElement("div");
              d.className = "divider";
              wrapper.appendChild(d);
              return;
            }
            if (item.kind === "text") {
              const body = document.createElement("div");
              body.className = "body";
              body.textContent = item.value;
              wrapper.appendChild(body);
              return;
            }
            if (item.kind === "hint") {
              const hint = document.createElement("div");
              hint.className = "hint";
              hint.textContent = item.value;
              wrapper.appendChild(hint);
              return;
            }
            if (item.kind === "cta") {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "cta";
              btn.textContent = item.label;
              wrapper.appendChild(btn);
            }
          });

          app.appendChild(wrapper);
        });
      }

      render("home");
    </script>
  </body>
</html>`;

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const server = http.createServer((request, response) => {
  if (request.url !== "/") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(port, host, () => {
  console.log(`Quill Draft local preview: http://${host}:${port}`);
});
