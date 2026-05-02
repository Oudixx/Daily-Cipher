// Daily Cipher - Wordle-inspired logic
const board = document.getElementById('game-board');
const regenBtn = document.getElementById('regen-btn');
const mobileInput = document.getElementById('mobile-input');
const difficultySelect = document.getElementById('difficulty');
// Game state variables
let currentBox = 0;
let currentGuess = "";
let secretWord = "";
let attempts = 0;
let guessedWords = []; 

// Fetches 5-letter word and dictionary data from external APIs
async function getNewCipher() {
    const diff = difficultySelect.value;
    board.innerHTML = ""; // Clear board before starting new game

    try {
        // Get a random list of 5-letter words based on difficulty
        const response = await fetch(`https://api.datamuse.com/words?sp=?????&max=${diff}`);
        const words = await response.json();
        if (words.length === 0) return getNewCipher(); // Try again if list is empty

        const randomEntry = words[Math.floor(Math.random() * words.length)];
        const wordToGuess = randomEntry.word;

        // Get the definition for the chosen word
        const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToGuess}`);
        const dictData = await dictResponse.json();

        // If dictionary has no record of the word, pick a different one
        if (dictData.title === "No Definitions Found") return getNewCipher();

        const entry = dictData[0];
        const meaning = entry.meanings[0];
        secretWord = wordToGuess.toLowerCase();

        // Push API data into the 5 info display slots
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

// Generates the 6x5  grid for the game board
function createGrid() {
    board.innerHTML = '';
    for (let r = 0; r < 6; r++) {
        const row = document.createElement('div');
        row.className = 'grid-row'; // Create horizontal container
        for (let c = 0; c < 5; c++) {
            const boxIndex = (r * 5) + c; // Calculate unique ID for every box
            const box = document.createElement('div');
            box.className = 'box';
            box.id = `box-${boxIndex}`;
            row.appendChild(box);
        }
        board.appendChild(row);
    }
}

// Manages the visual border highlight for the active tile
function updateVisualFocus() {
    const allBoxes = document.querySelectorAll('.box');
    allBoxes.forEach(box => box.classList.remove('current-box')); // Clean up old highlights
    const activeTile = document.getElementById(`box-${currentBox}`);
    // Only highlight if the guess isn't full yet
    if (activeTile && currentGuess.length < 5 && attempts < 6) {
        activeTile.classList.add('current-box');
    }
}

// Displays temporary pop-up notifications for user feedback
function notifyUser(message) {
    let alertBox = document.getElementById('archive-alert') || document.createElement('div');
    if (!alertBox.id) {
        alertBox.id = 'archive-alert';
        document.body.appendChild(alertBox);
    }
    alertBox.textContent = message;
    alertBox.classList.remove('hidden'); // Show the alert
    
    // Clear any existing timers so the alert stays for the full 3 seconds
    clearTimeout(alertBox.timeoutId);
    alertBox.timeoutId = setTimeout(() => alertBox.classList.add('hidden'), 3000);
}

// Compares the guess to the secret word and updates tile colors
function verifyGuess(guess) {
    guessedWords.push(guess); // Save guess to prevent repeats
    let startBoxIndex = attempts * 5;
    attempts++; // Move to next row count

    for (let i = 0; i < 5; i++) {
        let box = document.getElementById(`box-${startBoxIndex + i}`);
        let letter = guess[i];
        box.classList.add('flip'); // Trigger CSS flip animation

        // Logic for Green, Yellow, or Gray boxes
        if (letter === secretWord[i]) {
            box.classList.add('correct'); // Green
        } else if (secretWord.includes(letter)) {
            box.classList.add('present'); // Yellow
        } else {
            box.classList.add('absent'); // Gray
        }
    }

    mobileInput.value = ""; // Clear hidden input for next guess

    if (guess === secretWord) {
        setTimeout(() => showEndScreen(true), 2000); // Win state
    } else if (attempts === 6) {
        setTimeout(() => showEndScreen(false), 2000); // Loss state
    }
}

// Validates if the guessed word exists in the dictionary
async function isWordReal(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.ok; // Return true if API finds word, false if 404
    } catch (error) {
        return false;
    }
}

// Resets all game variables and UI for a new round
function resetGame() {
    document.getElementById('game-modal').classList.add('modal-hidden');
    mobileInput.value = ""; 
    currentBox = 0;
    currentGuess = "";
    attempts = 0;
    guessedWords = []; // Wipe guess history
    getNewCipher();
}

// Captures character input and mirrors it to the board tiles
mobileInput.addEventListener('input', () => {
    if (attempts >= 6) return;
    //Remove anything that isn't a letter
    const value = mobileInput.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
    const startBoxIndex = attempts * 5;

    for (let i = 0; i < 5; i++) {
        const box = document.getElementById(`box-${startBoxIndex + i}`);
        if (box) {
            // Update box text if letter exists at this position
            box.textContent = value[i] ? value[i].toUpperCase() : '';
        }
    }

    currentGuess = value;
    currentBox = startBoxIndex + value.length; // Sync box highlight with typing
    updateVisualFocus();
});

// Listens for Enter key to trigger word validation and submission
window.addEventListener('keyup', async (e) => {
    if (attempts >= 6) return;

    if (e.key === 'Enter') {
        const firstBox = document.getElementById(`box-${attempts * 5}`);
        const currentRow = firstBox ? firstBox.parentElement : null;

        // Validation 1: Word must be 5 letters
        if (currentGuess.length < 5) {
            notifyUser("NOT ENOUGH LETTERS");
            if (currentRow) {
                currentRow.classList.add('shake');
                setTimeout(() => currentRow.classList.remove('shake'), 500);
            }
            return;
        }

        // Validation 2: Word cannot be guessed twice
        if (guessedWords.includes(currentGuess)) {
            notifyUser("ALREADY TRIED THIS WORD");
            if (currentRow) {
                currentRow.classList.add('shake');
                setTimeout(() => currentRow.classList.remove('shake'), 500);
            }
            return;
        }

        // Validation 3: Word must be in dictionary (API check)
        if (firstBox) firstBox.style.opacity = "0.5"; // Dim row during API wait
        const valid = await isWordReal(currentGuess);
        if (firstBox) firstBox.style.opacity = "1";

        if (!valid) {
            notifyUser("WORD NOT FOUND IN ARCHIVE");
            if (currentRow) {
                currentRow.classList.add('shake');
                setTimeout(() => currentRow.classList.remove('shake'), 500);
            }
            return;
        }
        
        verifyGuess(currentGuess);
        currentGuess = ""; 
    }
});

// Triggers focus on the hidden input when the board is clicked
board.addEventListener('click', () => {
    mobileInput.focus(); // Force keyboard to open on mobile
});

// Event listeners for game controls and settings
regenBtn.addEventListener('click', resetGame);
difficultySelect.addEventListener('change', getNewCipher);

// Configures and displays the final win/loss modal
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
        title.style.color = "#4caf50"; // success Green
        message.textContent = "Cipher Decrypted. Access Granted.";
        modalGif.src = "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDhudDh1aXB2bjh2bm02bnI2MTJ5aXplMWxhNzA5amVzaHp2cW44aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Mb4G8rs7EYHmuPK/giphy.gif";
    } else {
        title.textContent = "FAILURE";
        title.style.color = "#f44336"; // Failure Red
        message.textContent = "Archive Locked. Connection Terminated.";
        modalGif.src = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3ppdmlldmVjajc5dTE5cGZ6aWdmeGcwdzg5Z2x3Y3p5MThhM3N3ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT5LMzV7WWLJTD6jLO/giphy.gif";
    }
}

// Automatically loads the first word when the page opens
getNewCipher();