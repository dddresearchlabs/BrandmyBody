const PREFIX = "bmb-bid-logo:";

type Stash = {
  name: string;
  type: string;
  dataUrl: string;
};

function key(sessionId: string) {
  return `${PREFIX}${sessionId}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image"));
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(stash: Stash) {
  const comma = stash.dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Could not read image");
  const binary = atob(stash.dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], stash.name || "logo", {
    type: stash.type || "image/png",
  });
}

export async function stashBidLogo(sessionId: string, file: File) {
  const dataUrl = await fileToDataUrl(file);
  const payload: Stash = {
    name: file.name || "logo",
    type: file.type,
    dataUrl,
  };
  sessionStorage.setItem(key(sessionId), JSON.stringify(payload));
}

export function takeBidLogo(sessionId: string): File | null {
  const raw = sessionStorage.getItem(key(sessionId));
  if (!raw) return null;
  sessionStorage.removeItem(key(sessionId));
  try {
    const parsed = JSON.parse(raw) as Stash;
    if (!parsed?.dataUrl) return null;
    return dataUrlToFile(parsed);
  } catch {
    return null;
  }
}
