# SHIFT MASH（地域シフト循環）開発計画書
*Vite + React + TypeScript + Tailwind v3 MVP*

## 1. プロジェクト概要

### 1.1 目的
当日発生する店舗間の人員不足と人員余剰を、同一エリア内でリアルタイムに相互補完するWebアプリケーション

### 1.2 技術スタック
- **フロントエンド**: Vite + React 18 + TypeScript
- **スタイリング**: Tailwind CSS v3
- **状態管理**: @tanstack/react-query + React Context
- **ルーティング**: React Router v6
- **UI ライブラリ**: HeadlessUI（最小限）
- **データ**: ローカルJSON（擬似API）

### 1.3 ターゲット環境
- **プライマリ**: モバイル（レスポンシブ）
- **デプロイ**: Netlify（GitHub連携）
- **ブラウザ**: Modern browsers（ES2020+）

## 2. アーキテクチャ設計

### 2.1 ディレクトリ構造
```
shift-mash-demo6/
├── public/
│   ├── mock/                   # モックデータ
│   │   ├── stores.json
│   │   ├── workers.json
│   │   ├── shifts.json
│   │   ├── publishings.json
│   │   └── requests.json
│   └── favicon.ico
├── src/
│   ├── components/             # 共通コンポーネント
│   │   ├── ui/                 # 基本UIコンポーネント
│   │   ├── ShiftCell.tsx       # シフトセル（メイン）
│   │   ├── RequestModal.tsx    # リクエストモーダル
│   │   ├── RequestInboxList.tsx # 受信リスト
│   │   └── Toast.tsx           # 通知
│   ├── pages/                  # ページコンポーネント
│   │   ├── DayShiftPage.tsx    # 当日シフト表
│   │   ├── InboxPage.tsx       # 受信リクエスト
│   │   └── OverviewPage.tsx    # サマリー
│   ├── lib/                    # ユーティリティ
│   │   ├── api.ts              # 擬似API
│   │   ├── types.ts            # 型定義
│   │   ├── utils.ts            # ヘルパー関数
│   │   └── constants.ts        # 定数
│   ├── hooks/                  # カスタムフック
│   │   ├── useShifts.ts
│   │   ├── useRequests.ts
│   │   └── usePublishings.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

### 2.2 データフロー
```
UI層 ← → React Query ← → 擬似API ← → ローカルJSON
      ↓
   ローカル状態（in-memory）
```

## 3. コンポーネント設計

### 3.1 主要コンポーネント

#### ShiftCell
```typescript
interface ShiftCellProps {
  shift: Shift;
  onRequestSupport: (shiftId: string) => void;
  onOfferDispatch: (shiftId: string) => void;
}
```
- シフト枠の表示
- 上部オーバーレイボタン（人員募集/他店舗に派遣）
- ステータス別カラーリング（不足=赤、余剰=青）

#### RequestModal
```typescript
interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'recruiting' | 'dispatch';
  shift: Shift;
  candidates: Worker[] | Recruiting[];
}
```
- リクエストタイプ別の表示制御
- 複数選択機能
- 0件時の公開メッセージ

#### RequestInboxList
```typescript
interface RequestInboxListProps {
  requests: Request[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}
```
- 受信リクエストの一覧表示
- 承認/拒否アクション

### 3.2 ページコンポーネント

#### DayShiftPage
- 当日シフト表の表示
- ShiftCellの配置とイベント処理
- モーダル制御

#### InboxPage
- 受信リクエストの管理
- 承認/拒否の処理

#### OverviewPage
- 不足/余剰件数のサマリー表示

## 4. API設計（擬似）

### 4.1 エンドポイント設計
```typescript
// 擬似APIインターフェース
interface MockAPI {
  getStores(): Promise<Store[]>;
  getWorkers(): Promise<Worker[]>;
  getTodayShifts(): Promise<Shift[]>;
  getPublishings(): Promise<Publishing>;
  getRequests(): Promise<Request[]>;
  
