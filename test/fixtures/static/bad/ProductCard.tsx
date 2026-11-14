import React, { useState } from "react";
import { Image } from "./Image";

type Props = { title: string; price: number; onBuy: () => void };

export function ProductCard({ title, price, onBuy }: Props) {
  const [qty, setQty] = useState<number>(1);
  const items: Array<string> = [];
  return (
    <div className="card">
      <img src="/product.png" />
      <h2>{title}</h2>
      <h4>Price</h4>
      <div className="buy" onClick={onBuy}>Buy for ${price}</div>
      <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      <button onClick={() => setQty(0)}>
        <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
      </button>
      <a onClick={onBuy}>Checkout</a>
      <span tabIndex={2}>Focusable</span>
      <Image src="/thumb.png" />
      {items.length > 0 && <img src="/badge.png" />}
      <select>
        <option>Small</option>
      </select>
    </div>
  );
}
