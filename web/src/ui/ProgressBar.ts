// A minimal progress bar that flips between determinate and indeterminate.
// The actual conversion has no progress signal (rawler is sync inside wasm),
// so we stay indeterminate during convert and switch to a 100% bar on done.

export class ProgressBar {
  constructor(private readonly el: HTMLElement) {}

  hide(): void {
    this.el.hidden = true;
    this.el.classList.remove("indeterminate");
    this.el.style.removeProperty("--filled");
  }

  indeterminate(): void {
    this.el.hidden = false;
    this.el.classList.add("indeterminate");
    this.el.style.removeProperty("--filled");
  }

  set(percent: number): void {
    this.el.hidden = false;
    this.el.classList.remove("indeterminate");
    this.el.style.setProperty("--filled", String(Math.max(0, Math.min(100, percent))));
  }
}
