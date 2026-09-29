/** Browser-only checker that finds empty, broken or removed blocks in a Deriv bot XML. */
export const CHECK_PREFIX = "[AUTO-CHECK]";

const REQUIRED_TOP = ["trade_definition", "before_purchase", "during_purchase", "after_purchase"];

const REQUIRED_VALUES: Record<string, string[]> = {
  tradeOptions: ["DURATION", "AMOUNT"],
  math_arithmetic: ["A", "B"],
  logic_compare: ["A", "B"],
  logic_operation: ["A", "B"],
  variables_set: ["VALUE"],
  controls_if: ["IF0"],
  notify: ["MESSAGE"],
  math_change: ["DELTA"],
  text_join: [],
};

const REQUIRED_STATEMENTS: Record<string, string[]> = {
  trade_definition: ["TRADE_OPTIONS"],
  before_purchase: ["BEFOREPURCHASE_STACK"],
  after_purchase: ["AFTERPURCHASE_STACK"],
  controls_if: ["DO0"],
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  trade_definition_market: ["MARKET_LIST", "SUBMARKET_LIST", "SYMBOL_LIST"],
  trade_definition_tradetype: ["TRADETYPECAT_LIST", "TRADETYPE_LIST"],
  trade_definition_contracttype: ["TYPE_LIST"],
  tradeOptions: ["DURATIONTYPE_LIST", "CURRENCY_LIST"],
  purchase: ["PURCHASE_LIST"],
  math_number: ["NUM"],
  logic_compare: ["OP"],
  math_arithmetic: ["OP"],
  variables_get: ["VAR"],
  variables_set: ["VAR"],
};

const INNER_TRADE = [
  "trade_definition_market",
  "trade_definition_tradetype",
  "trade_definition_contracttype",
  "trade_definition_candleinterval",
  "trade_definition_restartbuysell",
  "trade_definition_restartonerror",
];

function parse(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror") || doc.documentElement.nodeName !== "xml") return null;
  return doc;
}

export function countBlockTypes(xml: string): Record<string, number> {
  const doc = parse(xml);
  const counts: Record<string, number> = {};
  doc?.querySelectorAll("block").forEach((b) => {
    const t = b.getAttribute("type") ?? "?";
    counts[t] = (counts[t] ?? 0) + 1;
  });
  return counts;
}

/**
 * Check a generated bot. When `original` (an imported bot) is given, also report
 * block types that were removed during the update.
 */
export function checkBotXml(xml: string, original?: string): string[] {
  const issues: string[] = [];
  const doc = parse(xml);
  if (!doc) return ["The XML is not well-formed and cannot be parsed."];

  for (const type of REQUIRED_TOP) {
    if (!doc.querySelector(`block[type="${type}"]`)) issues.push(`Missing required top-level block "${type}".`);
  }
  for (const type of INNER_TRADE) {
    if (!doc.querySelector(`block[type="${type}"]`)) issues.push(`trade_definition is missing its "${type}" block.`);
  }
  if (!doc.querySelector('block[type="tradeOptions"]')) issues.push('Missing the "tradeOptions" block (duration, stake).');
  if (!doc.querySelector('block[type="purchase"]')) issues.push('No "purchase" block inside before_purchase.');
  if (!doc.querySelector('block[type="trade_again"]')) issues.push('No "trade_again" block in after_purchase, so the bot stops after one trade.');

  const direct = (el: Element, tag: string, name: string) =>
    Array.from(el.children).find((c) => c.nodeName === tag && c.getAttribute("name") === name);
  const hasBlock = (el: Element | undefined) =>
    !!el && Array.from(el.children).some((c) => c.nodeName === "block" || c.nodeName === "shadow");

  const ids = new Map<string, number>();
  doc.querySelectorAll("block, shadow").forEach((block) => {
    const type = block.getAttribute("type") ?? "?";
    const id = block.getAttribute("id") ?? "no-id";
    ids.set(id, (ids.get(id) ?? 0) + 1);
    Array.from(block.children).forEach((child) => {
      if (child.nodeName === "value" && !hasBlock(child)) {
        issues.push(`Block "${type}" (id ${id}) has an empty input "${child.getAttribute("name")}".`);
      }
      if (child.nodeName === "statement" && !hasBlock(child) && REQUIRED_STATEMENTS[type]?.includes(child.getAttribute("name") ?? "")) {
        issues.push(`Block "${type}" (id ${id}) has an empty statement "${child.getAttribute("name")}".`);
      }
    });
    for (const name of REQUIRED_VALUES[type] ?? []) {
      if (!hasBlock(direct(block, "value", name))) issues.push(`Block "${type}" (id ${id}) is missing its "${name}" input.`);
    }
    for (const name of REQUIRED_STATEMENTS[type] ?? []) {
      if (!hasBlock(direct(block, "statement", name))) issues.push(`Block "${type}" (id ${id}) has nothing inside "${name}".`);
    }
    for (const name of REQUIRED_FIELDS[type] ?? []) {
      if (!direct(block, "field", name)?.textContent?.trim()) issues.push(`Block "${type}" (id ${id}) has an empty field "${name}".`);
    }
    if (type === "controls_if") {
      const mutation = block.querySelector(":scope > mutation");
      const elseifs = Number(mutation?.getAttribute("elseif") ?? 0);
      for (let i = 1; i <= elseifs; i++) {
        if (!hasBlock(direct(block, "value", `IF${i}`))) issues.push(`Block "controls_if" (id ${id}) has an empty "IF${i}" condition.`);
        if (!hasBlock(direct(block, "statement", `DO${i}`))) issues.push(`Block "controls_if" (id ${id}) has an empty "DO${i}" branch.`);
      }
      if (mutation?.getAttribute("else") === "1" && !hasBlock(direct(block, "statement", "ELSE"))) {
        issues.push(`Block "controls_if" (id ${id}) has an empty ELSE branch.`);
      }
    }
  });
  ids.forEach((n, id) => {
    if (n > 1 && id !== "no-id") issues.push(`Block id "${id}" is used ${n} times; ids must be unique.`);
  });

  const declared = new Set(
    Array.from(doc.querySelectorAll("variables > variable")).flatMap((v) => [v.getAttribute("id"), v.textContent?.trim()]),
  );
  doc.querySelectorAll('block[type="variables_get"] > field[name="VAR"], block[type="variables_set"] > field[name="VAR"], block[type="math_change"] > field[name="VAR"]').forEach((f) => {
    const key = f.getAttribute("id") ?? f.textContent?.trim();
    if (key && !declared.has(key)) issues.push(`Variable "${f.textContent?.trim()}" is used but not declared in <variables>.`);
  });

  if (original) {
    const before = countBlockTypes(original);
    const after = countBlockTypes(xml);
    for (const [type, n] of Object.entries(before)) {
      if (!after[type]) issues.push(`The original bot had ${n} "${type}" block(s) but your update removed all of them. Keep them unless the user asked to remove them.`);
    }
  }
  return Array.from(new Set(issues)).slice(0, 20);
}
