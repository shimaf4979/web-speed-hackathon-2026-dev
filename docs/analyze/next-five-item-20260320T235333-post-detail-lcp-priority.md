# 3件目: 写真つき投稿詳細のLCP優先化

## 1. 対象項目

- `next-five-report` の 3 件目
- 内容:
  - 写真つき投稿詳細ページの先頭画像を LCP 候補として優先する

## 2. 読んだ docs

- `README.md`
- `docs/regulation.md`
- `docs/scoring.md`
- `docs/test_cases.md`
- `scoring-tool/README.md`

## 3. 影響範囲

対象画面:

- 投稿詳細
- 写真つき投稿詳細
- ホームから投稿詳細へ遷移する導線

主戦場ファイル:

- `application/client/src/components/post/PostItem.tsx`
- `application/client/src/components/post/ImageArea.tsx`
- `application/client/src/components/foundation/CoveredImage.tsx`

## 4. 実装前の仮説

- 既存実装には `ImageArea` の `prioritizeLcpCandidate` がすでにある
- しかし投稿詳細の `PostItem` ではその props が未使用
- そのため、投稿詳細の画像先頭 1 枚が `loading="lazy"` / `fetchPriority="auto"` のままになっていた可能性が高い

## 5. 採用した方針

安全優先の最小変更を採用した。

- `PostItem` の画像表示だけ `prioritizeLcpCandidate` を有効化
- 既存の `ImageArea` / `CoveredImage` の実装は流用
- 画像品質や表示レイアウトには触れない

## 6. 実装内容

- `application/client/src/components/post/PostItem.tsx`

変更前:

- `<ImageArea images={post.images} />`

変更後:

- `<ImageArea images={post.images} prioritizeLcpCandidate />`

これにより、先頭画像だけ既存ロジック経由で次が有効になる。

- `fetchPriority="high"`
- `loading="eager"`

## 7. 検証結果

### build

- `pnpm --dir web-speed-hackathon-2026/application --filter @web-speed-hackathon-2026/client build`
- 成功

### relevant VRT / E2E

- `pnpm --dir web-speed-hackathon-2026/application --filter @web-speed-hackathon-2026/e2e exec playwright test src/post-detail.test.ts src/home.test.ts`
- `12 passed`

確認できたこと:

- 投稿詳細の通常表示
- 写真投稿詳細の VRT
- 写真が cover 拡縮し、著しく荒くないこと
- ホームから投稿詳細への導線
- ホーム側の動画、音声、画像表示の既存挙動

### manual-test 義務への影響

- 写真の品質を落としていない
- ALT 表示導線を変えていない
- 投稿詳細の UI 構成を変えていない

## 8. スコア変化

- ローカル採点はユーザー指示により未実施

## 9. リスクと未確認事項

- 判定: `safe`

理由:

- 既存にあった LCP 優先 props を正しく使うだけ
- 画像自体や画質には触れていない
- 手動テストの写真要件を弱めていない
- 表示差分が最小

未確認:

- 競技環境の Lighthouse 数値そのものは未採取

## 10. 次にやるべきこと

1. この変更を 3 件目としてコミットする
2. 4 件目の利用規約フォント読み込み戦略へ進む
3. 最後に全体 E2E をまとめて再確認する
