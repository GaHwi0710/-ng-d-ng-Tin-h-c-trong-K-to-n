import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

let showToastFn = () => {};

export function toast(msg) {
  showToastFn(msg);
}

export function ToastContainer() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    showToastFn = (msg) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 2400);
    };
  }, []);

  return (
    <output className={`toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      <CheckCircleIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
      {message}
    </output>
  );
}
