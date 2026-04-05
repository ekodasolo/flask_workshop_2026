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

---

### KN-003: CDK のパラメータ管理パターン — params.ts + コンテキスト変数の2層構造

デフォルト値を `params.ts` に集約し、デプロイ時にコンテキスト変数（`-c key=value`）で上書きする構成が使いやすい。

```typescript
// bin/infra.ts での解決優先順位
const username = app.node.tryGetContext('username')   // 1. コンテキスト変数
  ?? process.env.CDK_USERNAME                         // 2. 環境変数
  ?? common.username;                                 // 3. params.ts のデフォルト値
```

- `params.ts` を見ればデフォルト構成が一目でわかる
- デプロイ時の上書きで同一定義から複数環境を作成できる
- `package.json` の npm scripts にコンテキスト変数を埋め込めば、ユーザーごとのショートカットになる

---

### KN-004: CDK のコンストラクト設計 — スタック構成変更に強くする

コンストラクト（部品）を独立して設計しておけば、スタック構成の変更が容易になる。

**実例**: 1スタック構成 → BaseStack（ECR + DynamoDB）と AppStack（VPC + ALB + Fargate）の2スタックに分割した際、コンストラクト自体は無修正で済んだ。

ポイント:
- コンストラクトは他のコンストラクトに直接依存しない（props で受け取る）
- スタックはコンストラクトの「組み合わせ方」だけを定義する
- スタック間の参照は CDK のオブジェクト参照で自動解決される（`CfnOutput` / `Fn::ImportValue` を CDK が生成）

---

### KN-005: CDK の destroy でもコンテキスト変数が必要な理由

`cdk destroy` は内部で synth（CloudFormation テンプレート生成）を実行してからスタックを削除する。そのため、TypeScript コード内で参照しているコンテキスト変数が解決できないとエラーになる。

CDK の全操作は **synth → CloudFormation API 呼び出し** の2段階で動いている:
- `cdk deploy` → synth → CreateStack / UpdateStack
- `cdk destroy` → synth → DeleteStack
- `cdk diff` → synth → テンプレート同士を比較

---

### KN-006: CDK スタック分割で鶏と卵問題を解消する

Fargate タスクが ECR からイメージを pull する構成では、初回デプロイ時に ECR にイメージがないためタスクが起動できない。

**解決策**: ECR + DynamoDB を含む BaseStack を先にデプロイし、イメージ push 後に Fargate を含む AppStack をデプロイする。CDK App 内の特定スタックだけを `cdk deploy <スタック名>` で個別にデプロイできる。

```bash
cdk deploy BookReviewBase-fuji    # 1. ECR + DynamoDB
docker build & push                # 2. イメージ push
cdk deploy BookReviewApp-fuji     # 3. VPC + ALB + Fargate
```

---

### KN-007: ECS コンテナの環境変数は TaskDefinition が正

ECS（Fargate）でコンテナを実行する場合、コンテナに設定される環境変数は **TaskDefinition に定義されたものだけ** が反映される。Dockerfile の `ENV` で指定した値は、ローカルでの `docker run` 時には有効だが、ECS では無視される。

- Dockerfile の `ENV` はローカルテスト用のフォールバックとして有用
- 本番で必要な環境変数（`TABLE_NAME`, `AWS_DEFAULT_REGION` など）は CDK の TaskDefinition 側で必ず設定する
- boto3 は `AWS_DEFAULT_REGION` が未設定だとリージョンを特定できずエラーになるため、Dockerfile と TaskDefinition の両方で指定しておくと安全

---

### KN-008: ECS タスク起動失敗はスタック全体の Rollback を引き起こす

CDK で AppStack をデプロイすると、VPC・ALB・ECS サービスなどのリソースが順に作成され、**最後に ECS タスク（コンテナ）が起動**する。このとき以下のいずれかが起きるとタスクが起動失敗し、CloudFormation がスタック全体を Rollback する:

1. **アプリケーションの起動エラー** — `app.py` の実行時に例外が発生する（import エラー、環境変数未設定、DB 接続失敗など）
2. **ALB ヘルスチェック失敗** — コンテナは起動したが、ALB のヘルスチェックパス（`GET /`）に対して正常なレスポンスを返せない

どちらのケースも、CloudFormation のイベントには「ECS サービスが安定しなかった」としか表示されず、**本当の原因が見えにくい**。

**対策**:
- ヘルスチェック用エンドポイント（`GET /` → `200 OK`）を必ず実装しておく
- デプロイ前にローカルで `docker run` してコンテナが正常に起動するか確認する
- 起動失敗時は CloudWatch Logs でコンテナのログを確認し、アプリケーションレベルのエラーを特定する
- 環境変数（`TABLE_NAME`, `AWS_DEFAULT_REGION`）が TaskDefinition に正しく設定されているか確認する（KN-007 参照）

---

### KN-009: ドキュメント分割の判断基準 — 「誰が・いつ参照するか」で分ける

仕様書を分割するかどうかは、**参照する人とタイミングが違うかどうか** で判断する。

**実例**: SPEC.md にワークショップ運営情報と API システム仕様が混在していた。分割後:
- `API-SPEC.md` — 参加者がワークショップ中に実装の参照として使う
- `SPEC.md` — 講師がワークショップの準備・運営時に使う

**分割がうまくいっているかの検証方法**: 手順書からの参照先を確認する。ワークショップ中に参加者が SPEC.md を開く必要があるなら、まだ API の情報が SPEC.md に残っている＝分割が不完全。参照先を追うことで漏れを発見できる。

---

### KN-010: Docker イメージタグに `latest` だけを使わない

複数人で同じ ECR リポジトリにイメージを push する環境では、`latest` タグだけだと **誰がいつビルドしたイメージが動いているのか特定できない**。ECS タスクで問題が起きたときに調査が困難になる。

**採用したタグ形式**: `<ユーザー名>_<hhmm>`（例: `fuji_1430`）

```bash
docker build -t book-review-api:fuji_1430 .
```

- **誰が**: ユーザー名で特定できる
- **いつ**: 時刻で特定できる
- ワークショップのように同日中に複数人が push する場面で、どのイメージがデプロイされているか一目でわかる
- `latest` も併用して push すれば、タスク定義の変更なしに最新イメージを使うこともできる

---

### KN-011: Amplify でサブディレクトリのアプリをビルドする

リポジトリルート直下ではなくサブディレクトリ（例: `frontend/`）にアプリがある場合、Amplify のビルド設定で対応が必要。

**ポイント**:
- Amplify のビルド環境はリポジトリルートから開始される
- Root directory の設定が Amplify コンソールに見当たらない場合は、`amplify.yml` の `preBuild` で `cd` する
- **フェーズ間（preBuild → build）でカレントディレクトリは保持される**。`preBuild` で `cd frontend` すれば `build` ではそのまま `frontend/` にいる
- `artifacts.baseDirectory` はリポジトリルートからの相対パス（例: `frontend/dist`）

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

**注意**: Monorepo のチェックを有効にすると `amplify.yml` に `applications` キーが必要になる。単一アプリのサブディレクトリ構成では Monorepo を有効にしない。

- **関連 ISSUE**: ISSUE-004, ISSUE-005
