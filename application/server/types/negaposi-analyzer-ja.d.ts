declare module "negaposi-analyzer-ja" {
  import type { IpadicFeatures } from "kuromoji";
  const analyze: ((tokens: IpadicFeatures[]) => number) & {
    default?: (tokens: IpadicFeatures[]) => number;
  };
  export = analyze;
}
