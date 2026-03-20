# 2件目: プロフィール画像の軽量派生追加

## 1. 対象項目

- `next-five-report` の 2 件目
- 内容:
  - プロフィール画像に軽量派生を追加する
  - 小さい丸アバターでだけ軽量派生を使う
  - 大きいプロフィールヘッダーは元画像のまま維持する

## 2. 読んだ docs

- `README.md`
- `docs/regulation.md`
- `docs/scoring.md`
- `docs/test_cases.md`
- `scoring-tool/README.md`
- `docs/analyze/media-compression-safe-floor-20260320T174800.md`
- `docs/analyze/next-five-item-20260320T192238-dm-lightweight.md`

## 3. 影響範囲

主に触る面:

- ホームのタイムライン
- 投稿詳細
- 検索結果タイムライン
- DM 一覧
- DM 詳細ヘッダー
- アカウントメニュー
- ユーザープロフィール

主戦場ファイル:

- `application/client/src/components/foundation/AvatarImage.tsx`
- `application/client/src/utils/get_path.ts`
- `application/client/src/components/timeline/TimelineItem.tsx`
- `application/client/src/components/post/PostItem.tsx`
- `application/client/src/components/post/CommentItem.tsx`
- `application/client/src/components/application/AccountMenu.tsx`
- `application/client/src/components/direct_message/DirectMessageListPage.tsx`
- `application/client/src/components/direct_message/DirectMessagePage.tsx`
- `application/client/src/components/user_profile/UserProfileHeader.tsx`
- `application/scripts/generate-profile-image-variants.mjs`

## 4. 実装前の仮説

- `public/images/profiles/*.webp` は上位が `200KB-350KB` 台で、小さい丸アバターには過剰
- ただしプロフィールヘッダーは平均色抽出に使うため、元画像を変えると VRT を壊しやすい
- そのため「元画像の圧縮」は risky、「小さい表示だけ別派生」は safe 寄り

## 5. 採用した方針

安全優先案を採用した。

- 元のプロフィール画像は上書きしない
- `128x128` の `.avatar.webp` を追加生成する
- 小さい丸アバターだけ `.avatar.webp` を使う
- `user-profile` の大きいヘッダーは元画像を維持する
- `AvatarImage` のサイズ指定を各利用箇所で明示し、共通コンポーネント側の暗黙依存を減らす

## 6. 実装内容

### 6-1. 生成スクリプト追加

- `application/scripts/generate-profile-image-variants.mjs`
- `128x128`, `quality 72`, WebP の `.avatar.webp` を生成
- レポートを `application/reports/profile-image-variant-report.json` に保存

生成結果:

- 30 ファイル生成
- 元合計 `3,557,662 bytes`
- 派生合計 `69,108 bytes`

### 6-2. クライアント参照先追加

- `application/client/src/utils/profile_image_ids.ts`
- `application/client/src/utils/get_path.ts`

`getProfileImagePath(profileImageId, "avatar")` を追加し、生成済み ID のみ軽量派生へ切り替えるようにした。

### 6-3. 小さいアバターだけ切り替え

軽量派生へ切り替えた場所:

- タイムライン
- 投稿詳細
- コメント
- アカウントメニュー
- DM 一覧
- DM 詳細ヘッダー

元画像のまま残した場所:

- `user-profile` の大きいプロフィールヘッダー

### 6-4. AvatarImage の明示化

- `AvatarImage` から固定の `h-full w-full` を外した
- 親コンテナにフィットさせる利用箇所だけ `className="h-full w-full"` を明示した

これにより、DM 一覧のような「直接使うが固定サイズにしたい場所」でサイズ崩れが起きないようにした。

## 7. 検証結果

### build

- `pnpm --dir web-speed-hackathon-2026/application --filter @web-speed-hackathon-2026/client build`
- 成功

### relevant VRT / E2E

単体確認:

- `src/user-profile.test.ts` pass
- `src/dm.test.ts -g "新規DM開始モーダルが初期仕様通りにバリデーションされること"` pass
- `src/dm.test.ts -g "送信ボタンをクリックすると、DM詳細画面に遷移すること"` pass

関連まとめ実行:

- `src/home.test.ts`
- `src/dm.test.ts`
- `src/post-detail.test.ts`
- `src/search.test.ts`

所見:

- ホーム、検索、投稿詳細、DM の主要ケースは表示・操作とも通過
- まとめ実行では `DM 詳細へ遷移` が一度だけ flaky に失敗した
- 同ケースは単体再実行で pass したため、今回変更起因の恒常不具合とは断定していない

### manual-test 義務への影響

- `user-profile` の平均色抽出は pass を確認
- 画像 ALT や投稿導線、動画音声導線には触っていない
- 見た目の大きな差分は、小さい丸アバターの解像度最適化に限定

## 8. スコア変化

- ローカル採点はユーザー指示により未実施

## 9. リスクと未確認事項

- `caution` ではなく `safe 寄り`
- 理由:
  - 元画像は保持している
  - プロフィールヘッダーの色抽出も維持している
  - 計測時だけの分岐はない
  - 小さい表示だけに用途限定した派生追加である

残る注意点:

- DM 系 Playwright はもともと flakiness があるため、最終提出前に全体 E2E をもう一度見たい
- `.avatar.webp` 生成物を追加したため、以後プロフィール画像追加時は同スクリプトの実行を忘れないこと

## 10. 次にやるべきこと

1. この変更を 2 件目としてコミットする
2. 3 件目の「写真つき投稿詳細の先頭画像を LCP 候補として優先」に進む
3. 最終盤で全体 E2E をまとめて再確認する
