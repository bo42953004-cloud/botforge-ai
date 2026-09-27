export type BotStructure = {
  fileName: string;
  valid: boolean;
  settings: { label: string; value: string }[];
  sections: { label: string; blocks: number; found: boolean }[];
  variables: string[];
  totalBlocks: number;
};

const SECTIONS: { label: string; type: string }[] = [
  { label: "1. Trade parameters", type: "trade_definition" },
  { label: "2. Purchase conditions", type: "before_purchase" },
  { label: "3. Sell conditions", type: "during_purchase" },
  { label: "4. Restart trading conditions", type: "after_purchase" },
];

const FIELDS: [string, string][] = [
  ["MARKET_LIST", "Market"],
  ["SUBMARKET_LIST", "Submarket"],
  ["SYMBOL_LIST", "Asset"],
  ["TRADETYPECAT_LIST", "Trade category"],
  ["TRADETYPE_LIST", "Trade type"],
  ["TYPE_LIST", "Contract type"],
  ["CANDLEINTERVAL_LIST", "Candle interval"],
  ["DURATIONTYPE_LIST", "Duration unit"],
  ["CURRENCY_LIST", "Currency"],
  ["PURCHASE_LIST", "Purchase"],
];

/** Parse a Deriv Blockly XML file into a readable structure. Browser only. */
export function parseBotStructure(xml: string, fileName: string): BotStructure {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const valid = !doc.querySelector("parsererror") && doc.documentElement.nodeName === "xml";
  const settings: BotStructure["settings"] = [];
  const seen = new Set<string>();
  for (const [name, label] of FIELDS) {
    const el = doc.querySelector(`field[name="${name}"]`);
    const value = el?.textContent?.trim();
    if (value && !seen.has(label)) {
      seen.add(label);
      settings.push({ label, value });
    }
  }
  const numbers = Array.from(doc.querySelectorAll('block[type="math_number"] > field[name="NUM"]'))
    .map((n) => n.textContent?.trim())
    .filter(Boolean);
  if (numbers.length) settings.push({ label: "Numbers used", value: numbers.slice(0, 8).join(", ") });

  const sections = SECTIONS.map(({ label, type }) => {
    const el = doc.querySelector(`block[type="${type}"]`);
    return { label, found: !!el, blocks: el ? el.querySelectorAll("block").length : 0 };
  });
  const variables = Array.from(doc.querySelectorAll("variables > variable"))
    .map((v) => v.textContent?.trim() ?? "")
    .filter(Boolean);
  return {
    fileName,
    valid,
    settings,
    sections,
    variables,
    totalBlocks: doc.querySelectorAll("block").length,
  };
}

export const IMPORT_TAG = /Imported bot:\s*([\w. ()-]+\.xml)/i;
