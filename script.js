// ===============================
// DFA DEFINITION FOR VENDO MACHINE
// ===============================
const VendoDFA = {
    // States Q
    Q: {
        q0: { name: 'INSERT COINS', color: '#95A5A6' },
        q1: { name: 'SELECTING', color: '#3498DB' },
        q2: { name: 'BREWING', color: '#E74C3C' },
        q3: { name: 'READY', color: '#2ECC71' }
    },
    
    // Alphabet Σ
    Sigma: {
        INSERT_COIN: 'INSERT_COIN',
        SELECT: 'SELECT',
        BREW: 'BREW',
        COLLECT: 'COLLECT',
        RETURN: 'RETURN'
    },
    
    // Transition function δ: Q × Σ → Q
    delta: {
        q0: { INSERT_COIN: 'q1' },
        q1: { INSERT_COIN: 'q1', SELECT: 'q2', RETURN: 'q0' },
        q2: { BREW: 'q3', RETURN: 'q0' },
        q3: { COLLECT: 'q0', RETURN: 'q0' }
    },
    
    // Start state
    q0: 'q0',
    
    // Accept states F
    F: ['q3'],
    
    // State descriptions
    descriptions: {
        q0: 'Insert coins to begin',
        q1: 'Select coffee type or insert more coins',
        q2: 'Ready to brew coffee',
        q3: 'Coffee is ready! Collect and enjoy'
    }
};

// ===============================
// GLOBAL STATE
// ===============================
let currentState = VendoDFA.q0;
let selectedCoffee = null;
let totalMoney = 0;
let coffeePrice = 0;
let transitionHistory = [];
let database = JSON.parse(localStorage.getItem('vendoDFA_db') || '[]');
let totalTransitions = 0;
let coffeesMade = 0;
let totalMoneyInserted = 0;

// Coffee types with prices
const coffeeTypes = {
    espresso: { name: 'Espresso', color: '#2C1810', price: 20 },
    latte: { name: 'Café Latte', color: '#E6D3B9', price: 25 },
    cappuccino: { name: 'Cappuccino', color: '#C8AD7F', price: 30 },
    mocha: { name: 'Mocha', color: '#5C3A21', price: 35 }
};

