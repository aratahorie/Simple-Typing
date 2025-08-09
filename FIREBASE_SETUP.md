# Firebase セキュリティ設定ガイド

## APIキーの制限設定（推奨）

### 1. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクト「typing-game-9450d」を選択
3. 「APIとサービス」→「認証情報」を開く
4. 該当するAPIキーをクリック

### 2. APIキーの制限

#### アプリケーションの制限
- 「HTTPリファラー」を選択
- 以下のURLを追加：
  ```
  https://aratahorie.github.io/Simple-Typing/*
  http://localhost/*
  http://127.0.0.1/*
  ```

#### API制限
- 「キーを制限」を選択
- 以下のAPIのみを許可：
  - Cloud Firestore API
  - Firebase Installations API
  - Identity Toolkit API

### 3. Firebaseセキュリティルール（設定済み）

現在のセキュリティルール:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{document} {
      allow read: if true;
      allow create: if 
        request.resource.data.playerName is string &&
        request.resource.data.score is number &&
        request.resource.data.wpm is number &&
        request.resource.data.accuracy is number &&
        request.resource.data.playerName.size() > 0 &&
        request.resource.data.playerName.size() <= 20 &&
        request.resource.data.score >= 0 &&
        request.resource.data.score <= 100000 &&
        request.resource.data.wpm >= 0 &&
        request.resource.data.wpm <= 300 &&
        request.resource.data.accuracy >= 0 &&
        request.resource.data.accuracy <= 100;
      allow update: if false;
      allow delete: if false;
    }
  }
}
```

### 4. 使用量の監視

Firebase Consoleで定期的に確認：
- Firestore: 1日あたりの読み取り/書き込み回数
- 無料枠: 読み取り50,000回/日、書き込み20,000回/日

### 5. 不正利用への対処

もし不正利用が発生した場合：
1. Firebase Consoleで使用量を確認
2. 必要に応じてセキュリティルールを強化
3. 最悪の場合、一時的にFirestoreを無効化

## セキュリティのベストプラクティス

- ✅ クライアント側の検証に依存しない
- ✅ Firestoreセキュリティルールで制限
- ✅ APIキーにドメイン制限を設定
- ✅ 定期的な使用量の監視
- ✅ 異常なアクセスパターンの検知

## まとめ

Firebase設定が公開されても、適切なセキュリティルールとAPIキー制限により安全性は保たれます。
GitHub Pagesでの公開に問題はありません。