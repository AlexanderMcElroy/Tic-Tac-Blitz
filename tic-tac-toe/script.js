const player = function (name, value, raw, opponent){

    let score = 0;

    return{
        name: name,
        value: value,
        raw: raw,
        opponent: opponent,
        score
    };
};

const boardLogic = (() => {
    const gameBoard = [0,0,0,0,0,0,0,0,0];

    const lineRef = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    const _checkFull = function (array) {
        if(array.includes(0)){
            return false;
        };
        return true;
    };

    const claimTile = function (player,tileIndex){
        const boardFull = _checkFull(gameBoard);
        const legalSpace = [0];
        if(boardFull){
            legalSpace.push(gameLogic.getInformation(1)[player.opponent].value);
        };
        if(legalSpace.includes(gameBoard[tileIndex])){
            gameBoard[tileIndex] = player.value;
            domLogic.claimTile(player.value,tileIndex);
            return true;
        };
        return false;
    };

    const _resetLine = function (refIndex){
        const reference = lineRef[refIndex];
        reference.forEach(tile => {
            gameBoard[tile] = 0;
            domLogic.claimTile(0,tile);
        });
    };

    const reset = function (){
        for(let tile = 0; tile < 9; tile++){
            gameBoard[tile] = 0;
            domLogic.claimTile(0,tile);
        };
    };
    
    const _checkMatch = function (line){
        if(line[0] !== 0){
            return line.every((tile) => {
                return tile === line[0];
            });
        };
        return false;
    };

    const checkBoard = function (){
        for(let reference of lineRef){
            const line = [gameBoard[reference[0]], gameBoard[reference[1]], gameBoard[reference[2]]];
            const match = _checkMatch(line);
            if(match === true){
                _resetLine(lineRef.indexOf(reference));    
                return true;
            };
        };
        return false;
    };

    const getBoard = function (){
        return Array.from(gameBoard);
    };

    return{
        reset,
        claimTile,
        checkBoard,
        getBoard
    }

})();

const gameLogic = (() => {
    let players = [];
    let currentPlayer = null;

    const createPlayers = function (){
        const playerNames = domLogic.getNames();
        const playerOne = player(playerNames[0],1,1,1);
        players.push(playerOne);
        const playerTwo = player(playerNames[1],2,-1,0);
        players.push(playerTwo);
    };

    //Game mode functions and variables.
    let gameMode = "human";

    const changeMode = function (mode){
        if(gameRunning !== true){
            gameMode = mode;
            domLogic.changeMode(mode);
        };
    };
    
    //Game flow functions and variables.
    let gameRunning = false;

    const _start = function (){
        players = [];
        createPlayers();
        currentPlayer = players[0];
        domLogic.displayTurn(currentPlayer.value);
        domLogic.start();
        turnTimer.start();
    };

    const reset = function (){
        gameRunning = false;
        currentPlayer = null;
        gameMode = "human";
        boardLogic.reset();
        turnTimer.reset();
        domLogic.reset();
    };

    const _end = function (){
        const endCondition = {gameWon: false, winner: null};

        players.forEach(player => {
            if(player.score === 5){
                endCondition.gameWon = true;
                endCondition.winner = player;
            };
        });

        if(endCondition.gameWon === true){
            gameRunning = false;
            domLogic.displayTurn(0);
            turnTimer.stop();
            domLogic.displayWinner(endCondition.winner);
            currentPlayer = null;
        };
    };

    //Turn order functions and variables.
    
    const takeTurn = function (humanOrAI,tile){
        if(currentPlayer !== null){
            if(currentPlayer.value === 2 && humanOrAI !== gameMode){
                return;
            };
    
            let tileClaimed = boardLogic.claimTile(currentPlayer,tile);
    
            if (tileClaimed === true){
                let matchMade = boardLogic.checkBoard();
                if (matchMade === true){
                    currentPlayer.score++;
                    domLogic.updateScore(currentPlayer.value);
                };
    
                changeTurn();
                _end();
            };
        };
    };

    const changeTurn = function () {
        currentPlayer = players[currentPlayer.opponent];
        domLogic.displayTurn(currentPlayer.value);
        turnTimer.resetTurn();
        if(gameMode === "ai" && currentPlayer.value === 2){
            aiPlayer.takeTurn();
        };
    };
    
    //Timer functions and variables.
    let startTimerVar;
    let startTimer;

    const _countDown = function (){
        startTimer--;
        if (startTimer === 0){
            window.clearInterval(startTimerVar);
            domLogic.toggleStartTimer();
            _start();
        };
        domLogic.updateStartTimer(startTimer);
    };

    const createStartTimer = function (){
        if (gameRunning === false){
            window.clearInterval(startTimerVar);
            gameRunning = true;
            startTimer = 3;
            domLogic.updateStartTimer(startTimer);
            domLogic.toggleStartTimer();
            startTimerVar = window.setInterval(_countDown,1000)
        };
    };

    const getInformation = function (infoIndex){
        switch(infoIndex){
            case 0:
                return gameRunning;
            case 1:
                return players;
            case 2:
                return currentPlayer;
            default:
                return null;
        }
    }

    return{
        changeTurn,
        takeTurn,
        changeMode,
        createStartTimer,
        reset,
        getInformation
    }

})();