// ===============================
// INITIALIZATION
// ===============================
function init() {
    showLoading();
    createBackgroundAnimation();
    setupCoffeeSelection();
    setupDFATable();
    loadFromStorage();
    
    // Calculate stats
    totalTransitions = database.length;
    coffeesMade = database.filter(entry => entry.toState === 'q3').length;
    
    // Calculate total money inserted from history
    const moneyLogs = database.filter(entry => entry.input === 'INSERT_COIN');
    totalMoneyInserted = moneyLogs.reduce((sum, entry) => sum + (entry.coinValue || 0), 0);
    
    // Initial log
    logToDatabase('SYSTEM', 'INIT', currentState);
    updateDisplay();
    updateStatistics();
    
    setTimeout(() => {
        hideLoading();
    }, 1000);
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function createBackgroundAnimation() {
    const container = document.getElementById('bgAnimation');
    for (let i = 0; i < 10; i++) {
        const circle = document.createElement('div');
        circle.className = 'bg-circle';
        circle.style.width = `${Math.random() * 100 + 50}px`;
        circle.style.height = circle.style.width;
        circle.style.left = `${Math.random() * 100}%`;
        circle.style.top = `${Math.random() * 100}%`;
        circle.style.opacity = Math.random() * 0.3 + 0.1;
        circle.style.animationDuration = `${Math.random() * 30 + 20}s`;
        circle.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(circle);
    }
}

// ===============================
// COIN OPERATIONS
// ===============================
function insertCoin(coinValue) {
    if (currentState === 'q0' || currentState === 'q1') {
        totalMoney += coinValue;
        totalMoneyInserted += coinValue;
        updateMoneyDisplay();
        
        // Animate coin insertion
        animateCoinInsertion(coinValue);
        
        // Log coin insertion
        logToDatabase(currentState, 'INSERT_COIN', currentState === 'q0' ? 'q1' : 'q1', coinValue);
        
        // Update state if coming from q0
        if (currentState === 'q0') {
            transition('INSERT_COIN');
        } else {
            showMessage(`Inserted ₱${coinValue}. Total: ₱${totalMoney}`);
        }
        
        // Enable buttons if enough money
        updateButtonStates();
    } else {
        showError('Cannot insert coins at this stage');
    }
}

function animateCoinInsertion(coinValue) {
    const coinSlot = document.querySelector('.coin-slot');
    const colors = {
        1: 'var(--coin-copper)',
        5: 'var(--coin-silver)',
        10: 'var(--coin-bronze)',
        20: 'var(--coin-gold)'
    };
    
    coinSlot.style.boxShadow = `0 0 30px ${colors[coinValue] || 'var(--coin-silver)'}`;
    coinSlot.style.transform = 'scale(1.1)';
    
    // Add coin animation
    const coinAnimation = document.createElement('div');
    coinAnimation.className = 'coin-animation';
    coinAnimation.innerHTML = `🪙 ₱${coinValue}`;
    coinAnimation.style.position = 'absolute';
    coinAnimation.style.top = '50%';
    coinAnimation.style.left = '50%';
    coinAnimation.style.transform = 'translate(-50%, -50%)';
    coinAnimation.style.color = colors[coinValue] || 'var(--coin-silver)';
    coinAnimation.style.fontSize = '1.5rem';
    coinAnimation.style.fontWeight = 'bold';
    coinAnimation.style.zIndex = '100';
    coinAnimation.style.animation = 'coinDrop 0.5s ease-out forwards';
    
    const machine = document.querySelector('.vendo-machine');
    machine.appendChild(coinAnimation);
    
    setTimeout(() => {
        coinSlot.style.boxShadow = '';
        coinSlot.style.transform = '';
        machine.removeChild(coinAnimation);
    }, 500);
}

function updateMoneyDisplay() {
    document.getElementById('totalMoney').textContent = totalMoney.toFixed(2);
    updateStatistics();
}

function returnChange() {
    if (totalMoney > 0) {
        const change = totalMoney;
        totalMoney = 0;
        updateMoneyDisplay();
        showMessage(`Change returned: ₱${change.toFixed(2)}`);
        
        // Animate change return
        animateChangeReturn(change);
        
        logToDatabase(currentState, 'RETURN', 'q0');
        transition('RETURN');
    } else {
        showError('No money to return');
    }
}

function animateChangeReturn(amount) {
    const changeDisplay = document.querySelector('.money-display');
    changeDisplay.style.boxShadow = '0 0 30px var(--coin-gold)';
    changeDisplay.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        changeDisplay.style.boxShadow = '';
        changeDisplay.style.transform = '';
    }, 800);
}

// ===============================
// DFA TRANSITIONS
// ===============================
function transition(input, coinValue = null) {
    const fromState = currentState;
    
    // Check if transition is valid
    if (!VendoDFA.delta[fromState] || !VendoDFA.delta[fromState][input]) {
        showError(`Invalid transition: δ(${fromState}, ${input})`);
        return false;
    }
    
    // Special validation for SELECT transition
    if (input === 'SELECT' && (!selectedCoffee || totalMoney < coffeePrice)) {
        showError(`Insufficient funds. Need ₱${coffeePrice}, have ₱${totalMoney}`);
        return false;
    }
    
    // Apply transition
    const toState = VendoDFA.delta[fromState][input];
    currentState = toState;
    totalTransitions++;
    
    // Log transition
    logToDatabase(fromState, input, toState, coinValue);
    
    // Update display and animate
    updateDisplay();
    animateTransition(fromState, toState, input);
    
    // Update button states
    updateButtonStates();
    
    // Update statistics
    updateStatistics();
    
    return true;
}

