// Daily Cipher - A Wordle-inspired game
// DOM element references
const board = document.getElementById('game-board');
const regenBtn = document.getElementById('regen-btn');
const mobileInput = document.getElementById('mobile-input');
const difficultySelect = document.getElementById('difficulty');

// Game state variables
let currentBox = 0;
let currentGuess = "";
let secretWord = "";
let attempts = 0;

/**
 * INITIALIZATION & API HANDLING
 */

// Fetches 5-letter word and metadata from Datamuse and Dictionary APIs
async function getNewCipher() {
    const diff = difficultySelect.value;
    board.innerHTML = "";

    try {
        const response = await fetch(`https://api.datamuse.com/words?sp=?????&max=${diff}`);
        const words = await response.json();
        if (words.length === 0) return getNewCipher();

        const randomEntry = words[Math.floor(Math.random() * words.length)];
        const wordToGuess = randomEntry.word;

        const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToGuess}`);
        const dictData = await dictResponse.json();

        // Recursively fetch if the selected word doesn't have a dictionary definition
        if (dictData.title === "No Definitions Found") return getNewCipher();

        const entry = dictData[0];
        const meaning = entry.meanings[0];
        secretWord = wordToGuess.toLowerCase();

        // Display 5 API data points for the Word document requirement
        document.getElementById('data-1').textContent = meaning.partOfSpeech;
        document.getElementById('data-2').textContent = entry.phonetic || "N/A";
        document.getElementById('data-3').textContent = meaning.definitions[0].definition;
        document.getElementById('data-4').textContent = 
            (meaning.synonyms && meaning.synonyms.length > 0) ? meaning.synonyms.slice(0, 3).join(", ") : "None found";
        document.getElementById('data-5').textContent = 
            (meaning.antonyms && meaning.antonyms.length > 0) ? meaning.antonyms.slice(0, 3).join(", ") : "None found";

        createGrid();
        updateVisualFocus();
        console.log("Cipher Loaded: " + secretWord);

    } catch (error) {
        document.getElementById('data-3').textContent = "Connection to Archive Failed. Check your network.";
        console.error("Error fetching cipher details:", error);
    }
}

/**
 * GRID & UI HELPERS
 */

function createGrid() {
    board.innerHTML = '';
    for (let r = 0; r < 6; r++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        for (let c = 0; c < 5; c++) {
            const boxIndex = (r * 5) + c;
            const box = document.createElement('div');
            box.className = 'box';
            box.id = `box-${boxIndex}`;
            row.appendChild(box);
        }
        board.appendChild(row);
    }
}

function updateVisualFocus() {
    const allBoxes = document.querySelectorAll('.box');
    allBoxes.forEach(box => box.classList.remove('current-box'));
    const activeTile = document.getElementById(`box-${currentBox}`);
    if (activeTile && currentGuess.length < 5 && attempts < 6) {
        activeTile.classList.add('current-box');
    }
}

function notifyUser(message) {
    let alertBox = document.getElementById('archive-alert') || document.createElement('div');
    if (!alertBox.id) {
        alertBox.id = 'archive-alert';
        document.body.appendChild(alertBox);
    }
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    
    clearTimeout(alertBox.timeoutId);
    alertBox.timeoutId = setTimeout(() => alertBox.classList.add('hidden'), 3000);
}

/**
 * GAME LOGIC
 */

function verifyGuess(guess) {
    let startBoxIndex = attempts * 5;
    attempts++;

    for (let i = 0; i < 5; i++) {
        let box = document.getElementById(`box-${startBoxIndex + i}`);
        let letter = guess[i];
        box.classList.add('flip');

        if (letter === secretWord[i]) {
            box.classList.add('correct');
        } else if (secretWord.includes(letter)) {
            box.classList.add('present');
        } else {
            box.classList.add('absent');
        }
    }

    // Reset mobile input for the next attempt
    mobileInput.value = "";

    if (guess === secretWord) {
        setTimeout(() => showEndScreen(true), 2000);
    } else if (attempts === 6) {
        setTimeout(() => showEndScreen(false), 2000);
    }
}

async function isWordReal(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

function resetGame() {
    document.getElementById('game-modal').classList.add('modal-hidden');
    mobileInput.value = ""; 
    currentBox = 0;
    currentGuess = "";
    attempts = 0;
    getNewCipher();
}

/**
 * EVENT LISTENERS
 */
mobileInput.addEventListener('input', () => {
    if (attempts >= 6) return;

    // Filter for only letters and limit to 5
    const value = mobileInput.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
    const startBoxIndex = attempts * 5;

    for (let i = 0; i < 5; i++) {
        const box = document.getElementById(`box-${startBoxIndex + i}`);
        if (box) {
            box.textContent = value[i] ? value[i].toUpperCase() : '';
        }
    }

    currentGuess = value;
    currentBox = startBoxIndex + value.length;
    updateVisualFocus();
});

// Handle special keys (Enter) via window listener
window.addEventListener('keyup', async (e) => {
    // 1. If the game is over, do nothing
    if (attempts >= 6) return;

    // 2. ONLY handle the Enter key here. 
    if (e.key === 'Enter') {
        if (currentGuess.length < 5) {
            notifyUser("NOT ENOUGH LETTERS");
            return;
        }

        const firstBox = document.getElementById(`box-${attempts * 5}`);
        const currentRow = firstBox.parentElement;
        
        firstBox.style.opacity = "0.5";
        const valid = await isWordReal(currentGuess);
        firstBox.style.opacity = "1";

        if (!valid) {
            notifyUser("WORD NOT FOUND IN ARCHIVE");
            currentRow.classList.add('shake');
            setTimeout(() => currentRow.classList.remove('shake'), 500);
            return;
        }
        
        verifyGuess(currentGuess);
        currentGuess = ""; 
        return; // Exit the function
    }

});

// Open keyboard when user taps the board
board.addEventListener('click', () => {
    mobileInput.focus();
});

regenBtn.addEventListener('click', resetGame);
difficultySelect.addEventListener('change', getNewCipher);

function showEndScreen(isWin) {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('modal-title');
    const message = document.getElementById('modal-message');
    const modalGif = document.getElementById('modal-gif');
    const wordDisplay = document.getElementById('final-word-display');

    modal.classList.remove('modal-hidden');
    wordDisplay.textContent = secretWord.toUpperCase();

    if (isWin) {
        title.textContent = "SUCCESS";
        title.style.color = "#4caf50";
        message.textContent = "Cipher Decrypted. Access Granted.";
        modalGif.src = "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDhudDh1aXB2bjh2bm02bnI2MTJ5aXplMWxhNzA5amVzaHp2cW44aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Mb4G8rs7EYHmuPK/giphy.gif";
    } else {
        title.textContent = "FAILURE";
        title.style.color = "#f44336";
        message.textContent = "Archive Locked. Connection Terminated.";
        modalGif.src = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3ppdmlldmVjajc5dTE5cGZ6aWdmeGcwdzg5Z2x3Y3p5MThhM3N3ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT5LMzV7WWLJTD6jLO/giphy.gif";
    }
}

// Start game on load
getNewCipher();