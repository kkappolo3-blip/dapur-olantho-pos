import { useEffect, useState } from "react";
import { getQueueCount, processQueue } from "@/lib/offlineQueue";

export type ConnStatus = "online" | "offline" | "syncing";

export function useConnection() {
  const [status, setStatus] = useState<ConnStatus>("online");
  const [queueCount, setQueueCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const setOn = async () => {
      setStatus("syncing");
      const n = await processQueue();
      setQueueCount(getQueueCount());
      setLastSync(new Date());
      setStatus(navigator.onLine ? "online" : "offline");
      if (n > 0) {
        // emit a custom event for toast
        window.dispatchEvent(
          new CustomEvent("dapur-sync", { detail: { count: n } }),
        );
      }
    };
    const setOff = () => setStatus("offline");
    setStatus(navigator.onLine ? "online" : "offline");
    setQueueCount(getQueueCount());
    window.addEventListener("online", setOn);
    window.addEventListener("offline", setOff);
    const interval = setInterval(() => setQueueCount(getQueueCount()), 5000);
    return () => {
      window.removeEventListener("online", setOn);
      window.removeEventListener("offline", setOff);
      clearInterval(interval);
    };
  }, []);

  return { status, queueCount, lastSync };
}
