# タイピングゲーム開発仕様書 - Firebase Firestore連携版

## プロジェクト概要
ブラウザで動作するタイピングゲームを開発し、スコアをFirebase Firestoreに保存、GitHub Pagesで公開する。

## 技術スタック
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **データベース**: Firebase Firestore
- **ホスティング**: GitHub Pages
- **開発ツール**: Claude Code, Git, GitHub

## ディレクトリ構造
```
typing-game/
├── index.html          # メインHTML
├── css/
│   └── style.css      # スタイルシート
├── js/
│   ├── main.js        # メインゲームロジック
│   ├── firebase-config.js  # Firebase設定
│   └── score-manager.js    # スコア管理
├── assets/
│   └── words.json    # 出題単語データ
└── README.md          # プロジェクト説明
```

## 機能要件

### 1. 基本ゲーム機能
- **ゲームモード**
  - 時間制限モード（60秒、90秒、120秒から選択可能）
  - 単語数モード（25語、50語、100語から選択可能）

- **難易度設定**
  - Easy: 基本的な英単語（3-5文字）
  - Normal: 一般的な英単語（4-8文字）
  - Hard: 複雑な英単語（6-12文字）
  - Expert: プログラミング用語やフレーズ

- **ゲーム中の表示**
  - 現在の単語を大きく表示
  - 入力中の文字をリアルタイム表示
  - 正誤判定の視覚的フィードバック（正解：緑、ミス：赤）
  - 残り時間または残り単語数
  - 現在のスコア
  - WPM（Words Per Minute）のリアルタイム計算
  - 正確率の表示

### 2. スコアリング
- **計算方法**
  ```
  基本スコア = (正解文字数 × 10) - (ミス文字数 × 5)
  時間ボーナス = 残り時間（秒） × 2
  連続正解ボーナス = 連続正解数 × 5
  最終スコア = 基本スコア + 時間ボーナス + 連続正解ボーナス
  ```

- **記録項目**
  - プレイヤー名（最大20文字）
  - スコア
  - WPM（Words Per Minute）
  - 正確率（%）
  - 使用した難易度
  - プレイ日時

### 3. ランキング機能
- **表示内容**
  - 総合トップ10
  - 難易度別トップ5
  - 今日のトップ5
  - 自己ベスト

- **ランキング更新**
  - リアルタイム更新（Firestoreのリアルタイムリスナー使用）
  - ローディング表示

### 4. UI/UX要件
- **レスポンシブデザイン**
  - PC、タブレット、スマートフォン対応
  - 最小幅: 320px

- **アニメーション**
  - 文字入力時のアニメーション
  - スコア加算時のアニメーション
  - 画面遷移のスムーズなトランジション

- **カラーテーマ**
  - ダークモード/ライトモード切り替え
  - ローカルストレージに設定を保存

- **サウンド（オプション）**
  - タイピング音
  - 正解/不正解音
  - BGM（オン/オフ切り替え可能）

## Firebase設定

### Firestoreデータ構造
```javascript
// コレクション: scores
{
  playerName: string,      // プレイヤー名
  score: number,           // スコア
  wpm: number,            // Words Per Minute
  accuracy: number,        // 正確率（%）
  difficulty: string,      // 難易度（easy/normal/hard/expert）
  gameMode: string,        // ゲームモード（time/words）
  timestamp: timestamp,    // プレイ日時
  wordsCompleted: number,  // 完了した単語数
  totalKeystrokes: number, // 総タイプ数
  correctKeystrokes: number // 正解タイプ数
}

// コレクション: daily_scores（日別ランキング用）
{
  date: string,           // YYYY-MM-DD形式
  scores: array[{         // その日のスコア配列
    playerName: string,
    score: number,
    timestamp: timestamp
  }]
}
```

