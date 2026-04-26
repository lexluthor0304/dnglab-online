// Hand-rolled postMessage RPC. ~30 lines, replaces the need for Comlink.

export type WorkerResponse =
  | { id: number; kind: "warm-ok" }
  | { id: number; kind: "detect-result"; info: string }
  | { id: number; kind: "result"; dng: Uint8Array }
  | { id: number; kind: "error"; message: string };

type Pending = {
  resolve: (value: WorkerResponse) => void;
  reject: (reason: Error) => void;
};

export class WorkerRpc {
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(private readonly worker: Worker) {
    worker.addEventListener("message", (ev: MessageEvent<WorkerResponse>) => {
      const p = this.pending.get(ev.data.id);
      if (!p) return;
      this.pending.delete(ev.data.id);
      if (ev.data.kind === "error") {
        p.reject(new Error(ev.data.message));
      } else {
        p.resolve(ev.data);
      }
    });
    worker.addEventListener("error", (ev) => {
      for (const p of this.pending.values()) p.reject(new Error(ev.message || "worker error"));
      this.pending.clear();
    });
  }

  call(payload: object, transfer?: Transferable[]): Promise<WorkerResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, ...payload }, transfer ?? []);
    });
  }
}