// ===============================
// ANIMATIONS
// ===============================
function animateTransition(fromState, toState, input) {
    // Animate DFA table cell
    highlightTableTransition(fromState, input);
    
    // Animate machine display
    animateMachineDisplay(input);
    
    // Special animations for specific states
    if (toState === 'q2') {
        // Ready to brew
        showMessage(`Selected: ${coffeeTypes[selectedCoffee].name} (₱${coffeePrice})`);
    } else if (toState === 'q3') {
        animateBrewing();
    }
}

function highlightTableTransition(fromState, input) {
    // Remove active class from all table cells
    document.querySelectorAll('.transition-cell').forEach(cell => {
        cell.classList.remove('active');
    });
    
    // Find and highlight the active transition cell
    const activeCell = document.querySelector(
        `.transition-cell[data-from="${fromState}"][data-input="${input}"]`
    );
    
    if (activeCell) {
        activeCell.classList.add('active');
        
        // Remove active class after animation
        setTimeout(() => {
            activeCell.classList.remove('active');
        }, 1000);
    }
}

function animateMachineDisplay(input) {
    const display = document.querySelector('.machine-display');
    const inputColors = {
        INSERT_COIN: '#FFD700',
        SELECT: '#3498DB',
        BREW: '#E74C3C',
        COLLECT: '#F39C12',
        RETURN: '#9B59B6'
    };
    
    display.style.boxShadow = `
        inset 0 0 25px rgba(255, 215, 0, 0.4),
        0 0 50px ${inputColors[input]}
    `;
    
    setTimeout(() => {
        display.style.boxShadow = `
            inset 0 0 25px rgba(255, 215, 0, 0.4),
            0 0 40px rgba(255, 215, 0, 0.3)
        `;
    }, 800);
}

function animateBrewing() {
    const liquid = document.getElementById('coffeeLiquid');
    const steam = document.getElementById('steamEffect');
    const coffeeColor = coffeeTypes[selectedCoffee]?.color || '#2C1810';
    
    // Deduct money
    totalMoney -= coffeePrice;
    updateMoneyDisplay();
    
    // Set coffee color
    liquid.style.background = `linear-gradient(to top, ${coffeeColor}, ${coffeeTypes[selectedCoffee]?.color || '#6F4E37'})`;
    
    // Animate filling
    liquid.style.height = '0%';
    setTimeout(() => {
        liquid.style.height = '100%';
        liquid.style.transition = 'height 2s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 100);
    
    // Create steam particles
    steam.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.className = 'steam-particle';
        particle.style.left = `${i * 20}px`;
        particle.style.animationDelay = `${i * 0.3}s`;
        steam.appendChild(particle);
    }
    
    steam.style.opacity = '1';
    setTimeout(() => {
        steam.style.opacity = '0';
    }, 3000);
    
    // Machine vibration
    const machine = document.querySelector('.vendo-machine');
    machine.style.animation = 'none';
    setTimeout(() => {
        machine.style.animation = 'machinePulse 0.1s 30';
        setTimeout(() => {
            machine.style.animation = '';
        }, 3000);
    }, 100);
}

// ===============================
// USER ACTIONS
// ===============================
function handleCupClick() {
    // Only allow collection when coffee is ready (q3)
    if (currentState === 'q3' && document.getElementById('coffeeLiquid').style.height === '100%') {
        collectCoffee();
    } else if (currentState !== 'q3') {
        showError('Coffee is not ready yet. Please select and wait for brewing.');
    }
}

function collectCoffee() {
    if (transition('COLLECT')) {
        showMessage('Coffee collected. Enjoy! ☕');
        
        // Animate cup collection
        const cup = document.getElementById('coffeeCup');
        const liquid = document.getElementById('coffeeLiquid');
        
        // Animate cup sliding away and disappearing
        cup.style.transition = 'all 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        cup.style.transform = 'translateY(200px) rotate(15deg)';
        cup.style.opacity = '0';
        
        // After cup disappears, reset and bring back clean cup
        setTimeout(() => {
            // Reset cup position and appearance
            cup.style.transition = 'none';
            cup.style.transform = 'translateY(0)';
            cup.style.opacity = '0';
            liquid.style.height = '0%';
            
            // Wait a moment then slide in clean cup
            setTimeout(() => {
                cup.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
                cup.style.opacity = '1';
                coffeesMade++;
                selectedCoffee = null;
                resetCoffeeSelection();
                updateStatistics();
                showMessage('Ready for next order!');
            }, 300);
        }, 1500);
    }
}

function resetMachine() {
    // Return any remaining money
    if (totalMoney > 0) {
        showMessage(`Returning remaining ₱${totalMoney.toFixed(2)}`);
        totalMoney = 0;
        updateMoneyDisplay();
    }
    
    currentState = VendoDFA.q0;
    selectedCoffee = null;
    coffeePrice = 0;
    
    // Reset visual elements
    document.getElementById('coffeeLiquid').style.height = '0%';
    resetCoffeeSelection();
    
    // Update buttons
    updateButtonStates();
    
    // Log reset
    logToDatabase('SYSTEM', 'RESET', currentState);
    
    showMessage('Vendo machine reset');
    updateDisplay();
    updateStatistics();
}

function animateButton(btnId) {
    const btn = document.getElementById(btnId);
    btn.style.transform = 'scale(1.2)';
    btn.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.8)';
    
    setTimeout(() => {
        btn.style.transform = '';
        btn.style.boxShadow = '';
    }, 500);
}

