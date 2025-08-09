let wordsData = {};
let currentWord = '';
let currentWordIndex = 0;
let score = 0;
let timeLeft = 60;
let wordsCompleted = 0;
let totalKeystrokes = 0;
let correctKeystrokes = 0;
let gameTimer = null;
let startTime = null;
let wordsList = [];
let currentCombo = 0;
let maxCombo = 0;
let inputHistory = '';
let isGameActive = false;

const gameSettings = {
    difficulty: 'normal',
    gameMode: 'time',
    duration: 60,
    wordCount: 50,
    playerName: ''
};

const screens = {
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen'),
    ranking: document.getElementById('rankingScreen')
};

const elements = {
    playerName: document.getElementById('playerName'),
    startButton: document.getElementById('startButton'),
    rankingButton: document.getElementById('rankingButton'),
    wordInput: document.getElementById('wordInput'),
    currentWord: document.getElementById('currentWord'),
    wordDisplay: document.getElementById('wordDisplay'),
    scoreDisplay: document.getElementById('scoreDisplay'),
    timerDisplay: document.getElementById('timerDisplay'),
    wpmDisplay: document.getElementById('wpmDisplay'),
    accuracyDisplay: document.getElementById('accuracyDisplay'),
    progressFill: document.getElementById('progressFill'),
    comboDisplay: document.getElementById('comboDisplay'),
    comboCount: document.getElementById('comboCount'),
    inputFeedback: document.getElementById('inputFeedback'),
    timerLabel: document.getElementById('timerLabel'),
    finalScore: document.getElementById('finalScore'),
    finalWPM: document.getElementById('finalWPM'),
    finalAccuracy: document.getElementById('finalAccuracy'),
    finalWords: document.getElementById('finalWords'),
    maxComboDisplay: document.getElementById('maxCombo'),
    saveStatus: document.getElementById('saveStatus'),
    retryButton: document.getElementById('retryButton'),
    rankingButton2: document.getElementById('rankingButton2'),
    homeButton: document.getElementById('homeButton'),
    backButton: document.getElementById('backButton'),
    themeToggle: document.getElementById('themeToggle'),
    saveModal: document.getElementById('saveModal'),
    modalClose: document.getElementById('modalClose'),
    rankingPosition: document.getElementById('rankingPosition'),
    rankingList: document.getElementById('rankingList')
};

async function loadWords() {
    try {
        const response = await fetch('assets/words.json');
        wordsData = await response.json();
        console.log('単語データを読み込みました');
    } catch (error) {
        console.error('単語データの読み込みに失敗しました:', error);
        wordsData = {
            easy: ["cat", "dog", "run"],
            normal: ["computer", "keyboard"],
            hard: ["extraordinary"],
            expert: ["function test()"]
        };
    }
}

function initializeEventListeners() {
    elements.startButton.addEventListener('click', startGame);
    elements.rankingButton.addEventListener('click', showRankingScreen);
    elements.wordInput.addEventListener('input', handleInput);
    elements.wordInput.addEventListener('keypress', handleKeyPress);
    elements.retryButton.addEventListener('click', retry);
    elements.homeButton.addEventListener('click', goHome);
    elements.backButton.addEventListener('click', goHome);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.modalClose.addEventListener('click', closeModal);
    
    if (elements.rankingButton2) {
        elements.rankingButton2.addEventListener('click', showRankingScreen);
    }

    document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
        radio.addEventListener('change', handleGameModeChange);
    });

    document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameSettings.difficulty = e.target.value;
        });
    });

    document.querySelectorAll('input[name="duration"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameSettings.duration = parseInt(e.target.value);
        });
    });

    document.querySelectorAll('input[name="wordCount"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameSettings.wordCount = parseInt(e.target.value);
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });
}

function handleGameModeChange(e) {
    gameSettings.gameMode = e.target.value;
    const timeSettings = document.getElementById('timeSettings');
    const wordSettings = document.getElementById('wordSettings');
    
    if (gameSettings.gameMode === 'time') {
        timeSettings.classList.remove('hidden');
        wordSettings.classList.add('hidden');
    } else {
        timeSettings.classList.add('hidden');
        wordSettings.classList.remove('hidden');
    }
}

function startGame() {
    gameSettings.playerName = elements.playerName.value.trim() || 'ゲスト';
    
    resetGame();
    prepareWordsList();
    
    switchScreen('game');
    
    elements.wordInput.value = '';
    elements.wordInput.focus();
    
    isGameActive = true;
    startTime = Date.now();
    
    nextWord();
    
    if (gameSettings.gameMode === 'time') {
        timeLeft = gameSettings.duration;
        elements.timerLabel.textContent = '残り時間';
        startTimer();
    } else {
        timeLeft = gameSettings.wordCount;
        elements.timerLabel.textContent = '残り単語';
        elements.timerDisplay.textContent = timeLeft;
    }
    
    updateProgressBar();
}

function resetGame() {
    score = 0;
    wordsCompleted = 0;
    totalKeystrokes = 0;
    correctKeystrokes = 0;
    currentCombo = 0;
    maxCombo = 0;
    inputHistory = '';
    currentWordIndex = 0;
    isGameActive = false;
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    updateDisplay();
}

