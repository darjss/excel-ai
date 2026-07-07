import { describe, expect, it } from "vitest";
import { bakeryConfig } from "@/portal-config";
import type { ChatFn, ChatResult } from "../agent/models";
import type { ProgressEvent } from "../job/events";
import { buildDefaultStyle } from "./default-style";
import { applyStyle } from "./generate";
import { CURATED_PALETTES } from "./palettes";

const reply = (content: string): ChatResult => ({ content, finishReason: "stop", toolCalls: [] });

const respondingWith =
  (content: string): ChatFn =>
  async () =>
    reply(content);

const collector = (): { emit: (event: ProgressEvent) => void; phases: string[] } => {
  const phases: string[] = [];
  return { emit: (event) => phases.push(event.phase), phases };
};

const VALID_PICK = JSON.stringify({
  paletteKey: "farm-green",
  radius: "sm",
  fontPairing: "playfair-inter",
  copy: {
    heroLine: "Fresh from our fields, ordered ahead.",
    about: "A small family operation growing seasonal produce for local kitchens.",
    orderCtaLabel: "Order now",
    secondaryCtaLabel: "See produce",
  },
  sections: ["hero", "catalog", "order-form", "about"],
});

describe("applyStyle", () => {
  it("applies a valid model pick within the constrained sets", async () => {
    const sink = collector();
    const result = await applyStyle(bakeryConfig, {
      chat: respondingWith(`\`\`\`json\n${VALID_PICK}\n\`\`\``),
      model: "mock",
      emit: sink.emit,
    });

    expect(result.style.theme.palette).toEqual(CURATED_PALETTES["farm-green"].palette);
    expect(result.style.theme.radius).toBe("sm");
    expect(result.style.theme.fontPairing).toBe("playfair-inter");
    expect(result.style.copy.heroLine).toBe("Fresh from our fields, ordered ahead.");
    expect(result.style.copy.secondaryCtaLabel).toBe("See produce");
    expect(result.style.sections).toEqual(["hero", "catalog", "order-form", "about"]);
    expect(sink.phases).toContain("style");
  });

  it("falls back to the deterministic default when the model output is malformed", async () => {
    const result = await applyStyle(bakeryConfig, {
      chat: respondingWith("here is no json whatsoever"),
      model: "mock",
      emit: () => {},
    });
    expect(result.style).toEqual(buildDefaultStyle(bakeryConfig));
  });

  it("falls back when the model output violates the constrained schema", async () => {
    const badRadius = JSON.stringify({
      paletteKey: "neutral",
      radius: "enormous",
      fontPairing: "inter-inter",
      copy: { heroLine: "x", about: "y", orderCtaLabel: "z" },
      sections: ["hero", "catalog", "order-form"],
    });
    const result = await applyStyle(bakeryConfig, {
      chat: respondingWith(badRadius),
      model: "mock",
      emit: () => {},
    });
    expect(result.style).toEqual(buildDefaultStyle(bakeryConfig));
  });

  it("falls back when the model picks a section outside the allowed union", async () => {
    const badSection = JSON.stringify({
      paletteKey: "neutral",
      radius: "md",
      fontPairing: "inter-inter",
      copy: { heroLine: "x", about: "y", orderCtaLabel: "z" },
      sections: ["hero", "testimonials"],
    });
    const result = await applyStyle(bakeryConfig, {
      chat: respondingWith(badSection),
      model: "mock",
      emit: () => {},
    });
    expect(result.style).toEqual(buildDefaultStyle(bakeryConfig));
  });

  it("never throws when the model call fails, using the default instead", async () => {
    const throwing: ChatFn = async () => {
      throw new Error("model unavailable");
    };
    const result = await applyStyle(bakeryConfig, { chat: throwing, model: "mock", emit: () => {} });
    expect(result.style).toEqual(buildDefaultStyle(bakeryConfig));
  });

  it("clamps generated copy that exceeds the length caps", async () => {
    const longHero = "word ".repeat(60).trim();
    const pick = JSON.stringify({
      paletteKey: "neutral",
      radius: "md",
      fontPairing: "inter-inter",
      copy: { heroLine: longHero, about: "About us.", orderCtaLabel: "Order" },
      sections: ["hero", "catalog", "order-form"],
    });
    const result = await applyStyle(bakeryConfig, {
      chat: respondingWith(pick),
      model: "mock",
      emit: () => {},
    });
    expect(result.style.copy.heroLine.length).toBeLessThanOrEqual(120);
  });
});

describe("buildDefaultStyle", () => {
  it("derives a palette from business semantics", () => {
    const style = buildDefaultStyle(bakeryConfig);
    expect(style.theme.palette).toEqual(CURATED_PALETTES["bakery-warm"].palette);
    expect(style.sections).toContain("hero");
    expect(style.sections).toContain("order-form");
  });
});