// ===============================
// UI SETUP
// ===============================
function setupCoffeeSelection() {
    const options = document.querySelectorAll('.coffee-option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            if (currentState !== 'q1') return;
            
            // Remove previous selection
            options.forEach(opt => opt.classList.remove('selected'));
            
            // Set new selection
            this.classList.add('selected');
            selectedCoffee = this.dataset.type;
            coffeePrice = parseInt(this.dataset.price);
            
            // Animate selection
            this.style.animation = 'selectedBounce 0.6s ease';
            
            // Check if enough money
            if (totalMoney < coffeePrice) {
                showError(`Insufficient funds. Need ₱${coffeePrice}, have ₱${totalMoney}`);
                return;
            }
            
            showMessage(`Selected ${coffeeTypes[selectedCoffee].name} - ₱${coffeePrice}`);
            
            // Auto-transition to SELECT (q1 -> q2)
            setTimeout(() => {
                if (transition('SELECT')) {
                    // Auto-transition to BREW (q2 -> q3)
                    setTimeout(() => {
                        transition('BREW');
                        showMessage('Click the coffee cup to collect! ☕');
                    }, 500);
                }
            }, 600);
        });
    });
}

function setupDFATable() {
    const cells = document.querySelectorAll('.transition-cell');
    cells.forEach(cell => {
        cell.addEventListener('click', function() {
            const fromState = this.dataset.from;
            const input = this.dataset.input;
            
            if (this.textContent !== '—' && currentState === fromState) {
                // Trigger the transition
                if (input === 'INSERT_COIN') insertCoin(5); // Default 5 peso coin
                else if (input === 'SELECT') transition('SELECT');
                else if (input === 'BREW') transition('BREW');
                else if (input === 'COLLECT') handleCupClick();
                else if (input === 'RETURN') returnChange();
            }
        });
    });
}

function updateDisplay() {
    // Update state display
    document.getElementById('currentState').textContent = VendoDFA.Q[currentState].name;
    document.getElementById('stateMessage').textContent = VendoDFA.descriptions[currentState];
    document.getElementById('currentStateCode').textContent = currentState;
}

function updateButtonStates() {
    // Enable/disable buttons based on current state and money
    const changeBtn = document.getElementById('changeBtn');
    
    changeBtn.disabled = (totalMoney === 0);
}

function resetCoffeeSelection() {
    document.querySelectorAll('.coffee-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.style.animation = '';
    });
}

