// Hooks file-drop and click-to-pick onto a DOM element. The host owns the
// rendering and just receives File objects.

export type DropZoneOptions = {
  onFile: (file: File) => void;
  accept?: string;
};

export function attachDropZone(el: HTMLElement, opts: DropZoneOptions): () => void {
  const input = el.querySelector<HTMLInputElement>('input[type="file"]')
    ?? Object.assign(document.createElement("input"), {
      type: "file",
      accept: opts.accept ?? "",
    });
  if (!el.contains(input)) el.appendChild(input);

  const onClick = () => input.click();
  const onChange = () => {
    const f = input.files?.[0];
    if (f) opts.onFile(f);
    input.value = "";
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    el.classList.add("is-hover");
  };
  const onDragLeave = () => el.classList.remove("is-hover");
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    el.classList.remove("is-hover");
    const f = e.dataTransfer?.files?.[0];
    if (f) opts.onFile(f);
  };

  el.addEventListener("click", onClick);
  input.addEventListener("change", onChange);
  el.addEventListener("dragover", onDragOver);
  el.addEventListener("dragleave", onDragLeave);
  el.addEventListener("drop", onDrop);

  return () => {
    el.removeEventListener("click", onClick);
    input.removeEventListener("change", onChange);
    el.removeEventListener("dragover", onDragOver);
    el.removeEventListener("dragleave", onDragLeave);
    el.removeEventListener("drop", onDrop);
  };
}
