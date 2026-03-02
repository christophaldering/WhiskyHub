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
