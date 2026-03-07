import fs from "fs";
import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (_openai) return _openai;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey) {
    console.warn("[SIMPLE_MODE][OCR] No OpenAI API key configured");
    return null;
  }
  _openai = new OpenAI({ apiKey, baseURL });
  return _openai;
}

export interface VisionIdentifyResult {
  name: string;
  distillery: string;
  age: string;
  abv: string;
  caskType: string;
  region: string;
  confidence: "high" | "medium" | "low";
  ocrText: string;
}

export async function identifyWhiskyFromImage(filePath: string): Promise<VisionIdentifyResult | null> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn("[VISION] no provider available");
    return null;
  }

  console.log("[VISION] sending image to GPT-4o for identification...");
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString("base64");
  const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  const dataUri = `data:image/${ext};base64,${base64}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a whisky identification expert. Analyze the image of a whisky bottle and identify the product.

Return a JSON object with these fields:
- "name": full product name (e.g. "Balblair 18 Year Old")
- "distillery": distillery name (e.g. "Balblair")
- "age": age statement as string (e.g. "18") or "" if no age statement
- "abv": alcohol percentage with % sign (e.g. "46%") or "" if not visible
- "caskType": cask/maturation type (e.g. "Ex-Bourbon & Sherry") or "" if not specified
- "region": whisky region (e.g. "Highland", "Islay", "Speyside") or "" if unknown
- "confidence": "high" if you can clearly read the label, "medium" if partially visible, "low" if guessing
- "ocrText": all visible text on the label, transcribed verbatim

Be precise. Read the actual label text. Do not guess if you cannot see the label clearly.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this whisky bottle from the image.",
            },
            {
              type: "image_url",
              image_url: { url: dataUri, detail: "high" },
            },
          ],
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    console.log(`[VISION] identified: "${parsed.name}" by ${parsed.distillery} (${parsed.confidence})`);

    const validConfidence = ["high", "medium"].includes(parsed.confidence) ? parsed.confidence : "low";

    return {
      name: parsed.name || "",
      distillery: parsed.distillery || "",
      age: String(parsed.age || ""),
      abv: parsed.abv || "",
      caskType: parsed.caskType || "",
      region: parsed.region || "",
      confidence: validConfidence as "high" | "medium" | "low",
      ocrText: parsed.ocrText || "",
    };
  } catch (err: any) {
    console.error("[VISION] identification error:", err.message);
    return null;
  }
}

export async function extractTextFromImage(filePath: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn("[SIMPLE_MODE][OCR] no provider available, returning empty");
    return "";
  }

  console.log("[SIMPLE_MODE][OCR] sending image to GPT-4o Vision...");
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString("base64");
  const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  const dataUri = `data:image/${ext};base64,${base64}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read all visible text on this whisky bottle label. Return ONLY the text you can read, nothing else. Include: brand name, distillery name, age statement, ABV, cask type, any other text on the label. Do not add explanations.",
            },
            {
              type: "image_url",
              image_url: { url: dataUri, detail: "low" },
            },
          ],
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content || "";
    console.log(`[SIMPLE_MODE][OCR] extracted ${text.length} chars`);
    return text;
  } catch (err: any) {
    console.error("[SIMPLE_MODE][OCR] Vision API error:", err.message);
    return "";
  }
}
