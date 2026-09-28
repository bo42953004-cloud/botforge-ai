/** Browser-only checker that finds empty or broken blocks in a Deriv bot XML. */
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
};

export function checkBotXml(xml: string): string[] {
  const issues: string[] = [];
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror") || doc.documentElement.nodeName !== "xml") {
    return ["The XML is not well-formed and cannot be parsed."];
  }
  for (const type of REQUIRED_TOP) {
    if (!doc.querySelector(`block[type="${type}"]`)) issues.push(`Missing required top-level block "${type}".`);
  }
  if (!doc.querySelector('block[type="purchase"]')) issues.push('No "purchase" block inside before_purchase.');

  const direct = (el: Element, tag: string, name: string) =>
    Array.from(el.children).find((c) => c.nodeName === tag && c.getAttribute("name") === name);

  doc.querySelectorAll("block").forEach((block) => {
    const type = block.getAttribute("type") ?? "?";
    const id = block.getAttribute("id") ?? "no-id";
    // Any value socket with nothing plugged in.
    Array.from(block.children).forEach((child) => {
      if (child.nodeName === "value" && !Array.from(child.children).some((c) => c.nodeName === "block" || c.nodeName === "shadow")) {
        issues.push(`Block "${type}" (id ${id}) has an empty input "${child.getAttribute("name")}".`);
      }
    });
    for (const name of REQUIRED_VALUES[type] ?? []) {
      if (!direct(block, "value", name)) issues.push(`Block "${type}" (id ${id}) is missing its "${name}" input.`);
    }
    if (type === "purchase" && !direct(block, "field", "PURCHASE_LIST")?.textContent?.trim()) {
      issues.push(`Block "purchase" (id ${id}) has no contract selected in PURCHASE_LIST.`);
    }
    if (type === "math_number" && !direct(block, "field", "NUM")?.textContent?.trim()) {
      issues.push(`Block "math_number" (id ${id}) has no number.`);
    }
  });

  const declared = new Set(
    Array.from(doc.querySelectorAll("variables > variable")).flatMap((v) => [v.getAttribute("id"), v.textContent?.trim()]),
  );
  doc.querySelectorAll('block[type="variables_get"] > field[name="VAR"], block[type="variables_set"] > field[name="VAR"]').forEach((f) => {
    const key = f.getAttribute("id") ?? f.textContent?.trim();
    if (key && !declared.has(key)) issues.push(`Variable "${f.textContent?.trim()}" is used but not declared in <variables>.`);
  });
  return Array.from(new Set(issues)).slice(0, 15);
}
