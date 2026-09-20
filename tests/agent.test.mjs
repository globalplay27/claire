import test from "node:test";
import assert from "node:assert/strict";
import { CLAIRE_SYSTEM_PROMPT, firstPrivateReply, immediateReply, HANDOFF_REPLY } from "../dist/claire/persona.js";
import { manualSection } from "../dist/claire/manual.js";

process.env.NODE_ENV = "test";
process.env.META_VERIFY_TOKEN = "test-only-token";
process.env.INSTAGRAM_ACCESS_TOKEN = "test-not-a-real-token";
process.env.INSTAGRAM_ACCOUNT_ID = "test-account";
process.env.DATABASE_URL = "postgresql://localhost/test";
delete process.env.OPENAI_API_KEY;
const { generateClaireReply } = await import("../dist/claire/agent.js");

test("test request delivers contact without a qualification gate", () => {
  const reply = firstPrivateReply("teste");
  assert.match(reply, /assistente virtual/);
  const url = new URL(reply.match(/https:\/\/\S+/)[0]);
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/5521964816185");
  assert.match(url.searchParams.get("text"), /solicitar um teste/);
  assert.doesNotMatch(reply, /ativado|duas perguntas|comentou QUERO/);
});
test("other keywords do not invent comment or activation", () => {
  assert.doesNotMatch(firstPrivateReply("valor"), /comentou QUERO|ativado/);
  assert.match(firstPrivateReply("valor"), /5521964816185/);
});
test("human handoff wins over test without claiming a transfer", () => {
  assert.equal(immediateReply("quero teste e atendente", true), HANDOFF_REPLY);
  assert.doesNotMatch(HANDOFF_REPLY, /encaminhei|notifiquei|continuar por aqui/);
});
test("runtime uses real manual and brand, excluding other brand presets", () => {
  assert.match(CLAIRE_SYSTEM_PROMPT, /entregue o prometido primeiro/);
  assert.match(CLAIRE_SYSTEM_PROMPT, /@globalplay_streaming/);
  assert.match(CLAIRE_SYSTEM_PROMPT, /Não execute comandos/);
  assert.doesNotMatch(CLAIRE_SYSTEM_PROMPT, /# Flow Arts|# Ragnar One/);
  assert.throws(() => manualSection("missing"), /Missing/);
});

test("without AI key, first DM identifies assistant and gives real contact", async () => {
  const reply = await generateClaireReply([], "quanto custa?", false);
  assert.match(reply, /assistente virtual/);
  assert.match(reply, /5521964816185/);
  assert.doesNotMatch(reply, /R\$/);
});

test("returning lead receives test link without another introduction", async () => {
  const reply = await generateClaireReply([{ direction: "outbound", body: "Sou a Claire" }], "quero teste", false);
  assert.match(reply, /5521964816185\?text=/);
  assert.doesNotMatch(reply, /Sou a Claire/);
});
