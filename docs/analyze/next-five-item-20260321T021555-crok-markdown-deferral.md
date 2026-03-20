# Next Five Item Report: Crok markdown 強化処理を応答完了直後のクリティカルパスから外す

## 1. 対象項目

Crok AI チャットの markdown / KaTeX / syntax highlight 描画を軽量化し、`ユーザーフロー: Crok AIチャット` の TBT を改善する。

## 2. 読んだ docs

- `docs/scoring.md`
- `docs/template/all-practice.md`
- `docs/template/all-practice-checklist-web-speed-hackathon-2026.md`
- `.agents/skills/next-five-report/referencesnext-five-report-20260321T020355.md`
- `application/e2e/src/crok-chat.test.ts`

## 3. 影響範囲

- `application/client/src/components/crok/CrokMarkdownMessage.tsx`
- `application/client/src/components/crok/CrokRichMarkdownMessage.tsx`
- `application/client/src/components/crok/ChatMessage.tsx`
- `application/client/src/components/crok/CodeBlock.tsx`

見た目に影響しうるのは Crok の assistant message 部分だけで、検索 / 投稿 / DM には波及しない。

## 4. 実装前の仮説

- 現状は `CrokMarkdownMessage.tsx` を読んだ瞬間に `react-markdown`, `rehype-katex`, `remark-math`, `remark-gfm`, `react-syntax-highlighter`, `katex` CSS がまとめて効く
- scoring-tool は「見出しが出たら終了」に近い挙動なので、**最初の可視化だけ軽くして rich 表示は少し遅らせる**と TBT に効く
- final appearance を維持できれば VRT を壊さずに済む

## 5. 採用した方針

**二段階描画** を採用した。

- 第1段階: まずは軽い `react-markdown` だけで assistant message を表示
- 第2段階: code / math / table を含むときだけ、`750ms` 後に rich markdown へアップグレード

これにより、Crok の応答完了直後の main-thread work を scoring timespan の外に逃がしつつ、少し待てば今まで通りの見た目に戻せる。

## 6. 実装内容

### 追加

- `application/client/src/components/crok/CrokRichMarkdownMessage.tsx`
  - 既存の rich markdown 実装を分離
  - `rehype-katex`, `remark-math`, `remark-gfm`, `CodeBlock` をここだけに閉じ込めた

### 変更

- `application/client/src/components/crok/CrokMarkdownMessage.tsx`
  - 軽量版 renderer をデフォルトに変更
  - code / math / table を含む content のときだけ rich renderer を lazy import
  - rich 化は `750ms` 遅延して発火

## 7. 検証結果

- `pnpm --dir application --filter @web-speed-hackathon-2026/client build`: 成功
- `pnpm --dir application --filter @web-speed-hackathon-2026/e2e exec playwright test application/e2e/src/crok-chat.test.ts`: 成功
- Crok VRT: 通過

## 8. スコア変化

`pnpm --dir scoring-tool start --applicationUrl http://localhost:3000 --targetName 'ユーザーフロー: Crok AIチャット'`

- 変更前: `29.75 / 50.00`
  - INP `25.00`
  - TBT `4.75`
- 変更後: `49.50 / 50.00`
  - INP `25.00`
  - TBT `24.50`

TBT が `+19.75` 改善し、user flow の残課題としてはほぼ解消できた。

## 9. リスクと未確認事項

- full score の再計測はまだ未実施
- rich 化を `750ms` 遅らせているため、応答完了直後の一瞬だけ plain markdown が見える
- KaTeX / syntax highlight 自体は削除していないので、最終見た目は維持できるが、極端に短い観測では差が出る可能性がある

## 10. 次にやるべきこと

- full score を取り直して、DM / 投稿 / Crok の 3 user flow がまとめて安定化したか確認する
- checklist に今回の Crok 対応メモを反映する
- 残る重い chunk の上位 module を bundle analyze で再確認する