### セキュリティルール
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // スコアコレクション
    match /scores/{document} {
      // 読み取りは誰でも可能
      allow read: if true;
      
      // 書き込み制限
      allow create: if 
        // 必須フィールドの存在確認
        request.resource.data.playerName is string &&
        request.resource.data.score is number &&
        request.resource.data.wpm is number &&
        request.resource.data.accuracy is number &&
        // データ検証
        request.resource.data.playerName.size() > 0 &&
        request.resource.data.playerName.size() <= 20 &&
        request.resource.data.score >= 0 &&
        request.resource.data.score <= 100000 &&
        request.resource.data.wpm >= 0 &&
        request.resource.data.wpm <= 300 &&
        request.resource.data.accuracy >= 0 &&
        request.resource.data.accuracy <= 100;
      
      // 更新と削除は禁止
      allow update: if false;
      allow delete: if false;
    }
    
    // 日別スコアコレクション
    match /daily_scores/{document} {
      allow read: if true;
      allow write: if false; // Cloud Functionsからのみ更新
    }
  }
}
```

## 実装詳細

### index.html 構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>タイピングマスター</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- スタート画面 -->
    <div id="startScreen" class="screen">
        <h1>タイピングマスター</h1>
        <div class="settings">
            <!-- 難易度選択 -->
            <!-- ゲームモード選択 -->
            <!-- プレイヤー名入力 -->
        </div>
        <button id="startButton">ゲーム開始</button>
        <button id="rankingButton">ランキング</button>
    </div>
    
    <!-- ゲーム画面 -->
    <div id="gameScreen" class="screen hidden">
        <div class="game-info">
            <!-- スコア、時間、WPM表示 -->
        </div>
        <div class="word-display">
            <!-- 現在の単語表示 -->
        </div>
        <input type="text" id="wordInput">
        <div class="progress">
            <!-- 進捗表示 -->
        </div>
    </div>
    
    <!-- 結果画面 -->
    <div id="resultScreen" class="screen hidden">
        <h2>ゲーム終了！</h2>
        <div class="result-stats">
            <!-- 最終スコア、WPM、正確率表示 -->
        </div>
        <button id="saveScoreButton">スコア保存</button>
        <button id="retryButton">もう一度</button>
        <button id="homeButton">ホームへ</button>
    </div>
    
    <!-- ランキング画面 -->
    <div id="rankingScreen" class="screen hidden">
        <h2>ランキング</h2>
        <div class="ranking-tabs">
            <!-- 総合、難易度別、今日のランキングタブ -->
        </div>
        <div class="ranking-list">
            <!-- ランキング表示 -->
        </div>
        <button id="backButton">戻る</button>
    </div>
    
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js"></script>
    
    <!-- ゲームスクリプト -->
    <script src="js/firebase-config.js"></script>
    <script src="js/score-manager.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

### 出題単語データ (assets/words.json)
```json
{
  "easy": [
    "cat", "dog", "run", "jump", "book", "tree", "home", "food", "water", "happy"
  ],
  "normal": [
    "computer", "keyboard", "mountain", "beautiful", "interesting", "adventure"
  ],
  "hard": [
    "extraordinary", "revolutionary", "consciousness", "philosophical", "architecture"
  ],
  "expert": [
    "const express = require('express')",
    "function calculateAverage(numbers)",
    "document.getElementById('element')",
    "async function fetchData()"
  ]
}
```

### JavaScript実装ガイドライン

#### main.js - メインゲームロジック
```javascript
// グローバル変数
let currentWord = '';
let score = 0;
let timeLeft = 60;
let wordsCompleted = 0;
let totalKeystrokes = 0;
let correctKeystrokes = 0;
let gameTimer = null;
let startTime = null;

// ゲーム設定
const gameSettings = {
    difficulty: 'normal',
    gameMode: 'time',
    duration: 60,
    wordCount: 50,
    playerName: ''
};

