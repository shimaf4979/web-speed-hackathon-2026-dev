# 投稿ユーザーフロー調査レポート

## 1. 対象

- 症状: `ユーザーフロー: 投稿` が scoring-tool 上で `計測できません` になる
- 依頼方針:
  - まず根本原因を調べる
  - レギュレーション範囲内なら実装側を直す
  - なるべくテストは変更しない

## 2. 結論

主因は、投稿モーダルのフォーム初期化タイミングだった。

[`application/client/src/containers/NewPostModalContainer.tsx`](/Users/shimamurayuudai/Documents/hackathon/webspeedhakathon/web-speed-hackathon-2026/application/client/src/containers/NewPostModalContainer.tsx) で、フォーム reset 用の `setResetKey()` が `dialog` の `toggle` イベントにぶら下がっていたため、画像・動画・音声の添付後にも再初期化が走るケースがあった。

その結果:

- textarea の入力値が消える
- `投稿する` ボタンが `disabled` に戻る
- scoring-tool の連続投稿シナリオで待機が解けず、`計測できません` になる

## 3. なぜ通常の投稿テストでは見えにくかったか

scoring-tool の `ユーザーフロー: 投稿` は、1 回の timespan 内で次を連続実行する。

1. テキスト投稿
2. 画像投稿
3. 動画投稿
4. 音声投稿

一方、既存の [`application/e2e/src/posting.test.ts`](/Users/shimamurayuudai/Documents/hackathon/webspeedhakathon/web-speed-hackathon-2026/application/e2e/src/posting.test.ts) は個別テストで分かれており、しかも動画投稿ケースが入っていない。

そのため「投稿導線は一見動くが、user flow だけ計測不能」という形で表面化していた。

## 4. 証拠

修正前に、投稿モーダルの状態を確認すると次のような挙動だった。

- 画像添付直後: textarea には入力済みテキストが残る
- 添付の約 1 秒後: textarea が空になる
- 同時に submit ボタンが `disabled` になる

同じ現象は動画添付でも再現した。

修正後は:

- 画像添付 1 秒後も 6 秒後も textarea が維持される
- 動画添付 1 秒後も 6 秒後も textarea が維持される
- submit ボタンも有効のまま

さらに `/` 起点の Playwright で、text -> image -> video -> audio の連続投稿がすべて成功した。

## 5. 採用した修正

[`application/client/src/containers/NewPostModalContainer.tsx`](/Users/shimamurayuudai/Documents/hackathon/webspeedhakathon/web-speed-hackathon-2026/application/client/src/containers/NewPostModalContainer.tsx#L65) の reset タイミングを変更した。

- `toggle`:
  - モーダルを開いたときの lazy render だけを担当
- `close`:
  - フォーム状態リセットを担当

要するに、`開閉っぽいイベントなら何でも reset` ではなく、`実際に閉じたときだけ reset` に寄せた。

## 6. 検証結果

実施した確認:

- `pnpm --dir application run build`
- `/` 起点の手元 Playwright で text -> image -> video -> audio 連続投稿
- `DEBUG=wsh:log pnpm --dir scoring-tool start --applicationUrl http://127.0.0.1:3001 --targetName 'ユーザーフロー: 投稿'`

確認できたこと:

- 修正後、投稿モーダルの入力値が添付後に消えなくなった
- `/` 起点の連続投稿は成功した
- scoring-tool でも、少なくとも 1 回は `PostFlowAction - timespan end` まで進み、`計測できません` の主因だったモーダル reset 問題は解消した

## 7. 未解決 / 別件

### A. `/not-found` 起点の既存 E2E は別導線で失敗する

[`application/e2e/src/posting.test.ts`](/Users/shimamurayuudai/Documents/hackathon/webspeedhakathon/web-speed-hackathon-2026/application/e2e/src/posting.test.ts) は `login()` の都合で `/not-found` 起点になるが、こちらは投稿後に `/posts/:id` へ進まず、別の不整合が残っている。

これは今回直したモーダル reset 問題とは別件。

### B. DB 再準備案は検討したが採用していない

ローカル確認中に、古い `database.sqlite` と model 定義のズレで `sound.waveformPeaks` 関連の schema 問題も見えた。

ただしこれは今回の採用修正には含めていない。ユーザー意向に合わせて、DB 再準備の共通導線追加は戻した。

## 8. レギュレーション観点

今回の採用修正は、UI や機能を削る最適化ではなく、投稿フォームの状態保持の不具合修正に留まる。

そのため:

- 投稿機能の要件を削っていない
- 採点回避のための分岐を入れていない
- テストだけを通すための特殊処理を入れていない

レギュレーション上は安全寄りの変更と判断してよい。

## 9. 今回の最終採用範囲

採用:

- 投稿モーダル reset タイミングの修正

不採用:

- DB 再準備の共通化
- 既存 E2E の書き換え

## 10. 次にやるなら

優先度順:

1. `/not-found` 起点の投稿 E2E がなぜ遷移しないかを別件として切り分ける
2. scoring-tool の音声ステップが不安定なら、`/` 起点での server log と response を合わせて再確認する
3. 動画投稿ケースを既存 E2E に追加するか検討する
   - ただし今回は「なるべくテストを変えない」方針のため未実施
