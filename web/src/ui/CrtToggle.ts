// Toggles the global #crt scanline overlay; persisted to localStorage.

const STORAGE_KEY = "crt";

export function initCrtToggle(button: HTMLElement): void {
  const overlay = ensureOverlay();
  const enabled = localStorage.getItem(STORAGE_KEY) === "1";
  apply(enabled);

  button.addEventListener("click", () => {
    const next = overlay.hidden;
    apply(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  });

  function apply(on: boolean): void {
    overlay.hidden = !on;
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function ensureOverlay(): HTMLDivElement {
  let overlay = document.getElementById("crt") as HTMLDivElement | null;
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "crt";
    overlay.hidden = true;
    document.body.appendChild(overlay);
  }
  return overlay;
}
