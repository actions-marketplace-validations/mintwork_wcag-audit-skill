import React, { useState } from "react";
import { Image } from "./Image";
import { Icon } from "./Icon";

type Props = { title: string; price: number; onBuy: () => void; image: { alt: string; src: string } };

export function ProductCard({ title, price, onBuy, image, ...rest }: Props & Record<string, unknown>) {
  const [qty, setQty] = useState<number>(1);
  const items: Array<string> = [];
  return (
    <article className="card">
      <img src={image.src} alt={image.alt} />
      <h2>{title}</h2>
      <h3>Price</h3>
      <button type="button" className="buy" onClick={onBuy}>Buy for ${price}</button>
      <label htmlFor="qty">Quantity</label>
      <input id="qty" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      <button type="button" aria-label="Reset quantity" onClick={() => setQty(0)}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
      </button>
      <button type="button" onClick={onBuy}>{title}</button>
      <button type="button"><Icon name="x" /></button>
      <span tabIndex={0} role="note">Focusable</span>
      <Image src="/thumb.png" alt="" />
      {items.length > 0 && <img src="/badge.png" alt="Bestseller" />}
      <label>
        Size
        <select>
          <option>Small</option>
        </select>
      </label>
      <img {...rest} />
      {/* wcag-audit-ignore img-alt */}
      <img src="/tracking-pixel.gif" />
    </article>
  );
}