function updateStatistics() {
    document.getElementById('totalTransitions').textContent = totalTransitions;
    document.getElementById('coffeesMade').textContent = coffeesMade;
    document.getElementById('totalMoneyInserted').textContent = `₱${totalMoneyInserted}`;
    document.getElementById('currentStateCode').textContent = currentState;
}

// ===============================
// DATABASE LOGGING
// ===============================
function logToDatabase(fromState, input, toState, coinValue = null) {
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        fromState: fromState,
        input: input,
        toState: toState,
        fromStateName: VendoDFA.Q[fromState]?.name || fromState,
        toStateName: VendoDFA.Q[toState]?.name || toState,
        selectedCoffee: selectedCoffee,
        coffeePrice: coffeePrice,
        coinValue: coinValue,
        totalMoney: totalMoney,
        isAcceptState: VendoDFA.F.includes(toState)
    };
    
    // Add to history
    transitionHistory.unshift(logEntry);
    
    // Add to database
    database.push(logEntry);
    
    // Keep database manageable
    if (database.length > 100) {
        database = database.slice(-100);
    }
    
    // Save to localStorage
    saveToStorage();
    
    // Update history display
    updateHistoryLog();
}

function saveToStorage() {
    try {
        localStorage.setItem('vendoDFA_db', JSON.stringify(database));
        localStorage.setItem('vendoDFA_log', JSON.stringify(transitionHistory));
    } catch (e) {
        console.error('Failed to save to storage:', e);
    }
}

function loadFromStorage() {
    try {
        const storedDB = localStorage.getItem('vendoDFA_db');
        const storedLog = localStorage.getItem('vendoDFA_log');
        
        if (storedDB) database = JSON.parse(storedDB);
        if (storedLog) transitionHistory = JSON.parse(storedLog);
        
        // Keep only last 20 entries in memory
        if (transitionHistory.length > 20) {
            transitionHistory = transitionHistory.slice(0, 20);
        }
    } catch (e) {
        console.error('Failed to load from storage:', e);
    }
}

