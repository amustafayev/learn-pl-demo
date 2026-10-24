import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ToastHost } from "./design-system.jsx";
import { MOTION, cssMs } from "./motion.js";

/* Toasts — the short messages bottom-right ("“Quiz” saved"). They're the
   app's UI, not its data: each tab has its own and nothing about them is
   stored or synced. <ToastProvider> wraps an app and draws them; anything
   inside shows one with useToast():

     const toast = useToast();
     toast("Saved");                  // the default, dark toast
     toast("Couldn't save", "err");   // a red one */

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback((text, tone = "ok") => {
    seq.current += 1;
    const id = `toast-${seq.current}`;
    setToasts((list) => [...list, { id, text, tone }]);
    // How long a toast stays up is a timing setting like any other, so it
    // lives in index.css and is read back here — with cssMs, not motionMs,
    // because a reduced-motion preference must not cut reading time.
    setTimeout(() => dismiss(id), cssMs(MOTION.toastLife));
    return id;
  }, [dismiss]);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastCtx);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}
