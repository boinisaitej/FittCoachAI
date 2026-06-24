import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getGemini, extractJson } from "./gemini";
import { foodScannerPrompt } from "./prompts";
import type { AiResult } from "./index";

export type ScannedFood = {
  detected: { name: string; quantity: string; calories: number; protein_g?: number; carbs_g?: number; fat_g?: number }[];
  totalCalories: number;
  notes?: string;
};

export async function scanFoodImage(imageDataUrl: string): Promise<AiResult<ScannedFood>> {
  try {
    const llm = getGemini("pro");
    const msg = new HumanMessage({
      content: [
        { type: "text", text: foodScannerPrompt },
        { type: "image_url", image_url: imageDataUrl },
      ],
    });
    const res = await llm.invoke([new SystemMessage("You are a nutrition vision assistant."), msg]);
    const text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return { ok: true, data: extractJson<ScannedFood>(text) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[ai:food-scanner] ${msg}`);
    return { ok: false, error: msg };
  }
}
