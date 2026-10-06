"use client";

import { useState } from "react";
import { DAILY_PACK_QUANTITIES, DAILY_PACK_CHECKOUTS, PICTURE_PACKAGES } from "@/lib/site/picturePackages";
import { usd } from "@/lib/site/prices";
import styles from "./pictures.module.css";

export default function PackQuantity() {
  const [quantity, setQuantity] = useState(1);
  const pack = PICTURE_PACKAGES[2];
  return <div className={styles.quantityBox}>
    <label htmlFor="daily-quantity">Need more than one 30-picture pack?</label>
    <select id="daily-quantity" value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
      {DAILY_PACK_QUANTITIES.map(n => <option key={n} value={n}>{n} {n === 1 ? "pack" : "packs"} · {pack.pictures*n} pictures · {usd(pack.priceUsd*n)}</option>)}
    </select>
    <p role="status">{pack.pictures*quantity} distinct pictures + matching captions for <strong>{usd(pack.priceUsd*quantity)}</strong>, paid once.</p>
    <a className={styles.button} href={DAILY_PACK_CHECKOUTS[quantity]}>Buy {quantity === 1 ? "30 pictures" : `${quantity} packs`} <span aria-hidden="true">↗</span></a>
    <p className={styles.small}>Check the quantity in Stripe before paying. Multiple packs are delivered in agreed batches.</p>
  </div>;
}