function prepareWordsList() {
    const difficulty = gameSettings.difficulty;
    const sourceWords = wordsData[difficulty] || wordsData.normal;
    
    wordsList = [];
    const targetCount = gameSettings.gameMode === 'words' ? gameSettings.wordCount : 200;
    
    while (wordsList.length < targetCount) {
        wordsList.push(...shuffleArray([...sourceWords]));
    }
    
    wordsList = wordsList.slice(0, targetCount);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function nextWord() {
    if (!isGameActive) return;
    
    if (gameSettings.gameMode === 'words' && currentWordIndex >= gameSettings.wordCount) {
        endGame();
        return;
    }
    
    currentWord = wordsList[currentWordIndex] || wordsList[0];
    currentWordIndex++;
    
    elements.currentWord.textContent = currentWord;
    elements.wordInput.value = '';
    inputHistory = '';
    
    updateWordDisplay();
}

function handleInput(e) {
    if (!isGameActive) return;
    
    const input = e.target.value;
    inputHistory = input;
    
    totalKeystrokes++;
    
    updateWordDisplay();
    
    if (input === currentWord) {
        handleCorrectWord();
    }
}

function handleKeyPress(e) {
    if (!isGameActive && e.key === 'Enter' && screens.start.classList.contains('active')) {
        startGame();
    }
}

function handleCorrectWord() {
    correctKeystrokes += currentWord.length;
    wordsCompleted++;
    currentCombo++;
    maxCombo = Math.max(maxCombo, currentCombo);
    
    const baseScore = currentWord.length * 10;
    const comboBonus = currentCombo > 1 ? currentCombo * 5 : 0;
    score += baseScore + comboBonus;
    
    elements.wordInput.classList.add('correct');
    elements.inputFeedback.textContent = '正解！';
    elements.inputFeedback.style.color = 'var(--success-color)';
    
    if (currentCombo > 1) {
        elements.comboDisplay.classList.add('active');
        elements.comboCount.textContent = currentCombo;
    }
    
    setTimeout(() => {
        elements.wordInput.classList.remove('correct');
        elements.inputFeedback.textContent = '';
        
        if (gameSettings.gameMode === 'words') {
            timeLeft--;
            elements.timerDisplay.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                endGame();
                return;
            }
        }
        
        nextWord();
        updateDisplay();
        updateProgressBar();
    }, 300);
}

function updateWordDisplay() {
    const displayHTML = currentWord.split('').map((char, index) => {
        const inputChar = inputHistory[index];
        let className = 'char';
        
        if (inputChar) {
            className += inputChar === char ? ' correct' : ' incorrect';
        }
        
        return `<span class="${className}">${char}</span>`;
    }).join('');
    
    elements.wordDisplay.innerHTML = displayHTML;
    
    if (inputHistory && inputHistory !== currentWord.substring(0, inputHistory.length)) {
        elements.wordInput.classList.add('incorrect');
        currentCombo = 0;
        elements.comboDisplay.classList.remove('active');
    } else {
        elements.wordInput.classList.remove('incorrect');
    }
}

