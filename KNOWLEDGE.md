# KNOWLEDGE — ナレッジ・TIPS 集

ISSUES.md での対応から得られたナレッジや TIPS をまとめる。

---

### KN-001: Vite + TypeScript で型 import には `import type` を使う

Vite の最新テンプレートは `verbatimModuleSyntax: true` がデフォルト。型のみを import する場合は必ず `import type { ... }` を使うこと。

```typescript
// NG
import { Book } from './types';

// OK
import type { Book } from './types';
```

- **関連 ISSUE**: ISSUE-001

---

### KN-002: `??` と `||` の使い分け

| 演算子 | フォールバック対象 |
|--------|-------------------|
| `??` (nullish coalescing) | `null`, `undefined` のみ |
| `||` (logical OR) | `null`, `undefined`, `''`, `0`, `false` など全 falsy 値 |

空文字列 `''` や `0` をフォールバックしたい場合は `||` を使う。意図的に「値が未設定のとき」だけフォールバックしたい場合は `??` を使い、初期値に `null` / `undefined` 以外を設定しないよう注意する。

- **関連 ISSUE**: ISSUE-003