const aiPlayer = (() => {

    let difficulty = 0;

    const lineRef = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    let move;

    const _checkMatch = function (line){
        if(line[0] !== 0){
            let matchFound = line.every((tile) => {
                return tile === line[0];
            });
            return [matchFound, line[0]];
        };
        return [false];
    };

    const _checkBoard = function (board){
        for(let reference of lineRef){
            const line = [board[reference[0]], board[reference[1]], board[reference[2]]];
            const match = _checkMatch(line);
            if(match[0] === true){
                return match;
            };
        };
        return [false];        
    };

    const _miniMax = function (board, player){
        const match = _checkBoard(board);
        if(match[0] === true){
            return gameLogic.getInformation(1)[match[1]-1].raw * player.raw;
        };

        move = -1;
        score = -2;

        for(let i = 0; i < 9; i++){
            if(board[i] === 0){
                let newBoard = Array.from(board);
                newBoard[i] = player.value;
                let moveScore = -_miniMax(newBoard,gameLogic.getInformation(1)[player.opponent]);
                if (moveScore > score){
                    score = moveScore;
                    move = i;
                };
            };
        };

        if(move === -1){
            return 0;
        };

        return score;
    };

    const _bruteForce = function (board){
        let selfLegal = [0];
        let opponentLegal = [0];

        move = -1;

        if (board.includes(0) === false){
            selfLegal.push(1);
            opponentLegal.push(2);
        };

        for(let i = 0; i < 9; i++){
            if(opponentLegal.includes(board[i]) === true){
                const newBoard = Array.from(board);
                newBoard[i] = 1;
                const match = _checkBoard(newBoard);
                if (match[0] === true){
                    move = i;
                };
            };
        };

        for(let i = 0; i < 9; i++){
            if(selfLegal.includes(board[i]) === true){
                const newBoard = Array.from(board);
                newBoard[i] = 2;
                const match = _checkBoard(newBoard);
                if (match[0] === true){
                    move = i;
                };
            };
        };

        if(move===-1){
            while(move === -1){
                let i = Math.floor(Math.random() * 9);
                if(selfLegal.includes(board[i])){
                    move = i;
                    break;
                };
            };
        };

        return move;
    };

    const getDifficulty = function (){
        return difficulty;
    };

    const changeDifficulty = function(value){
        difficulty = value;
    };

    async function takeTurn () {
        switch(difficulty){
            case 0:
                _miniMax(boardLogic.getBoard(),gameLogic.getInformation(1)[1]);
                break;
            case 1:
                _bruteForce(boardLogic.getBoard())
                break;
        };
        await new Promise(resolve => setTimeout(resolve, 500));
        gameLogic.takeTurn("ai",move);
    };

    return{
        takeTurn,
        getDifficulty,
        changeDifficulty
    }

})();

