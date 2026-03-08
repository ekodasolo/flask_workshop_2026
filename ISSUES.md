# ISSUES — エラー・トラブル記録

開発中に発生したエラーやトラブルを記録する。

## 記録フォーマット

```
### ISSUE-XXX: （タイトル）

- **発生日**: YYYY-MM-DD
- **状況**: 何をしていたときに発生したか
- **エラー内容**: エラーメッセージや症状
- **原因**: 判明した原因
- **対処法**: どう解決したか
- **関連ナレッジ**: KNOWLEDGE.md の該当項目へのリンク（あれば）
```

---

### ISSUE-001: TypeScript verbatimModuleSyntax エラー

- **発生日**: 2026-03-08
- **状況**: フロントエンド（Vite + React + TypeScript）のビルド時
- **エラー内容**: `TS1484: Type is imported using a value-only import when verbatimModuleSyntax is enabled`
- **原因**: Vite の最新テンプレートが `tsconfig.json` で `verbatimModuleSyntax: true` をデフォルト有効にしている。型のみの import に `import type` 構文が必須になる
- **対処法**: `import { Book }` → `import type { Book }` のように型のみの import を全て `import type` に変更（frontend/ 内の 10 ファイルに影響）
- **関連ナレッジ**: KNOWLEDGE.md KN-001

---

### ISSUE-002: npm run build の実行ディレクトリ誤り

- **発生日**: 2026-03-08
- **状況**: フロントエンドのビルド確認時
- **エラー内容**: プロジェクトルートで `npm run build` を実行し、`package.json` が見つからないエラー
- **原因**: `frontend/` サブディレクトリに `package.json` があるため、プロジェクトルートからは実行できない
- **対処法**: `cd frontend && npm run build` で正しいディレクトリから実行

---

### ISSUE-003: ?? (nullish coalescing) と空文字列の挙動

- **発生日**: 2026-03-08
- **状況**: CDK `params.ts` の `common.account` に空文字列 `''` を初期値として設定
- **エラー内容**: `??` 演算子では空文字列がフォールバックされず、環境変数 `CDK_DEFAULT_ACCOUNT` が使われない
- **原因**: `??` は `null` / `undefined` のみをフォールバック対象とする。空文字列 `''` は falsy だが nullish ではない
- **対処法**: プレースホルダー値 `'123456789012'` を設定して回避。代替案として `||` 演算子を使えば空文字列もフォールバック対象になる
- **関連ナレッジ**: KNOWLEDGE.md KN-002
