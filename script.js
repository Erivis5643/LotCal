document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('calculator-form');
    const modeToggles = document.querySelectorAll('.toggle-btn');
    const priceModeInputs = document.querySelectorAll('.price-mode');
    const pipModeInputs = document.querySelectorAll('.pip-mode');
    const useTpCheckbox = document.getElementById('use-tp');
    const tpCountGroup = document.querySelector('.tp-count-group');
    const tpCountInput = document.getElementById('tp-count');
    const tpInputsContainer = document.getElementById('tp-inputs');
    const instrumentSelect = document.getElementById('instrument-select');
    const manualPipGroup = document.getElementById('manual-pip-group');
    const pipValueInput = document.getElementById('pip-value');

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
            modeToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            
            const mode = toggle.dataset.mode;
            priceModeInputs.forEach(input => {
                input.classList.toggle('hidden', mode === 'pip');
            });
            pipModeInputs.forEach(input => {
                input.classList.toggle('hidden', mode === 'price');
            });
            
            // Clear and regenerate TP inputs if they exist
            if (useTpCheckbox.checked) {
                generateTPInputs(tpCountInput.value);
            }
            
            updateCalculations();
        });
    });

    // Take Profit Handling
    useTpCheckbox.addEventListener('change', () => {
        tpCountGroup.classList.toggle('hidden', !useTpCheckbox.checked);
        tpInputsContainer.classList.toggle('hidden', !useTpCheckbox.checked);
        document.getElementById('tp-results').classList.toggle('hidden', !useTpCheckbox.checked);
        if (useTpCheckbox.checked) {
            generateTPInputs(tpCountInput.value);
        }
        updateCalculations();
    });

    tpCountInput.addEventListener('change', () => {
        const count = Math.min(Math.max(1, parseInt(tpCountInput.value) || 1), 6);
        tpCountInput.value = count;
        generateTPInputs(count);
        updateCalculations();
    });

    // Form Input Handling
    form.addEventListener('input', updateCalculations);

    function generateTPInputs(count) {
        tpInputsContainer.innerHTML = '';
        const mode = document.querySelector('.toggle-btn.active').dataset.mode;
        
        for (let i = 1; i <= count; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            
            const label = document.createElement('label');
            label.htmlFor = `tp${i}-${mode}`;
            label.textContent = `TP${i} ${mode === 'price' ? 'Price' : 'Distance'}`;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `tp${i}-${mode}`;
            input.name = `tp${i}-${mode}`;
            input.placeholder = `Enter TP${i} ${mode === 'price' ? 'price' : 'distance'}`;
            input.step = '0.00001';
            input.required = true;
            
            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            tpInputsContainer.appendChild(inputGroup);
        }
    }

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
            const lotSize = dollarRisk / (stopLossDistance * pipValue);

            // Update lot size display
            document.getElementById('lot-size').textContent = lotSize.toFixed(2);
            document.getElementById('risk-amount').textContent = `$${dollarRisk.toFixed(2)} at risk`;

            // Calculate take profit values if enabled
            if (useTpCheckbox.checked) {
                const tpDetails = document.getElementById('tp-details');
                tpDetails.innerHTML = '';
                let totalProfit = 0;
                const tpCount = parseInt(tpCountInput.value);
                let allTPsSpecified = true;

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

                    const tpProfit = tpDistance * pipValue * lotSize;
                    const tpPercentage = (tpProfit / accountBalance) * 100;
                    totalProfit += tpProfit;

                    // Create TP result element
                    const tpResult = document.createElement('div');
                    tpResult.className = 'tp-result';
                    tpResult.innerHTML = `
                        <div class="tp-header">TP${i}</div>
                        <div class="tp-profit">$${tpProfit.toFixed(2)}</div>
                        <div class="tp-percentage">${tpPercentage.toFixed(2)}%</div>
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
