const KEY_UNLOCKED = "simple_unlocked";
const KEY_NAME = "simple_name";
const KEY_PID = "simple_pid";

export function getSimpleAuth(): { unlocked: boolean; name?: string; pid?: string } {
  try {
    const unlocked = sessionStorage.getItem(KEY_UNLOCKED) === "1";
    const name = sessionStorage.getItem(KEY_NAME) || undefined;
    const pid = sessionStorage.getItem(KEY_PID) || undefined;
    return { unlocked, name, pid };
  } catch {
    return { unlocked: false };
  }
}

export function setSimpleAuth(name: string, pid?: string): void {
  try {
    sessionStorage.setItem(KEY_UNLOCKED, "1");
    sessionStorage.setItem(KEY_NAME, name);
    if (pid) sessionStorage.setItem(KEY_PID, pid);
  } catch {}
}

export function clearSimpleAuth(): void {
  try {
    sessionStorage.removeItem(KEY_UNLOCKED);
    sessionStorage.removeItem(KEY_NAME);
    sessionStorage.removeItem(KEY_PID);
  } catch {}
}
