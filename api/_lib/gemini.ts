let geminiClient: any = null;

export async function getGeminiClient(): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    const { GoogleGenAI } = await import("@google/genai");
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export function sendJson(res: any, status: number, body: unknown) {
  return res.status(status).json(body);
}
