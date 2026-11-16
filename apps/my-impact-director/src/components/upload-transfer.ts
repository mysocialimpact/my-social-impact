import { api } from "./session";
export type Transfer = {
  file: File;
  id: string;
  chunkSize: number;
  completed: Set<number>;
};
function sendPart(
  id: string,
  part: number,
  blob: Blob,
  onProgress: (bytes: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/uploads/${id}?part=${part}`);
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = "The upload was interrupted. Please try again.";
      try {
        message = JSON.parse(xhr.responseText).error || message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = xhr.ontimeout = () =>
      reject(
        new Error(
          "The connection was interrupted. Please try again — we’ve kept your selected report.",
        ),
      );
    xhr.send(blob);
  });
}
export async function transferFile(
  transfer: Transfer,
  progress: (percent: number) => void,
) {
  const count = Math.ceil(transfer.file.size / transfer.chunkSize);
  for (let part = 0; part < count; part++) {
    if (transfer.completed.has(part)) continue;
    const offset = part * transfer.chunkSize;
    const blob = transfer.file.slice(
      offset,
      Math.min(offset + transfer.chunkSize, transfer.file.size),
    );
    // A repeated part is verified by its hash and never appended twice on the server.
    await sendPart(transfer.id, part, blob, (loaded) =>
      progress(
        Math.min(
          99,
          Math.round(((offset + loaded) / transfer.file.size) * 100),
        ),
      ),
    );
    transfer.completed.add(part);
  }
  progress(100);
}
export async function prepareTransfer(file: File): Promise<Transfer> {
  const value = await api("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name:
        file.name.length > 200 ? file.name.slice(0, 196) + ".pdf" : file.name,
      size: file.size,
      consent: true,
    }),
  });
  return {
    file,
    id: value.id,
    chunkSize: value.chunkSize,
    completed: new Set(),
  };
}
