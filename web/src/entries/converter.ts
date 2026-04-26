// Tool-page entry. Imported by /{lang}/index.html through a tiny shim
// that first imports the language dictionary, then this file.

import { attachDropZone } from "../ui/DropZone";
import { ProgressBar } from "../ui/ProgressBar";
import { mountAdSlot } from "../ui/AdSlot";
import { initChrome } from "./common";
import { WorkerRpc } from "../workers/rpc";
import { t } from "../i18n/t";

const LARGE_FILE_BYTES = 300 * 1024 * 1024;

initChrome();

const dropzone   = document.getElementById("dropzone") as HTMLElement;
const detected   = document.getElementById("detected") as HTMLElement;
const optionsEl  = document.getElementById("options") as HTMLFormElement;
const convertBtn = document.getElementById("convert-btn") as HTMLButtonElement;
const resetBtn   = document.getElementById("reset-btn") as HTMLButtonElement;
const downloadEl = document.getElementById("download") as HTMLAnchorElement;
const statusPill = document.getElementById("status-pill") as HTMLElement;
const bannerHost = document.getElementById("banners") as HTMLElement;
const progressEl = document.getElementById("progress") as HTMLElement;

const progress = new ProgressBar(progressEl);

const sidebar = document.getElementById("sidebar-ad");
if (sidebar) mountAdSlot(sidebar, { slot: "0000000000", className: "sidebar" });

let currentFile: File | null = null;
let currentBytes: Uint8Array | null = null;

const worker = new Worker(new URL("../workers/convert.worker.ts", import.meta.url), { type: "module" });
const rpc = new WorkerRpc(worker);

setStatus("warming");
rpc.call({ kind: "warm" })
  .then(() => setStatus("ready"))
  .catch((e) => {
    setStatus("error");
    showBanner(t("warn.unsupportedBrowser") + " " + (e as Error).message, "error");
  });

attachDropZone(dropzone, {
  accept: ".cr3,.cr2,.crw,.nef,.nrw,.arw,.sr2,.srf,.raf,.orf,.rw2,.pef,.dng,.kdc,.dcr,.dcs,.mef,.mos,.mrw,.iiq,.3fr,.erf,.srw,.ari",
  onFile: handleFile,
});

resetBtn.addEventListener("click", () => reset());
convertBtn.addEventListener("click", () => convert());

async function handleFile(file: File): Promise<void> {
  reset();
  currentFile = file;

  if (file.size > LARGE_FILE_BYTES) {
    showBanner(t("warn.largeFile"), "warn");
  }
  detected.textContent = file.name;
  dropzone.hidden = true;
  optionsEl.hidden = false;
  convertBtn.disabled = false;
  resetBtn.hidden = false;

  const buf = await file.arrayBuffer();
  currentBytes = new Uint8Array(buf);

  // Best-effort camera detection in the background.
  rpc.call({ kind: "detect", bytes: currentBytes }).then((res) => {
    if (res.kind === "detect-result") detected.textContent = `${file.name} — ${res.info}`;
  }).catch(() => {/* ignore detection errors */});
}

async function convert(): Promise<void> {
  if (!currentFile || !currentBytes) return;

  const fd = new FormData(optionsEl);
  const options = {
    lossless:     fd.get("lossless")     === "on",
    preview:      fd.get("preview")      === "on",
    thumbnail:    fd.get("thumbnail")    === "on",
    applyScaling: fd.get("applyScaling") === "on",
    filename:     currentFile.name,
  };

  setStatus("busy");
  progress.indeterminate();
  convertBtn.disabled = true;
  convertBtn.textContent = t("tool.converting");

  // Transfer the underlying ArrayBuffer to the worker; we won't need it back.
  const bytes = currentBytes;
  currentBytes = null;

  try {
    const res = await rpc.call({ kind: "convert", bytes, options }, [bytes.buffer]);
    if (res.kind !== "result") throw new Error("unexpected response");
    progress.set(100);
    presentDownload(res.dng, currentFile.name);
    setStatus("ready");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    showBanner(t("error.generic") + message, "error");
    setStatus("error");
    progress.hide();
    convertBtn.disabled = false;
    convertBtn.textContent = t("tool.convert");
  }
}

function presentDownload(dng: Uint8Array, sourceName: string): void {
  const blob = new Blob([dng], { type: "image/x-adobe-dng" });
  const url = URL.createObjectURL(blob);
  downloadEl.href = url;
  downloadEl.download = sourceName.replace(/\.[^.]+$/, "") + ".dng";
  downloadEl.hidden = false;
  downloadEl.textContent = t("tool.download");
  // Auto-click to trigger save dialog. UX preference: leave manual instead.
  downloadEl.click();
  // Don't revokeObjectURL immediately — user might re-click the link.
}

function reset(): void {
  currentFile = null;
  currentBytes = null;
  dropzone.hidden = false;
  optionsEl.hidden = true;
  convertBtn.disabled = true;
  convertBtn.textContent = t("tool.convert");
  resetBtn.hidden = true;
  downloadEl.hidden = true;
  progress.hide();
  bannerHost.replaceChildren();
  detected.textContent = "";
}

function showBanner(text: string, kind: "warn" | "error" | "info"): void {
  const div = document.createElement("div");
  div.className = "banner" + (kind === "error" ? " error" : kind === "info" ? " info" : "");
  div.textContent = text;
  bannerHost.appendChild(div);
}

function setStatus(s: "warming" | "ready" | "busy" | "error"): void {
  statusPill.className = "pill " + s;
  statusPill.textContent = t("status." + s);
}
