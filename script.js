document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('calculator-form');
    const modeToggles = document.querySelectorAll('.toggle-btn');
    const priceModeInputs = document.querySelectorAll('.price-mode');
    const pipModeInputs = document.querySelectorAll('.pip-mode');
    const useTpButton = document.getElementById('use-tp');
    const tpInputsContainer = document.getElementById('tp-inputs');
    const addTpButton = document.getElementById('add-tp');
    const instrumentSelect = document.getElementById('instrument-select');
    const manualPipGroup = document.getElementById('manual-pip-group');
    const pipValueInput = document.getElementById('pip-value');
    const themeToggle = document.querySelector('.theme-toggle');

    // Theme handling
    function setTheme(isDark) {
        document.body.classList.toggle('dark-theme', isDark);
        document.body.classList.toggle('light-theme', !isDark);
        themeToggle.textContent = isDark ? 'Light' : 'Dark';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Initialize theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setTheme(isDark);

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-theme');
        setTheme(isDark);
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches);
        }
    });

    // State
    let tpCount = 0;
    let isTpEnabled = false;
    let distributionMode = 'even';
    let tpValues = new Map(); // Store TP values when switching modes

    // Instrument pip values
    const instrumentPipValues = {
        'sp500': { value: 0.25, pipValue: 12.50 },
        'nasdaq': { value: 0.25, pipValue: 5.00 },
        'xauusd': { value: 0.01, pipValue: 1.00 },
        'btc': { value: 1.00, pipValue: 1.00 },
        'eth': { value: 0.01, pipValue: 0.01 },
        'eurusd': { value: 0.0001, pipValue: 10.00 }
    };

    // Instrument selection handling
    instrumentSelect.addEventListener('change', () => {
        const selectedInstrument = instrumentSelect.value;
        if (selectedInstrument === 'manual') {
            manualPipGroup.classList.remove('hidden');
            pipValueInput.value = '';
        } else {
            manualPipGroup.classList.add('hidden');
            pipValueInput.value = instrumentPipValues[selectedInstrument].pipValue;
        }
        updateCalculations();
    });

    // Mode Toggle Handling
    modeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const oldMode = document.querySelector('.toggle-btn.active').dataset.mode;
            const newMode = toggle.dataset.mode;
            
            // Store current TP values
            if (isTpEnabled) {
                tpValues.clear();
                document.querySelectorAll('.tp-input-container input').forEach(input => {
                    const index = parseInt(input.id.match(/\d+/)[0]);
                    tpValues.set(index, input.value);
                });
            }
            
            modeToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            
            priceModeInputs.forEach(input => {
                input.classList.toggle('hidden', newMode === 'pip');
            });
            pipModeInputs.forEach(input => {
                input.classList.toggle('hidden', newMode === 'price');
            });
            
            // Regenerate TP inputs if they exist
            if (isTpEnabled) {
                regenerateTPInputs();
            }
            
            updateCalculations();
        });
    });

    function updateDistribution() {
        if (!isTpEnabled || tpCount === 0) return;

        const showDistribution = tpCount > 2;
        document.querySelectorAll('.tp-distribution-btn').forEach(btn => {
            btn.style.display = showDistribution ? 'block' : 'none';
        });
        document.querySelectorAll('.tp-percentage-value').forEach(el => {
            el.style.display = showDistribution ? 'block' : 'none';
        });

        if (!showDistribution) return;

        const percentages = [];
        if (distributionMode === 'even') {
            const evenPercentage = 100 / tpCount;
            for (let i = 0; i < tpCount; i++) {
                percentages.push(evenPercentage);
            }
        } else {
            let remainingPercentage = 100;
            for (let i = 0; i < tpCount; i++) {
                if (i === tpCount - 1) {
                    percentages.push(remainingPercentage);
                } else {
                    const percentage = i === 0 ? 50 : remainingPercentage / 2;
                    percentages.push(percentage);
                    remainingPercentage -= percentage;
                }
            }
        }

        document.querySelectorAll('.tp-percentage-value').forEach((element, index) => {
            element.textContent = `${percentages[index].toFixed(1)}%`;
        });

        updateCalculations();
    }

    function removeTP(index) {
        const inputGroup = document.querySelector(`#tp${index}-${document.querySelector('.toggle-btn.active').dataset.mode}`).closest('.tp-input-group');
        inputGroup.remove();
        tpCount--;
        
        // Renumber remaining TPs
        const remainingInputs = document.querySelectorAll('.tp-input-group');
        remainingInputs.forEach((group, i) => {
            const newIndex = i + 1;
            const input = group.querySelector('input');
            const label = group.querySelector('label');
            const mode = input.id.split('-')[1];
            
            input.id = `tp${newIndex}-${mode}`;
            input.name = `tp${newIndex}-${mode}`;
            label.htmlFor = `tp${newIndex}-${mode}`;
            label.textContent = `TP${newIndex} ${mode === 'price' ? 'Price' : 'Distance'}`;
            
            // Update remove button visibility
            const removeBtn = group.querySelector('.remove-tp-btn');
            if (removeBtn) {
                removeBtn.style.display = tpCount > 1 ? 'flex' : 'none';
            }
        });
        
        updateDistribution();
        updateCalculations();
    }

    // Take Profit Handling
    useTpButton.addEventListener('click', () => {
        isTpEnabled = !isTpEnabled;
        useTpButton.textContent = isTpEnabled ? 'Hide TP\'s' : 'Add TP\'s';
        useTpButton.classList.toggle('active', isTpEnabled);
        tpInputsContainer.classList.toggle('hidden', !isTpEnabled);
        addTpButton.classList.toggle('hidden', !isTpEnabled);
        document.getElementById('tp-results').classList.toggle('hidden', !isTpEnabled);
        
        if (isTpEnabled && tpCount === 0) {
            addNewTP();
        }
        
        updateCalculations();
    });

    addTpButton.addEventListener('click', addNewTP);

    function addNewTP() {
        tpCount++;
        const mode = document.querySelector('.toggle-btn.active').dataset.mode;
        
        const inputGroup = document.createElement('div');
        inputGroup.className = 'tp-input-group';
        
        // Create percentage container
        const percentageContainer = document.createElement('div');
        percentageContainer.className = 'tp-percentage-container';
        
        // Add distribution button for first TP
        if (tpCount === 1) {
            const distributionBtn = document.createElement('button');
            distributionBtn.type = 'button';
            distributionBtn.className = 'tp-distribution-btn';
            distributionBtn.textContent = 'Even';
            distributionBtn.style.display = 'none';
            distributionBtn.addEventListener('click', () => {
                distributionMode = distributionMode === 'even' ? 'decline' : 'even';
                distributionBtn.textContent = distributionMode === 'even' ? 'Even' : 'Decline';
                updateDistribution();
            });
            percentageContainer.appendChild(distributionBtn);
        }
        
        const percentageValue = document.createElement('div');
        percentageValue.className = 'tp-percentage-value';
        percentageValue.textContent = '0%';
        percentageValue.style.display = 'none';
        percentageContainer.appendChild(percentageValue);
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'tp-input-container';
        
        const label = document.createElement('label');
        label.htmlFor = `tp${tpCount}-${mode}`;
        label.textContent = `TP${tpCount} ${mode === 'price' ? 'Price' : 'Distance'}`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `tp${tpCount}-${mode}`;
        input.name = `tp${tpCount}-${mode}`;
        input.placeholder = `Enter TP${tpCount} ${mode === 'price' ? 'price' : 'distance'}`;
        input.step = '0.00001';
        input.required = true;
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-tp-btn';
        removeBtn.innerHTML = '×';
        removeBtn.style.display = tpCount > 1 ? 'flex' : 'none';
        removeBtn.addEventListener('click', () => removeTP(tpCount));
        
        inputContainer.appendChild(label);
        inputContainer.appendChild(input);
        inputContainer.appendChild(removeBtn);
        
        inputGroup.appendChild(percentageContainer);
        inputGroup.appendChild(inputContainer);
        tpInputsContainer.appendChild(inputGroup);
        
        // Restore value if switching modes
        if (tpValues.has(tpCount)) {
            input.value = tpValues.get(tpCount);
        }
        
        input.addEventListener('input', updateCalculations);
        updateDistribution();
        
        // Update remove button visibility for all TPs
        document.querySelectorAll('.remove-tp-btn').forEach(btn => {
            btn.style.display = tpCount > 1 ? 'flex' : 'none';
        });
    }

    function regenerateTPInputs() {
        const oldCount = tpCount;
        tpInputsContainer.innerHTML = '';
        tpCount = 0;
        for (let i = 1; i <= oldCount; i++) {
            addNewTP();
        }
    }

    // Form Input Handling
    form.addEventListener('input', updateCalculations);

    function updateCalculations() {
        try {
            const accountBalance = parseFloat(document.getElementById('account-balance').value) || 0;
            const riskPercentage = parseFloat(document.getElementById('risk-percentage').value) || 0;
            
            if (!accountBalance || !riskPercentage) {
                return;
            }

            const mode = document.querySelector('.toggle-btn.active').dataset.mode;
            let stopLossDistance;
            let pipValue = 1; // Default for price mode

            if (mode === 'price') {
                const entryPrice = parseFloat(document.getElementById('entry-price').value) || 0;
                const stopLossPrice = parseFloat(document.getElementById('stop-loss-price').value) || 0;
                stopLossDistance = Math.abs(entryPrice - stopLossPrice);
            } else {
                stopLossDistance = parseFloat(document.getElementById('stop-loss-distance').value) || 0;
                const selectedInstrument = instrumentSelect.value;
                if (selectedInstrument === 'manual') {
                    pipValue = parseFloat(pipValueInput.value) || 0;
                } else {
                    pipValue = instrumentPipValues[selectedInstrument].pipValue;
                }
            }

            if (!stopLossDistance || (mode === 'pip' && !pipValue)) {
                return;
            }

            // Calculate lot size
            const dollarRisk = accountBalance * (riskPercentage / 100);
            const totalLotSize = dollarRisk / (stopLossDistance * pipValue);

            // Update lot size display
            document.getElementById('lot-size').textContent = totalLotSize.toFixed(2);
            document.getElementById('risk-amount').textContent = `$${dollarRisk.toFixed(2)} at risk`;

            // Calculate take profit values if enabled
            if (isTpEnabled) {
                const tpDetails = document.getElementById('tp-details');
                tpDetails.innerHTML = '';
                let totalProfit = 0;
                let allTPsSpecified = true;

                // Calculate percentages based on distribution mode
                const percentages = [];
                if (distributionMode === 'even') {
                    const evenPercentage = 100 / tpCount;
                    for (let i = 0; i < tpCount; i++) {
                        percentages.push(evenPercentage / 100);
                    }
                } else {
                    let remainingPercentage = 100;
                    for (let i = 0; i < tpCount; i++) {
                        if (i === tpCount - 1) {
                            percentages.push(remainingPercentage / 100);
                        } else {
                            const percentage = i === 0 ? 50 : remainingPercentage / 2;
                            percentages.push(percentage / 100);
                            remainingPercentage -= percentage;
                        }
                    }
                }

                for (let i = 1; i <= tpCount; i++) {
                    const tpInput = document.getElementById(`tp${i}-${mode}`);
                    if (!tpInput || !tpInput.value) {
                        allTPsSpecified = false;
                        continue;
                    }

                    const tpValue = parseFloat(tpInput.value);
                    let tpDistance;

                    if (mode === 'price') {
                        const entryPrice = parseFloat(document.getElementById('entry-price').value);
                        tpDistance = Math.abs(tpValue - entryPrice);
                    } else {
                        tpDistance = tpValue;
                    }

                    const lotSize = totalLotSize * percentages[i - 1];
                    const tpProfit = tpDistance * pipValue * lotSize;
                    const tpPercentage = (tpProfit / accountBalance) * 100;
                    totalProfit += tpProfit;

                    // Create TP result element
                    const tpResult = document.createElement('div');
                    tpResult.className = 'tp-result';
                    tpResult.innerHTML = `
                        <div class="tp-result-info">
                            <div class="tp-header">TP${i}</div>
                            <div class="tp-profit">$${tpProfit.toFixed(2)}</div>
                        </div>
                        <div class="tp-lot-size">Lot: ${lotSize.toFixed(2)}</div>
                    `;
                    tpDetails.appendChild(tpResult);
                }

                // Show/hide TP results based on whether all TPs are specified
                document.getElementById('tp-results').classList.toggle('hidden', !allTPsSpecified);

                // Show total TP information if more than one TP is specified
                const totalTPInfo = document.getElementById('total-tp-info');
                if (tpCount > 1 && allTPsSpecified) {
                    const totalTPPercentage = (totalProfit / accountBalance) * 100;
                    document.getElementById('total-tp-profit').textContent = `$${totalProfit.toFixed(2)}`;
                    document.getElementById('total-tp-percentage').textContent = `${totalTPPercentage.toFixed(2)}%`;
                    totalTPInfo.classList.remove('hidden');
                } else {
                    totalTPInfo.classList.add('hidden');
                }

                // Calculate and display RRR if all TPs are specified
                if (allTPsSpecified && dollarRisk > 0) {
                    const rrr = totalProfit / dollarRisk;
                    const rrrElement = document.getElementById('rrr-value');
                    rrrElement.textContent = rrr.toFixed(2);
                    rrrElement.classList.toggle('loss', rrr < 1);
                } else {
                    const rrrElement = document.getElementById('rrr-value');
                    rrrElement.textContent = '0.00';
                    rrrElement.classList.remove('loss');
                }

                // Update RRR header style
                const rrrHeader = document.querySelector('.result-item h3');
                if (rrrHeader && rrrHeader.textContent === 'Risk-to-Reward Ratio') {
                    rrrHeader.className = 'rrr-header';
                }
            } else {
                document.getElementById('tp-results').classList.add('hidden');
            }
        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    // Input validation
    function validateInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);

        if (isNaN(value)) {
            input.setCustomValidity('Please enter a valid number');
        } else if (min !== undefined && value < min) {
            input.setCustomValidity(`Value must be at least ${min}`);
        } else if (max !== undefined && value > max) {
            input.setCustomValidity(`Value must be at most ${max}`);
        } else {
            input.setCustomValidity('');
        }
    }

    // Add validation to all number inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', () => validateInput(input));
    });
}); 
