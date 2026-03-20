import type { IpadicFeatures, Tokenizer } from "kuromoji";

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

export async function loadKuromojiTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  tokenizerPromise ??= (async () => {
    const [{ default: Bluebird }, kuromojiModule] = await Promise.all([
      import("bluebird"),
      import("kuromoji"),
    ]);
    const builder = Bluebird.promisifyAll(kuromojiModule.default.builder({ dicPath: "/dicts" }));
    return builder.buildAsync();
  })();

  return tokenizerPromise;
}
