export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadBlobAndroid(blob: Blob, filename: string): Promise<void> {
  if (navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          console.warn("[PDF] Web Share failed, falling back to data URL:", e);
        } else {
          return;
        }
      }
    }
  }
  const dataUrl = await blobToDataUrl(blob);
  window.open(dataUrl, "_blank");
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (isAndroid()) {
    await downloadBlobAndroid(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function downloadFromEndpoint(url: string, filename: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) return false;
  const blob = await res.blob();
  await downloadBlob(blob, filename);
  return true;
}
