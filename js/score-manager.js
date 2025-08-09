class ScoreManager {
    constructor() {
        this.db = window.firebaseDb;
        this.localScores = this.loadLocalScores();
    }
    
    loadLocalScores() {
        try {
            const scores = localStorage.getItem('typingGameScores');
            return scores ? JSON.parse(scores) : [];
        } catch (error) {
            console.error('ローカルスコアの読み込みエラー:', error);
            return [];
        }
    }
    
    saveLocalScore(scoreData) {
        try {
            this.localScores.push({
                ...scoreData,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            });
            
            this.localScores.sort((a, b) => b.score - a.score);
            
            if (this.localScores.length > 100) {
                this.localScores = this.localScores.slice(0, 100);
            }
            
            localStorage.setItem('typingGameScores', JSON.stringify(this.localScores));
        } catch (error) {
            console.error('ローカルスコアの保存エラー:', error);
        }
    }
    
    async saveScore(scoreData) {
        if (!this.db) {
            console.log('Firebaseが利用できません。ローカルに保存します。');
            this.saveLocalScore(scoreData);
            return 'local-' + Date.now();
        }
        
        try {
            const docRef = await this.db.collection('scores').add({
                ...scoreData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("スコアをFirebaseに保存しました: ", docRef.id);
            
            this.saveLocalScore(scoreData);
            
            return docRef.id;
        } catch (error) {
            console.error("Firebaseへの保存エラー: ", error);
            this.saveLocalScore(scoreData);
            throw error;
        }
    }
    
    async getTopScores(limit = 10, difficulty = null) {
        if (!this.db) {
            return this.getLocalTopScores(limit, difficulty);
        }
        
        try {
            let query = this.db.collection('scores')
                .orderBy('score', 'desc')
                .limit(limit);
            
            if (difficulty) {
                query = query.where('difficulty', '==', difficulty);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                return this.getLocalTopScores(limit, difficulty);
            }
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Firebaseからの取得エラー: ", error);
            return this.getLocalTopScores(limit, difficulty);
        }
    }
    
    getLocalTopScores(limit = 10, difficulty = null) {
        let scores = [...this.localScores];
        
        if (difficulty) {
            scores = scores.filter(s => s.difficulty === difficulty);
        }
        
        return scores.slice(0, limit);
    }
    
    async getTodayTopScores(limit = 5) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (!this.db) {
            return this.getLocalTodayTopScores(limit, today);
        }
        
        try {
            const snapshot = await this.db.collection('scores')
                .where('timestamp', '>=', today)
                .orderBy('timestamp', 'desc')
                .orderBy('score', 'desc')
                .limit(limit)
                .get();
            
            if (snapshot.empty) {
                return this.getLocalTodayTopScores(limit, today);
            }
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("今日のスコア取得エラー: ", error);
            return this.getLocalTodayTopScores(limit, today);
        }
    }
    
    getLocalTodayTopScores(limit = 5, today) {
        const todayScores = this.localScores.filter(score => {
            const scoreDate = new Date(score.timestamp);
            return scoreDate >= today;
        });
        
        return todayScores.slice(0, limit);
    }
    
    async getPersonalBest(playerName) {
        if (!playerName) return [];
        
        if (!this.db) {
            return this.getLocalPersonalBest(playerName);
        }
        
        try {
            const snapshot = await this.db.collection('scores')
                .where('playerName', '==', playerName)
                .orderBy('score', 'desc')
                .limit(10)
                .get();
            
            if (snapshot.empty) {
                return this.getLocalPersonalBest(playerName);
            }
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("個人ベスト取得エラー: ", error);
            return this.getLocalPersonalBest(playerName);
        }
    }
    
    getLocalPersonalBest(playerName) {
        const personalScores = this.localScores.filter(s => s.playerName === playerName);
        return personalScores.slice(0, 10);
    }
    
    subscribeToRankings(callback) {
        if (!this.db) {
            callback(this.getLocalTopScores(10));
            return () => {};
        }
        
        try {
            return this.db.collection('scores')
                .orderBy('score', 'desc')
                .limit(10)
                .onSnapshot(snapshot => {
                    const rankings = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(rankings);
                }, error => {
                    console.error("リアルタイム更新エラー: ", error);
                    callback(this.getLocalTopScores(10));
                });
        } catch (error) {
            console.error("サブスクリプションエラー: ", error);
            callback(this.getLocalTopScores(10));
            return () => {};
        }
    }
    
    async clearLocalScores() {
        try {
            localStorage.removeItem('typingGameScores');
            this.localScores = [];
            console.log('ローカルスコアをクリアしました');
        } catch (error) {
            console.error('ローカルスコアのクリアエラー:', error);
        }
    }
    
    async exportScores() {
        const allScores = this.localScores;
        const dataStr = JSON.stringify(allScores, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `typing-scores-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    async importScores(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const scores = JSON.parse(e.target.result);
                    
                    if (Array.isArray(scores)) {
                        this.localScores = [...this.localScores, ...scores];
                        this.localScores.sort((a, b) => b.score - a.score);
                        
                        if (this.localScores.length > 100) {
                            this.localScores = this.localScores.slice(0, 100);
                        }
                        
                        localStorage.setItem('typingGameScores', JSON.stringify(this.localScores));
                        resolve(scores.length);
                    } else {
                        reject(new Error('無効なファイル形式'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

window.scoreManager = new ScoreManager();

console.log('ScoreManager初期化完了');