const turnTimer = (() => {
    let timeSet = 3;
    let timeLeft = 0;
    let timeVar;

    const _countDown = function (){
        timeLeft--;
        domLogic.updateTurnTimer(timeLeft);
        if (timeLeft === 0){
            resetTurn();
            domLogic.updateTurnTimer(timeLeft);
            gameLogic.changeTurn();
        };
    };

    const set = function (time) {
        if (gameLogic.getInformation(0) === false){
            timeSet = time;
            domLogic.setTurnTimer(time);
        };
    };

    const start = function (){
        resetTurn();
        timeVar = window.setInterval(_countDown,1000);
    };

    const stop = function (){
        window.clearInterval(timeVar);
    };

    const resetTurn = function (){
        timeLeft = timeSet;
        domLogic.updateTurnTimer(timeLeft);
    };

    const reset = function (){
        stop();
        set(3);
        resetTurn();
    };

    return{
        start,
        reset,
        stop,
        resetTurn,
        set,
    }

})();

const domLogic = (() => {

    //Get necessary DOM elements.
    const centerCard = document.getElementById("centerCard");
    const menuCard = document.getElementById("menuCard");
    //Player elements.
    const playerOne = document.getElementById("playerOne");
    const scoreOne = document.getElementById("playerOneScore");
    const nameOne = document.getElementById("playerOneName");
    const darkenOne = document.getElementById("playerOneDarken");
    const playerTwo = document.getElementById("playerTwo");
    const scoreTwo = document.getElementById("playerTwoScore");
    const nameTwo = document.getElementById("playerTwoName");
    const darkenTwo = document.getElementById("playerTwoDarken");
    const avatarTwo = document.getElementById("playerTwoAvatar");
    //Turn timer elements.
    const turnTimerText = document.getElementById("timerDisplayText");
    const topCenter = document.getElementById("topCenter");
    const messageBox = document.getElementById("messageBox");
    const turnTimerSetter = document.getElementById("timerSetter");
    const turnTimerDisplay = document.getElementById("timerDisplay");
    //Start timer elements.
    const startTimerText = document.getElementById("startTimerText");
    const startTimerDiv = document.getElementById("startTimer")
    //End card elements.
    const endCard = document.getElementById("endCard");
    const winnerName = document.getElementById("winnerName");
    //Buttons.
    const resetButton = document.getElementById("reset");
    const startButton = document.getElementById("start");
    const humanButton = document.getElementById("vsPlayer");
    const aiButton = document.getElementById("vsAI");
    const tsButton = document.getElementById("threeSecondButton");
    const fsButton = document.getElementById("fiveSecondButton");
    const soButton = document.getElementById("soundOn");
    const sfButton = document.getElementById("soundOff");
    const eaButton = document.getElementById("aiEasy");
    const meButton = document.getElementById("aiMedium");
    const voSlider = document.getElementById("musicVolume");

    const displayTurn = function (playerValue){
        switch(playerValue){
            case 1:
                centerCard.style.borderColor = "var(--accent-two)";
                break;
            case 2:
                centerCard.style.borderColor = "var(--accent-three)";
                break;
            default:
                centerCard.style.borderColor = "white";
                break;
        };
    };

    const updateScore = function (playerValue){
        switch(playerValue){
            case 1:
                audioLogic.playAudio("hurt");
                scoreOne.innerText = gameLogic.getInformation(1)[0].score;
                _shake(playerTwo);
                break;
            case 2:
                audioLogic.playAudio("hurt");
                _shake(playerOne);
                scoreTwo.innerText = gameLogic.getInformation(1)[1].score;
                break;
            default:
                scoreOne.innerText = 0;
                scoreTwo.innerText = 0;
                break;
        };
    };

    const updateTurnTimer = function (time){
        turnTimerText.innerText = time;
        switch(time){
            case 2:
                topCenter.style.backgroundColor = "var(--accent-one-dark)";
                messageBox.style.backgroundColor = "var(--accent-one-darker)";
                break;
            case 1:
                topCenter.style.backgroundColor = "var(--accent-two)";
                messageBox.style.backgroundColor = "var(--accent-two-dark)";
                break;
            default:
                topCenter.style.backgroundColor = "var(--accent-three)";
                messageBox.style.backgroundColor = "var(--accent-three-dark)";
                break;
        };
    };

    const setTurnTimer = function (timer) {
        audioLogic.playAudio("click");
        switch(timer){
            case 3:
                tsButton.classList.add("tButtonOn")
                fsButton.classList.remove("tButtonOn")
                break;
            case 5:
                fsButton.classList.add("tButtonOn")
                tsButton.classList.remove("tButtonOn")
                break;
        };
    };

    const updateStartTimer = function (time) {
        audioLogic.playAudio("timer");
        startTimerText.innerText = time;
    };

    const toggleStartTimer = function () {
        startTimerDiv.classList.toggle("hidden");
    };

    const displayWinner = function (player) {
        audioLogic.playAudio("win");
        winnerName.innerText = player.name;
        endCard.classList.remove("hidden");
        switch(player.value){
            case 1:
                winnerName.style.color = "var(--accent-two-dark)";
                darkenTwo.classList.remove("hidden");
                break;
            case 2:
                winnerName.style.color = "var(--accent-three-dark)";
                darkenOne.classList.remove("hidden");
                break;
        };
    };

    const changeMode = function (mode) {
        audioLogic.playAudio("click");
        switch(mode){
            case "ai":
                humanButton.classList.add("hidden");
                aiButton.classList.remove("hidden");
                nameTwo.value = "Robobot";
                nameTwo.disabled = true;
                avatarTwo.src = "assets/images/robobot.png";
                break;
            case "human":
                humanButton.classList.remove("hidden");
                aiButton.classList.add("hidden");
                nameTwo.value = "Player 2";
                nameTwo.disabled = false;
                avatarTwo.src = "assets/images/playerTwo.png";
                break;
        };
    };

    const reset = function () {
        audioLogic.playAudio("click");
        updateScore(0);
        resetButton.classList.add("hidden");
        startButton.classList.remove("hidden");
        humanButton.classList.remove("hidden");
        aiButton.classList.add("hidden");
        nameOne.disabled = false;
        nameOne.style.color = "var(--foreground-light)";
        nameTwo.disabled = false;
        nameTwo.style.color = "var(--foreground-light)";
        tsButton.classList.add("tButtonOn")
        fsButton.classList.remove("tButtonOn")
        turnTimerSetter.classList.remove("hidden");
        turnTimerDisplay.classList.add("hidden");
        topCenter.classList.remove("shrink");
        messageBox.classList.remove("round");
        endCard.classList.add("hidden");
        darkenOne.classList.add("hidden");
        darkenTwo.classList.add("hidden");
        avatarTwo.src = "assets/images/playerTwo.png";
        displayTurn(0);
    };

    const start = function () {
        resetButton.classList.remove("hidden");
        startButton.classList.add("hidden");
        nameOne.disabled = true;
        nameOne.style.color = "var(--accent-two-dark)";
        nameTwo.disabled = true;
        nameTwo.style.color = "var(--accent-three-dark)";
        turnTimerSetter.classList.add("hidden");
        turnTimerDisplay.classList.remove("hidden");
        topCenter.classList.add("shrink");
        messageBox.classList.add("round");
    };

    const claimTile = function (value,tile){
        const tileElem = document.getElementById(`${tile}`);
        tileElem.classList = ["tile"];
        let className;
        switch(value){
            case 1:
                audioLogic.playAudio("claim");
                className = "playerOneSelect";
                break;
            case 2:
                audioLogic.playAudio("claim");
                className = "playerTwoSelect";
                break;
            default:
                return;
        };
        tileElem.classList.add(className);
    };

    const getNames = function (){
        return [nameOne.value, nameTwo.value]
    };

    const toggleMenu = function (){
        audioLogic.playAudio("click");
        menuCard.classList.toggle("hidden");
        if(menuCard.classList.contains("hidden")){
            settingsStorage.saveSettings();
        };
    };

    const loadSettings = function (settings){
        switch(settings.mute){
            case true:
                sfButton.click();
                break;
            case false:
                soButton.click();
                break;
        };

        voSlider.value = settings.volume * 10;
        voSlider.oninput();

        switch(settings.difficulty){
            case 0:
                eaButton.click();
                break;
            case 1:
                meButton.click();
                break;
        };
    };

    async function _shake (element) {
        element.classList.toggle("shake");
        await new Promise(resolve => setTimeout(resolve, 300));
        element.classList.toggle("shake");
    };

    return{
        displayTurn,
        updateScore,
        updateTurnTimer,
        setTurnTimer,
        updateStartTimer,
        toggleStartTimer,
        displayWinner,
        changeMode,
        reset,
        start,
        claimTile,
        toggleMenu,
        loadSettings,
        getNames
    };

})();