  // 更新系（ローカル状態）
  updateShift(shiftId: string, updates: Partial<Shift>): Promise<void>;
  createRequest(request: CreateRequestParams): Promise<void>;
  updateRequest(requestId: string, updates: Partial<Request>): Promise<void>;
  updatePublishing(updates: Partial<Publishing>): Promise<void>;
}
```

### 4.2 データ更新戦略
- React Queryで楽観的更新
- 先着制御のため、ローカルロック機構を実装
- 競合検出時のエラーハンドリング

## 5. 開発フェーズ

### Phase 1: プロジェクト基盤構築（1日目）
- [ ] Viteプロジェクト初期化
- [ ] 依存関係のインストール
- [ ] ESLint/Prettier設定
- [ ] Tailwind CSS設定
- [ ] 基本ディレクトリ構造作成
- [ ] モックデータ準備

### Phase 2: 基本UI実装（2日目）
- [ ] 基本レイアウトコンポーネント
- [ ] ShiftCellコンポーネント
- [ ] DayShiftPage実装
- [ ] ルーティング設定
- [ ] レスポンシブ対応

### Phase 3: コア機能実装（3-4日目）
- [ ] 擬似API実装
- [ ] React Query設定
- [ ] RequestModal実装
- [ ] 候補検索ロジック
- [ ] リクエスト送信機能

### Phase 4: 受信・承認機能（5日目）
- [ ] InboxPage実装
- [ ] RequestInboxList実装
- [ ] 承認/拒否処理
- [ ] 先着制御ロジック
- [ ] シフト更新機能

### Phase 5: 通知・UX改善（6日目）
- [ ] Toastコンポーネント
- [ ] エラーハンドリング
- [ ] ローディング状態
- [ ] 競合通知
- [ ] OverviewPage実装

### Phase 6: テスト・最適化（7日目）
- [ ] デモシナリオの動作確認
- [ ] バグ修正
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ改善
- [ ] デプロイ準備

## 6. 技術仕様詳細

### 6.1 状態管理
```typescript
// グローバル状態
interface AppState {
  currentUser: User;
  selectedDate: string;
  requestLocks: Set<string>; // 競合制御
}

// React Query キー
const queryKeys = {
  shifts: ['shifts', date] as const,
  requests: ['requests'] as const,
  publishings: ['publishings'] as const,
};
```

### 6.2 TypeScript型定義
```typescript
interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Worker {
  id: string;
  name: string;
  storeId: string;
  roles: string[];
  rating: number;
}

interface Shift {
  id: string;
  storeId: string;
  role: string;
  start: string;
  end: string;
  status: 'normal' | 'shortage' | 'surplus';
  assignedWorkerId?: string;
  supportWorkerId?: string; // 応援者
}

interface Request {
  id: string;
  from: string;
  to: string;
  type: 'recruiting' | 'dispatch';
  targetIds: string[];
  shiftId: string;
  status: 'pending' | 'approved' | 'rejected' | 'invalid';
  createdAt: number;
  approvedAt?: number;
}
```

### 6.3 擬似計算ロジック
```typescript
// 距離計算（簡易）
const calculateDistance = (store1: Store, store2: Store): number => {
  const latDiff = store1.lat - store2.lat;
  const lngDiff = store1.lng - store2.lng;
  return Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111; // km近似
};

// 移動時間計算
const calculateETA = (distanceKm: number): number => {
  return Math.ceil(distanceKm / 4 + 5); // 徒歩4km/h + 5分余裕
};
```

## 7. UI/UXガイドライン

### 7.1 デザインシステム
- **カラーパレット**: 
  - 不足: red-500/red-100
  - 余剰: blue-500/blue-100
  - 成立: green-500/green-100
- **タイポグラフィ**: Inter フォント
- **スペーシング**: 4px基準のTailwind デフォルト
- **コンポーネント**: 角丸8px、影は控えめ

### 7.2 インタラクションパターン
- タッチターゲット: 最小44px
- フィードバック: 即座のローディング状態
- エラー: Toastでの非侵襲的通知
- 成功: 緑色のチェックマークアニメーション

## 8. テスト戦略

### 8.1 手動テストシナリオ
```
シナリオ1: 不足→募集→0件公開
1. 09:00-12:00 ホールで欠勤入力
2. 「人員募集」ボタンクリック
3. 候補0件確認
4. 公開メッセージ表示確認

シナリオ2: 余剰→派遣→マッチング成立
1. 14:00-17:00 与野店に余剰設定
2. 「他店舗に派遣」ボタンクリック
3. 北浦和店の募集確認
4. リクエスト送信
5. 受信側で承認
6. 両シフトの更新確認
```

### 8.2 エラーハンドリング
- ネットワークエラー
- 競合エラー（先着敗北）
- バリデーションエラー
- タイムアウト

## 9. デプロイ計画

### 9.1 ビルド設定
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

### 9.2 Netlify設定
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 10. 完了基準

### 10.1 機能要件
- [ ] シフト枠上のボタン表示
- [ ] モーダルでの対象条件自動セット
- [ ] 候補リスト表示・複数選択
- [ ] 0件時の公開メッセージ
- [ ] 先着承認でのマッチング成立
- [ ] 両シフトの表示更新

### 10.2 非機能要件
- [ ] モバイル最適化（320px〜）
- [ ] 3秒以内の初期表示
- [ ] TypeScript strict mode
- [ ] ESLint/Prettier準拠
- [ ] Netlifyデプロイ成功

## 11. リスク管理

### 11.1 技術リスク
- **React Query学習コスト**: 公式ドキュメント+実装例準備
- **状態管理複雑化**: 最小限の状態に絞る
- **タイミング競合**: ローカルロック+楽観的更新で対応

### 11.2 スケジュールリスク
- **UI調整時間**: Tailwindテンプレート事前準備
- **デバッグ時間**: 各フェーズに20%バッファ確保

---

**開発開始予定**: 即座
**MVP完成目標**: 7日以内
**デモ準備完了**: 開発完了翌日

このMVPを基盤として、将来のQR打刻・評価システム・通知機能等への拡張が可能な設計としています。
