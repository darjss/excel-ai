import * as v from "valibot";
import { type PortalConfig, type Style, styleSchema } from "@/portal-config";
import type { ChatFn } from "../agent/models";
import { progress, type ProgressEmitter } from "../job/events";
import { buildDefaultStyle, clampText, COPY_CAPS } from "./default-style";
import { CURATED_PALETTES } from "./palettes";
import {
  buildSeed,
  extractStyleJson,
  renderStylePrompt,
  STYLE_SYSTEM_PROMPT,
  type StylePick,
  stylePickSchema,
} from "./prompt";

const STYLE_TEMPERATURE = 0.4;
const STYLE_MAX_TOKENS = 2048;

export interface StyleStageDeps {
  chat: ChatFn;
  model: string;
  emit: ProgressEmitter;
}

const assembleStyle = (pick: StylePick): Style => {
  const curated = CURATED_PALETTES[pick.paletteKey];
  return {
    theme: {
      palette: curated.palette,
      radius: pick.radius,
      fontPairing: pick.fontPairing,
    },
    copy: {
      heroLine: clampText(pick.copy.heroLine, COPY_CAPS.hero),
      about: clampText(pick.copy.about, COPY_CAPS.about),
      orderCtaLabel: clampText(pick.copy.orderCtaLabel, COPY_CAPS.cta),
      ...(pick.copy.secondaryCtaLabel !== undefined
        ? { secondaryCtaLabel: clampText(pick.copy.secondaryCtaLabel, COPY_CAPS.cta) }
        : {}),
    },
    sections: pick.sections,
  };
};

const generateStyle = async (config: PortalConfig, deps: StyleStageDeps): Promise<Style | null> => {
  try {
    const result = await deps.chat({
      model: deps.model,
      maxCompletionTokens: STYLE_MAX_TOKENS,
      temperature: STYLE_TEMPERATURE,
      messages: [
        { role: "system", content: STYLE_SYSTEM_PROMPT },
        { role: "user", content: renderStylePrompt(buildSeed(config)) },
      ],
    });
    const pick = v.safeParse(stylePickSchema, extractStyleJson(result.content));
    if (!pick.success) return null;
    const validated = v.safeParse(styleSchema, assembleStyle(pick.output));
    return validated.success ? validated.output : null;
  } catch {
    return null;
  }
};

export const applyStyle = async (
  config: PortalConfig,
  deps: StyleStageDeps,
): Promise<PortalConfig> => {
  deps.emit(progress("style", "Designing your portal look"));
  const style = (await generateStyle(config, deps)) ?? buildDefaultStyle(config);
  return { ...config, style };
};