const audioLogic = (() => {
    let mute = false;
    let volume = 0.1;

    const hurt = new Audio();
    hurt.src = "assets/audio/hurt.wav";
    const claim = new Audio();
    claim.src = "assets/audio/claim.wav";
    const timer = new Audio();
    timer.src = "assets/audio/timer.wav";
    const click = new Audio();
    click.src = "assets/audio/button.wav";
    const win = new Audio();
    win.src = "assets/audio/win.wav";
    const theme = new Audio();
    theme.src = "assets/audio/theme.mp3";
    theme.preload = "auto";
    theme.volume = 0.1;
    theme.loop = true;

    const audioList = [hurt,claim,timer,click,win]

    const setupAudioElements = function (){
        audioList.forEach(audio => {
            audio.preload = "auto";
            audio.volume = 0;
            audio.play();
            audio.volume = 1;
        });
        claim.volume = 2;
    };

    const playAudio = function (sound){
        if(mute === false){
            let soundNode;

            switch(sound){
                case "hurt":
                    soundNode = hurt.cloneNode();
                    break;
                case "claim":
                    soundNode = claim.cloneNode();
                    break;
                case "timer":
                    soundNode = timer.cloneNode();
                    break;
                case "click":
                    soundNode = click.cloneNode();
                    break;
                case "win":
                    soundNode = win.cloneNode();
                    break;
                case "theme":
                    soundNode = theme;
                    break;
            };

            soundNode.play();
        };
    };

    const muteSwitch = function (value){
        switch(value){
            case "Off":
                mute = true;
                theme.volume = 0;
                break;
            case "On":
                mute = false;
                theme.volume = volume;
                break;
        };
    };

    const changeVolume = function (value){
        volume = value/10;
        if(mute === false){
            theme.volume = volume;
        };
    };

    const getSettings = function (){
        return {mute:mute,volume:volume}
    };

    return{
        setupAudioElements,
        muteSwitch,
        changeVolume,
        getSettings,
        playAudio
    };

})();

