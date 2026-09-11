import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app.ts";
import { initializeCredentials } from "./auth.ts";
import { PricingStore } from "./store.ts";
import { validPrice, type PriceDocument } from "../shared/pricing.ts";

test("authenticated publication, validation, conflicts, persistence and logout", async () => {
  const directory = mkdtempSync(join(tmpdir(), "beauty-api-"));
  initializeCredentials(directory);
  const password = readFileSync(
    join(directory, "admin-access.txt"),
    "utf8",
  ).match(/Password: (.+)/)![1];
  const origin = "http://localhost:5173";
  const { app, store } = createApp({ directory, origins: [origin] });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const send = (
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    requestOrigin = origin,
  ) =>
    fetch(base + path, {
      method,
      headers: {
        Origin: requestOrigin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    const initial = (await (await send("/api/prices")).json()) as PriceDocument;
    assert.equal((await send("/api/admin/prices", "PUT", initial)).status, 401);
    assert.equal(
      (await send("/api/login", "POST", { password: "wrong" })).status,
      401,
    );
    assert.equal(
      (
        await send(
          "/api/login",
          "POST",
          { password },
          "",
          "https://foreign.example",
        )
      ).status,
      403,
    );
    const login = await send("/api/login", "POST", { password });
    assert.equal(login.status, 200);
    const header = login.headers.get("set-cookie")!;
    assert.match(header, /HttpOnly/i);
    assert.match(header, /SameSite=Strict/i);
    const cookie = header.split(";")[0];
    assert.equal(
      (await send("/api/admin/session", "GET", undefined, cookie)).status,
      200,
    );
    const invalid = structuredClone(initial);
    invalid.prices.nails.items[0].price = "-1 грн";
    assert.equal(
      (await send("/api/admin/prices", "PUT", invalid, cookie)).status,
      400,
    );
    assert.equal(store.read().revision, initial.revision);
    const updated = structuredClone(initial);
    updated.prices.nails.items[0].price = "650 грн";
    updated.prices.nails.summary = "від 650 грн";
    assert.equal(
      (
        await send(
          "/api/admin/prices",
          "PUT",
          updated,
          cookie,
          "https://foreign.example",
        )
      ).status,
      403,
    );
    const saved = await send("/api/admin/prices", "PUT", updated, cookie);
    assert.equal(saved.status, 200);
    const publicRead = (await (
      await send("/api/prices")
    ).json()) as PriceDocument;
    assert.equal(publicRead.prices.nails.items[0].price, "650 грн");
    assert.equal(publicRead.revision, initial.revision + 1);
    assert.equal(
      (await send("/api/admin/prices", "PUT", updated, cookie)).status,
      409,
    );
    const reopened = new PricingStore(join(directory, "studio.sqlite"));
    assert.equal(reopened.read().prices.nails.summary, "від 650 грн");
    reopened.db.close();
    assert.equal(
      (await send("/api/admin/logout", "POST", undefined, cookie)).status,
      204,
    );
    assert.equal(
      (await send("/api/admin/prices", "PUT", publicRead, cookie)).status,
      401,
    );
    for (let i = 0; i < 10; i++)
      await send("/api/login", "POST", { password: "wrong" });
    assert.equal(
      (await send("/api/login", "POST", { password: "wrong" })).status,
      429,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("price validation preserves legitimate source variants", () => {
  for (const value of ["550 грн", "1 000 грн", "50/70 грн", "600/700 грн"])
    assert.equal(validPrice(value), true);
  assert.equal(validPrice("від 550 грн", true), true);
  for (const value of [
    "від 550 грн",
    "0 грн",
    "-10 грн",
    "1 00 грн",
    "100001 грн",
    "1/0 грн",
    "<script>",
    "",
    null,
  ])
    assert.equal(validPrice(value), false);
});