function startTimer() {
    gameTimer = setInterval(() => {
        timeLeft--;
        elements.timerDisplay.textContent = timeLeft;
        
        updateProgressBar();
        
        if (timeLeft <= 10) {
            elements.timerDisplay.style.color = 'var(--error-color)';
        }
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateDisplay() {
    elements.scoreDisplay.textContent = score;
    elements.wpmDisplay.textContent = calculateWPM();
    elements.accuracyDisplay.textContent = calculateAccuracy() + '%';
}

function calculateWPM() {
    if (!startTime) return 0;
    
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    if (elapsedMinutes === 0) return 0;
    
    const wpm = Math.round(wordsCompleted / elapsedMinutes);
    return wpm;
}

function calculateAccuracy() {
    if (totalKeystrokes === 0) return 100;
    
    const accuracy = Math.round((correctKeystrokes / totalKeystrokes) * 100);
    return Math.min(100, accuracy);
}

function updateProgressBar() {
    let progress;
    
    if (gameSettings.gameMode === 'time') {
        progress = ((gameSettings.duration - timeLeft) / gameSettings.duration) * 100;
    } else {
        progress = ((gameSettings.wordCount - timeLeft) / gameSettings.wordCount) * 100;
    }
    
    elements.progressFill.style.width = progress + '%';
}

async function endGame() {
    isGameActive = false;
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    const finalWPM = calculateWPM();
    const finalAccuracy = calculateAccuracy();
    
    if (gameSettings.gameMode === 'time') {
        const timeBonus = timeLeft * 2;
        score += timeBonus;
    }
    
    elements.finalScore.textContent = score;
    elements.finalWPM.textContent = finalWPM;
    elements.finalAccuracy.textContent = finalAccuracy + '%';
    elements.finalWords.textContent = wordsCompleted;
    elements.maxComboDisplay.textContent = maxCombo;
    
    switchScreen('result');
    
    // 結果画面表示後に自動保存
    setTimeout(() => {
        autoSaveScore();
    }, 500);
}

async function autoSaveScore() {
    if (!window.scoreManager) {
        console.log('スコア管理システムが初期化されていません。');
        updateSaveStatus('error', 'スコア保存エラー');
        return;
    }
    
    // 保存中表示
    updateSaveStatus('saving', 'スコアを保存中...');
    
    const scoreData = {
        playerName: gameSettings.playerName,
        score: score,
        wpm: calculateWPM(),
        accuracy: calculateAccuracy(),
        difficulty: gameSettings.difficulty,
        gameMode: gameSettings.gameMode,
        wordsCompleted: wordsCompleted,
        totalKeystrokes: totalKeystrokes,
        correctKeystrokes: correctKeystrokes
    };
    
    try {
        await window.scoreManager.saveScore(scoreData);
        
        const rankings = await window.scoreManager.getTopScores(100);
        const position = rankings.findIndex(r => r.score <= score) + 1;
        
        // 保存完了表示
        updateSaveStatus('saved', '✓ スコアを保存しました');
        
        if (position > 0 && position <= 10) {
            elements.rankingPosition.textContent = `ランキング ${position}位 獲得！`;
            setTimeout(() => {
                elements.saveModal.classList.add('active');
            }, 1000);
        }
        
        console.log('スコアを自動保存しました');
    } catch (error) {
        console.error('スコアの自動保存に失敗しました:', error);
        updateSaveStatus('saved', '✓ ローカルに保存しました');
    }
}

function updateSaveStatus(status, message) {
    const saveStatus = elements.saveStatus;
    if (!saveStatus) return;
    
    saveStatus.classList.remove('saved', 'error');
    
    if (status === 'saved') {
        saveStatus.classList.add('saved');
        saveStatus.innerHTML = '<span class="save-icon">✓</span><span class="save-text">' + message + '</span>';
    } else if (status === 'error') {
        saveStatus.classList.add('error');
        saveStatus.innerHTML = '<span class="save-icon">⚠️</span><span class="save-text">' + message + '</span>';
    } else {
        saveStatus.innerHTML = '<span class="save-icon">💾</span><span class="save-text">' + message + '</span>';
    }
}

// 手動保存機能（必要に応じて残す）
async function saveScore() {
    await autoSaveScore();
}

function retry() {
    switchScreen('start');
    resetGame();
}

function goHome() {
    switchScreen('start');
    resetGame();
}

async function showRankingScreen() {
    switchScreen('ranking');
    await loadRankings('overall');
}

async function loadRankings(type) {
    if (!window.scoreManager) {
        elements.rankingList.innerHTML = '<div class="loading">Firebase が初期化されていません</div>';
        return;
    }
    
    elements.rankingList.innerHTML = '<div class="loading">ランキングを読み込み中...</div>';
    
    try {
        let rankings = [];
        
        switch(type) {
            case 'overall':
                rankings = await window.scoreManager.getTopScores(10);
                break;
            case 'difficulty':
                rankings = await window.scoreManager.getTopScores(5, gameSettings.difficulty);
                break;
            case 'today':
                rankings = await window.scoreManager.getTodayTopScores(5);
                break;
            case 'personal':
                rankings = await window.scoreManager.getPersonalBest(gameSettings.playerName);
                break;
        }
        
        displayRankings(rankings);
    } catch (error) {
        console.error('ランキングの読み込みに失敗しました:', error);
        elements.rankingList.innerHTML = '<div class="loading">ランキングの読み込みに失敗しました</div>';
    }
}

function displayRankings(rankings) {
    if (!rankings || rankings.length === 0) {
        elements.rankingList.innerHTML = '<div class="loading">ランキングデータがありません</div>';
        return;
    }
    
    const html = rankings.map((rank, index) => {
        const position = index + 1;
        let positionClass = 'ranking-position';
        
        if (position === 1) positionClass += ' gold';
        else if (position === 2) positionClass += ' silver';
        else if (position === 3) positionClass += ' bronze';
        
        return `
            <div class="ranking-item">
                <div class="${positionClass}">${position}</div>
                <div class="ranking-details">
                    <div class="ranking-name">${rank.playerName || 'ゲスト'}</div>
                    <div class="ranking-stats">
                        <span>WPM: ${rank.wpm || 0}</span>
                        <span>正確率: ${rank.accuracy || 0}%</span>
                        <span>難易度: ${rank.difficulty || 'normal'}</span>
                    </div>
                </div>
                <div class="ranking-score">${rank.score || 0}</div>
            </div>
        `;
    }).join('');
    
    elements.rankingList.innerHTML = html;
}

function handleTabChange(e) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    e.target.classList.add('active');
    
    const tabType = e.target.dataset.tab;
    loadRankings(tabType);
}

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    elements.themeToggle.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggle.querySelector('.theme-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function closeModal() {
    elements.saveModal.classList.remove('active');
}

window.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    await loadWords();
    initializeEventListeners();
    
    elements.playerName.focus();
});