const initializer = (() => {

    const _addTileFunctions = function () {
        const tiles = document.querySelectorAll(".tile")
        tiles.forEach(element => {
            element.onclick = () => gameLogic.takeTurn("human",parseInt(element.id));
        });
    };

    const _addButtonFunctions = function () {
        document.getElementById("start").onclick = () => gameLogic.createStartTimer();
        document.getElementById("reset").onclick = () => gameLogic.reset();
        document.getElementById("vsPlayer").onclick = () => gameLogic.changeMode("ai");
        document.getElementById("vsAI").onclick = () => gameLogic.changeMode("human");
        document.getElementById("threeSecondButton").onclick = () => turnTimer.set(3);
        document.getElementById("fiveSecondButton").onclick = () => turnTimer.set(5);
        document.getElementById("play").onclick = () => {
            audioLogic.playAudio("theme");
            document.getElementById("titleCard").classList.add("fade");
        };
        document.getElementById("menuButton").onclick = () => domLogic.toggleMenu();
        document.getElementById("soundOn").onclick = () => audioLogic.muteSwitch("On");
        document.getElementById("soundOff").onclick = () => audioLogic.muteSwitch("Off");
        document.getElementById("musicVolume").oninput = function (){
            audioLogic.changeVolume(this.value);
        };
        document.getElementById("aiEasy").onclick = () => aiPlayer.changeDifficulty(0);
        document.getElementById("aiMedium").onclick = () => aiPlayer.changeDifficulty(1);
    };

    const start = function () {
        document.getElementById("playerOneName").value = "Player 1";
        document.getElementById("playerTwoName").value = "Player 2";
        document.getElementById("soundOn").click();
        document.getElementById("aiEasy").click();
        _addTileFunctions();
        _addButtonFunctions();
    };

    return {
        start
    };
})();

const settingsStorage = (() => {

    const saveSettings = function (){
        const settings = audioLogic.getSettings();
        settings.difficulty = aiPlayer.getDifficulty();
        window.localStorage.setItem("settings",JSON.stringify(settings));
    };

    const loadSettings = function (){
        const settings = JSON.parse(window.localStorage.getItem("settings"));
        domLogic.loadSettings(settings);
    };

    return{
        saveSettings,
        loadSettings
    }

})();

initializer.start();
audioLogic.setupAudioElements();
settingsStorage.loadSettings();