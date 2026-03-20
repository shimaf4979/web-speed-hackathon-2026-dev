import { loadKuromojiTokenizer } from "@web-speed-hackathon-2026/client/src/utils/load_kuromoji_tokenizer";

type Analyze = (typeof import("negaposi-analyzer-ja")) & {
  default?: typeof import("negaposi-analyzer-ja");
};

let analyzePromise: Promise<typeof import("negaposi-analyzer-ja")> | null = null;

async function loadAnalyzer() {
  analyzePromise ??= import("negaposi-analyzer-ja").then((module) => {
    const analyze = module as Analyze;
    return analyze.default ?? analyze;
  });
  return analyzePromise;
}

type SentimentResult = {
  score: number;
  label: "positive" | "negative" | "neutral";
};

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const [tokenizer, analyze] = await Promise.all([loadKuromojiTokenizer(), loadAnalyzer()]);
  const tokens = tokenizer.tokenize(text);
  const score = analyze(tokens);

  let label: SentimentResult["label"];
  if (score > 0.1) {
    label = "positive";
  } else if (score < -0.1) {
    label = "negative";
  } else {
    label = "neutral";
  }

  return { score, label };
}
