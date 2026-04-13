import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "appsscript.json");
const sourcePath = path.join(root, "src", "addon.js");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const source = fs.readFileSync(sourcePath, "utf8");

const requiredChecks = [
  {
    ok: Boolean(manifest.addOns?.common?.name),
    message: "Manifest is missing addOns.common.name"
  },
  {
    ok: Boolean(manifest.addOns?.common?.logoUrl),
    message: "Manifest is missing addOns.common.logoUrl"
  },
  {
    ok: manifest.addOns?.common?.homepageTrigger?.runFunction === "onHomepage",
    message: "Manifest homepage trigger must point to onHomepage"
  },
  {
    ok: /function onHomepage\s*\(/.test(source),
    message: "Source file is missing onHomepage()"
  },
  {
    ok: /function onGmailMessageOpen\s*\(/.test(source),
    message: "Source file is missing onGmailMessageOpen()"
  },
  {
    ok: /function insertSuggestedReplyDraft\s*\(/.test(source),
    message: "Source file is missing insertSuggestedReplyDraft()"
  }
];

const failures = requiredChecks.filter((check) => !check.ok);

if (failures.length > 0) {
  failures.forEach((failure) => console.error("ERROR:", failure.message));
  process.exit(1);
}

console.log("Manifest and source checks passed.");
