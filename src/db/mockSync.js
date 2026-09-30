/* =========================================================================
   The mock server's push channel. The teacher app (/) and the student app
   (/student/) each keep their own copy of the mock db in memory; with both
   open in tabs of the same browser, this keeps them in step the way a real
   server pushes changes to every client: after a change a tab broadcasts
   its data, and every other tab takes it (the reducer's SYNC_STATE). So a
   note the teacher sends shows up in the student's tab straight away, and a
   join request the student sends lands in the teacher's.

   A tab that opens asks the others for the current data first ("hello"),
   so it starts where they are; only a tab that has actually changed or
   received something answers, so a fresh tab never resets the rest back to
   the seed. Nothing is stored — close every tab and the next one starts
   from the seed again, same as before. A real backend replaces this with
   its own push (a websocket) and nothing above the store changes.
   ========================================================================= */

const CHANNEL = "lucid.mock-server";
// Per-tab UI state that never leaves the tab.
const LOCAL_ONLY = new Set(["toasts"]);

export const sharedPart = (db) => Object.fromEntries(Object.entries(db).filter(([k]) => !LOCAL_ONLY.has(k)));

// Did anything other tabs care about change between two db snapshots?
export const sharedChanged = (before, after) =>
  Object.keys(after).some((k) => !LOCAL_ONLY.has(k) && after[k] !== before[k]);

// `current()` returns this tab's db when it has something worth sharing
// (null otherwise); `onRemote(db)` gets another tab's data.
export function openSyncChannel({ current, onRemote }) {
  if (typeof BroadcastChannel === "undefined") return { publish() {}, close() {} };
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = ({ data }) => {
    if (data?.type === "hello") {
      const db = current();
      if (db) channel.postMessage({ type: "state", db: sharedPart(db) });
    } else if (data?.type === "state" && data.db) {
      onRemote(data.db);
    }
  };
  channel.postMessage({ type: "hello" });
  return {
    publish: (db) => channel.postMessage({ type: "state", db: sharedPart(db) }),
    close: () => channel.close(),
  };
}
