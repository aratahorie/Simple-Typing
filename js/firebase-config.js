const firebaseConfig = {
    apiKey: "AIzaSyBytX-uU0n8Kw-YpSE2Oz--6iJfExjCuqA",
    authDomain: "typing-game-9450d.firebaseapp.com",
    projectId: "typing-game-9450d",
    storageBucket: "typing-game-9450d.firebasestorage.app",
    messagingSenderId: "503381732768",
    appId: "1:503381732768:web:0c92d1faa3a6b240ea08c5",
    measurementId: "G-YPS635YTBL"
  };

let db = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    db.settings({
        timestampsInSnapshots: true,
        merge: true
    });
    
    console.log('Firebase初期化成功');
} catch (error) {
    console.error('Firebase初期化エラー:', error);
    console.warn('Firebaseが初期化されていません。オフラインモードで動作します。');
}

window.firebaseDb = db;