"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function MobilePurchaseBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 620);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <a
      className={`${styles.mobilePurchaseBar} ${visible ? styles.mobilePurchaseBarVisible : ""}`}
      href="#enroll"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span>Get founding access</span><strong>$127</strong><ArrowRight aria-hidden="true" />
    </a>
  );
}
