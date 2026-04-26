// Cameras-page entry — renders the camera support table from the build-time
// generated cameras.json.

import { initChrome } from "./common";
import { mountAdSlot } from "../ui/AdSlot";
import cameras from "../data/cameras.json";

initChrome();

const top = document.getElementById("ad-top");
if (top) mountAdSlot(top, { slot: "1111111111" });

const inArticle = document.getElementById("ad-in-article");
if (inArticle) mountAdSlot(inArticle, { slot: "2222222222", layout: "in-article", format: "fluid" });

type Row = { make: string; model: string; supported: string; modes: string; remarks: string };
const rows = cameras as Row[];

const host = document.getElementById("camera-table-host");
if (host) {
  const table = document.createElement("table");
  table.className = "camera-table";
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Make</th>
      <th>Model</th>
      <th>Supported</th>
      <th>Modes</th>
      <th>Remarks</th>
    </tr>`;
  const tbody = document.createElement("tbody");
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.make)}</td>
      <td>${escapeHtml(r.model)}</td>
      <td>${escapeHtml(r.supported)}</td>
      <td>${escapeHtml(r.modes)}</td>
      <td>${escapeHtml(r.remarks)}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(thead);
  table.appendChild(tbody);
  host.appendChild(table);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
