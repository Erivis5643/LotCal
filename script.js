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
                pipValue = parseFloat(document.getElementById('pip-value').value) || 0;
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
                let totalProfit = 0;
                const tpCount = parseInt(tpCountInput.value);

                for (let i = 1; i <= tpCount; i++) {
                    const tpInput = document.getElementById(`tp${i}-${mode}`);
                    if (!tpInput || !tpInput.value) continue;

                    const tpValue = parseFloat(tpInput.value);
                    let tpDistance;

                    if (mode === 'price') {
                        const entryPrice = parseFloat(document.getElementById('entry-price').value);
                        tpDistance = Math.abs(tpValue - entryPrice);
                    } else {
                        tpDistance = tpValue;
                    }

                    const tpProfit = tpDistance * pipValue * lotSize;
                    totalProfit += tpProfit;

                    if (i === 1) {
                        const tp1Percentage = (tpProfit / accountBalance) * 100;
                        document.getElementById('tp1-profit').textContent = `$${tpProfit.toFixed(2)}`;
                        document.getElementById('tp1-percentage').textContent = `${tp1Percentage.toFixed(2)}%`;
                    }
                }

                document.getElementById('total-profit').textContent = `$${totalProfit.toFixed(2)}`;
            } else {
                document.getElementById('tp1-profit').textContent = '$0.00';
                document.getElementById('tp1-percentage').textContent = '0%';
                document.getElementById('total-profit').textContent = '$0.00';
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