function updateHistoryLog() {
    const logContainer = document.getElementById('historyLog');
    logContainer.innerHTML = '';
    
    // Show latest 10 entries
    const recentLogs = transitionHistory.slice(0, 10);
    
    if (recentLogs.length === 0) {
        logContainer.innerHTML = `
            <div class="log-entry">
                <div class="log-transition">
                    <i class="fas fa-info-circle" style="color: var(--coin-gold);"></i>
                    <span>No transactions logged yet</span>
                </div>
            </div>
        `;
        return;
    }
    
    recentLogs.forEach(log => {
        const coffeeInfo = log.selectedCoffee ? 
            `<span style="color: ${coffeeTypes[log.selectedCoffee]?.color || '#6F4E37'}">
                [${coffeeTypes[log.selectedCoffee]?.name} - ₱${log.coffeePrice}]
            </span>` : '';
        
        const coinInfo = log.coinValue ? 
            `<span style="color: var(--coin-gold);">[₱${log.coinValue}]</span>` : '';
        
        const acceptMark = log.isAcceptState ? 
            '<i class="fas fa-check-circle" style="color: var(--vendo-green);"></i>' : '';
        
        const inputIcon = getInputIcon(log.input);
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <div class="log-transition">
                ${inputIcon}
                <span>δ(${log.fromState}, ${log.input}) → ${log.toState}</span>
                ${acceptMark}
                ${coinInfo}
                ${coffeeInfo}
            </div>
            <div class="log-time">
                <i class="far fa-clock"></i> ${log.time}
            </div>
        `;
        logContainer.appendChild(logEntry);
    });
}

function getInputIcon(input) {
    const icons = {
        INSERT_COIN: '<i class="fas fa-coins" style="color: var(--coin-gold);"></i>',
        SELECT: '<i class="fas fa-check-circle" style="color: var(--coin-silver);"></i>',
        BREW: '<i class="fas fa-fire" style="color: var(--vendo-red);"></i>',
        COLLECT: '<i class="fas fa-mug-hot" style="color: #F39C12;"></i>',
        RETURN: '<i class="fas fa-undo" style="color: var(--coin-bronze);"></i>',
        RESET: '<i class="fas fa-redo" style="color: var(--coin-silver);"></i>',
        INIT: '<i class="fas fa-power-off" style="color: var(--vendo-green);"></i>'
    };
    return icons[input] || '<i class="fas fa-arrow-right"></i>';
}

// ===============================
// DATABASE FUNCTIONS
// ===============================
function exportToTextFile() {
    let textContent = `VENDO COFFEE MACHINE DFA TRANSACTION LOG\n`;
    textContent += `==========================================\n\n`;
    textContent += `Generated: ${new Date().toLocaleString()}\n`;
    textContent += `Total Transactions: ${database.length}\n`;
    textContent += `Coffees Made: ${coffeesMade}\n`;
    textContent += `Total Money Inserted: ₱${totalMoneyInserted}\n`;
    textContent += `Current Money: ₱${totalMoney}\n`;
    textContent += `Current State: ${currentState} (${VendoDFA.Q[currentState].name})\n\n`;
    
    textContent += `DFA SPECIFICATION:\n`;
    textContent += `------------------\n`;
    textContent += `States Q: {${Object.entries(VendoDFA.Q).map(([k,v]) => `${k}=${v.name}`).join(', ')}}\n`;
    textContent += `Alphabet Σ: {${Object.values(VendoDFA.Sigma).join(', ')}}\n`;
    textContent += `Start State: ${VendoDFA.q0}\n`;
    textContent += `Accept States F: {${VendoDFA.F.join(', ')}}\n\n`;
    
    textContent += `TRANSACTION HISTORY:\n`;
    textContent += `-------------------\n\n`;
    
    database.forEach((entry, index) => {
        const coffee = entry.selectedCoffee ? coffeeTypes[entry.selectedCoffee]?.name : 'None';
        const coin = entry.coinValue ? `₱${entry.coinValue}` : 'None';
        textContent += `${index + 1}. ${entry.date} ${entry.time}\n`;
        textContent += `   From: ${entry.fromState} (${entry.fromStateName})\n`;
        textContent += `   Input: ${entry.input} ${coin !== 'None' ? coin : ''}\n`;
        textContent += `   To: ${entry.toState} (${entry.toStateName})\n`;
        textContent += `   Coffee: ${coffee} ${entry.coffeePrice ? `(₱${entry.coffeePrice})` : ''}\n`;
        textContent += `   Money: ₱${entry.totalMoney}\n`;
        textContent += `   Accept State: ${entry.isAcceptState ? 'Yes ✓' : 'No'}\n`;
        textContent += `   ----------------------------\n`;
    });
    
    // Create and download
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendo-dfa-log-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Transaction log exported as text file');
}

function exportToJSON() {
    const exportData = {
        metadata: {
            exportDate: new Date().toISOString(),
            project: "Coffee Vendo DFA Simulator",
            description: "Automata Theory Implementation with Coin System"
        },
        dfa: VendoDFA,
        currentState: {
            code: currentState,
            name: VendoDFA.Q[currentState].name
        },
        money: {
            totalInserted: totalMoneyInserted,
            currentBalance: totalMoney
        },
        statistics: {
            totalTransactions: database.length,
            coffeesMade: coffeesMade,
            databaseSize: database.length
        },
        recentTransactions: transitionHistory.slice(0, 10)
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendo-dfa-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Database exported as JSON');
}

function viewDatabase() {
    const stats = `
        📊 VENDO DATABASE STATISTICS
        ============================
        Total Transactions: ${database.length}
        Coffees Made: ${coffeesMade}
        Total Money Inserted: ₱${totalMoneyInserted}
        Current Money: ₱${totalMoney}
        Current State: ${currentState} (${VendoDFA.Q[currentState].name})
        
        💰 Recent Coin Insertions: 
        ${database
            .filter(e => e.input === 'INSERT_COIN')
            .slice(-5)
            .map(e => `  ₱${e.coinValue} at ${e.time}`)
            .join('\n')}
        
        ☕ Recent Coffees: 
        ${database
            .filter(e => e.isAcceptState)
            .slice(-3)
            .map(e => `  ${coffeeTypes[e.selectedCoffee]?.name} - ₱${e.coffeePrice}`)
            .join('\n')}
        
        💾 Storage: ${(JSON.stringify(database).length / 1024).toFixed(2)} KB
    `;
    
    alert(stats);
}

function clearDatabase() {
    if (confirm('Clear all transaction history? This will delete all logged data.')) {
        database = [];
        transitionHistory = [];
        totalTransitions = 0;
        coffeesMade = 0;
        totalMoneyInserted = 0;
        localStorage.removeItem('vendoDFA_db');
        localStorage.removeItem('vendoDFA_log');
        updateHistoryLog();
        updateStatistics();
        showMessage('Transaction history cleared successfully');
    }
}

function runAutoDemo() {
    if (confirm('Run automated demonstration of the Vendo DFA?')) {
        resetMachine();
        
        const steps = [
            { action: () => insertCoin(5), delay: 1000 },
            { action: () => insertCoin(10), delay: 1500 },
            { action: () => insertCoin(10), delay: 2000 },
            { action: () => {
                const latteOption = document.querySelector('.coffee-option[data-type="latte"]');
                latteOption.click();
            }, delay: 2500 },
            { action: () => handleCupClick(), delay: 6000 }
        ];
        
        let stepIndex = 0;
        function executeStep() {
            if (stepIndex < steps.length) {
                setTimeout(() => {
                    steps[stepIndex].action();
                    stepIndex++;
                    executeStep();
                }, steps[stepIndex].delay);
            }
        }
        
        executeStep();
    }
}

function showDFADetails() {
    const details = `
        🎯 VENDO DFA FORMAL DEFINITION
        ==============================
        
        M = (Q, Σ, δ, q₀, F)
        
        Q = {${Object.entries(VendoDFA.Q).map(([k,v]) => `${k} (${v.name})`).join(', ')}}
        
        Σ = {${Object.values(VendoDFA.Sigma).join(', ')}}
        
        q₀ = ${VendoDFA.q0} (${VendoDFA.Q[VendoDFA.q0].name})
        
        F = {${VendoDFA.F.map(f => `${f} (${VendoDFA.Q[f].name})`).join(', ')}}
        
        δ: Q × Σ → Q
        ${Object.entries(VendoDFA.delta).map(([from, trans]) => 
            Object.entries(trans).map(([input, to]) => 
                `δ(${from}, ${input}) = ${to}`
            ).join('\n')
        ).join('\n')}
        
        💰 COFFEE PRICES:
        Espresso: ₱20
        Café Latte: ₱25
        Cappuccino: ₱30
        Mocha: ₱35
        
        💡 This DFA models a coin-operated vending machine:
        q₀ → q₁: Insert coins to begin
        q₁ → q₁: Insert more coins
        q₁ → q₂: Select coffee (requires sufficient funds)
        q₂ → q₃: Brew coffee
        q₃ → q₀: Collect coffee
        Any state → q₀: Return coins
    `;
    
    alert(details);
}

// ===============================
// HELPER FUNCTIONS
// ===============================
function showMessage(message) {
    document.getElementById('stateMessage').textContent = message;
}

function showError(error) {
    const messageEl = document.getElementById('stateMessage');
    const original = messageEl.textContent;
    const originalColor = messageEl.style.color;
    
    messageEl.textContent = `⚠️ ${error}`;
    messageEl.style.color = '#E74C3C';
    
    setTimeout(() => {
        messageEl.textContent = original;
        messageEl.style.color = originalColor;
    }, 3000);
}

// ===============================
// INITIALIZE
// ===============================
window.onload = init;