// 主要関数
// - initGame(): ゲーム初期化
// - startGame(): ゲーム開始
// - endGame(): ゲーム終了処理
// - updateDisplay(): 画面更新
// - checkInput(): 入力チェック
// - calculateWPM(): WPM計算
// - calculateAccuracy(): 正確率計算
```

#### firebase-config.js - Firebase設定
```javascript
// Firebase設定（実際の値に置き換える）
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firestoreの設定
db.settings({
    timestampsInSnapshots: true,
    merge: true
});
```

#### score-manager.js - スコア管理
```javascript
class ScoreManager {
    constructor() {
        this.db = firebase.firestore();
    }
    
    // スコア保存
    async saveScore(scoreData) {
        try {
            const docRef = await this.db.collection('scores').add({
                ...scoreData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Score saved with ID: ", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error saving score: ", error);
            throw error;
        }
    }
    
    // トップスコア取得
    async getTopScores(limit = 10, difficulty = null) {
        let query = this.db.collection('scores')
            .orderBy('score', 'desc')
            .limit(limit);
        
        if (difficulty) {
            query = query.where('difficulty', '==', difficulty);
        }
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
    
    // リアルタイムランキング監視
    subscribeToRankings(callback) {
        return this.db.collection('scores')
            .orderBy('score', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                const rankings = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(rankings);
            });
    }
}
```

## スタイリング要件 (CSS)

```css
/* 基本スタイル */
- フォント: 'Segoe UI', 'Noto Sans JP', sans-serif
- プライマリカラー: #4A90E2
- セカンダリカラー: #7FBA00
- エラーカラー: #E74C3C
- 背景色（ライト）: #F5F5F5
- 背景色（ダーク）: #1E1E1E

/* レスポンシブブレークポイント */
- モバイル: max-width: 768px
- タブレット: max-width: 1024px
- デスクトップ: min-width: 1025px

/* アニメーション */
- トランジション: 0.3s ease
- キーフレームアニメーション使用
```

## テスト項目

### 機能テスト
- [ ] ゲーム開始・終了が正常に動作
- [ ] スコア計算が正確
- [ ] WPMと正確率の計算が正確
- [ ] Firestoreへのスコア保存
- [ ] ランキング取得と表示
- [ ] 難易度別の単語出題
- [ ] タイマーの正確な動作

### UI/UXテスト
- [ ] レスポンシブデザインの確認
- [ ] キーボード入力の反応速度
- [ ] エラー処理とユーザーフィードバック
- [ ] ローディング表示
- [ ] ダークモード切り替え

### セキュリティテスト
- [ ] 不正なスコアの投稿防止
- [ ] XSS対策
- [ ] Firebaseルールの動作確認

## デプロイ手順

1. **Firebase プロジェクトの作成**
   - Firebase Consoleで新規プロジェクト作成
   - Firestoreデータベースを有効化
   - セキュリティルールを設定

2. **ローカル開発**
   ```bash
   # Claude Codeでの実装
   # 上記の仕様に従って各ファイルを作成
   ```

3. **Git管理**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: タイピングゲーム with Firebase"
   ```

4. **GitHubリポジトリ作成とプッシュ**
   ```bash
   git remote add origin https://github.com/[username]/typing-game.git
   git branch -M main
   git push -u origin main
   ```

5. **GitHub Pages設定**
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

6. **動作確認**
   - `https://[username].github.io/typing-game/`でアクセス
   - 全機能のテスト実施

## 注意事項

- Firebase APIキーは公開されるが、Firestoreのセキュリティルールで保護
- 環境変数の使用を検討（GitHub Secretsは静的サイトでは使用不可）
- 定期的なFirestore使用量の監視（無料枠: 読み取り5万回/日、書き込み2万回/日）
- パフォーマンス最適化（画像の遅延読み込み、コード分割など）

## 今後の拡張案

- ユーザー認証機能（Firebase Auth）
- 多言語対応（日本語タイピング）
- カスタム単語セット
- マルチプレイヤーモード
- 実績システム
- プログレッシブウェブアプリ（PWA）化