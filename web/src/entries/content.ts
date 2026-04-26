// Generic content-page entry. Just translates and wires header/footer
// chrome; all body copy is hand-written into the HTML and not translated
// at runtime.

import { initChrome } from "./common";
import { mountAdSlot } from "../ui/AdSlot";

initChrome();

// Mount up to three optional ad slots if their hosts exist on the page.
const top = document.getElementById("ad-top");
if (top) mountAdSlot(top, { slot: "1111111111" });

const inArticle = document.getElementById("ad-in-article");
if (inArticle) mountAdSlot(inArticle, { slot: "2222222222", layout: "in-article", format: "fluid" });

const sidebar = document.getElementById("ad-sidebar");
if (sidebar) mountAdSlot(sidebar, { slot: "3333333333", className: "sidebar" });
