const ALL_DATA = {};
const selected = {}; // id => { name, grams, price100g }
let cardCounter = 0;


const SECTIONS = {
    "eau_g_100g": "Hydratation & Énergie",
    "calcium_mg_100g": "Minéraux",
    "vitamine_a_µg_100g": "Vitamines",
};

const UP_UNIT = {
    "mg" : "g",
    "µg" : "mg"
}

// Pre-load all data
fetch('/api/aliments').then(r => r.json()).then(data => {
    Object.assign(ALL_DATA, data);
    renderCompare();
});

/* ── Navigation entre les vues ── */
document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.view-tab').forEach(t => {
            const active = t === tab;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active);
        });
        document.getElementById('view-meal').hidden = tab.dataset.view !== 'meal';
        document.getElementById('view-compare').hidden = tab.dataset.view !== 'compare';
    });
});

/* ── Vue meal prep ── */
function addIngredient() {
    const sel = document.getElementById('aliment-select');
    const name = sel.value;
    if (!name) return;
    // Prevent duplicate
    const alreadyExists = Object.values(selected).some(s => s.name === name);
    if (alreadyExists) return;
    const id = ++cardCounter;
    selected[id] = {
        name,
        grams: 100,
        price100g: 0
    };
    renderCard(id, name);
    updateNutrition();
    sel.value = '';
}

function renderCard(id, name) {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'none';

    const list = document.getElementById('ingredients-list');
    const card = document.createElement('div');
    card.className = 'ingredient-card';
    card.dataset.id = id;

    card.innerHTML = `
        <div class="card-top">
          <span class="ingredient-name">${name}</span>
          <button class="btn-remove" data-id="${id}" aria-label="Retirer ${name}">&times;</button>
        </div>

        <div class="slider-row">
          <input type="range" min="1" max="500" value="100" step="1" data-id="${id}" style="--pct: 20%"
            aria-label="Quantité de ${name} en grammes">
          <div class="qty-display" data-qty="${id}">100 g</div>
        </div>

        <div class="price-row">
          <label for="price-${id}">€/100g</label>
          <input type="number" id="price-${id}" min="0" step="0.01" value="0" data-price="${id}">
        </div>
      `;

    // Attach events directly on the elements (no inline handlers)
    card.querySelector('.btn-remove').addEventListener('click', () => removeIngredient(id));

    const slider = card.querySelector('input[type=range]');
    slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        selected[id].grams = val;
        card.querySelector(`[data-qty="${id}"]`).textContent = val + ' g';
        const pct = ((val - 1) / 499 * 100).toFixed(1) + '%';
        slider.style.setProperty('--pct', pct);
        updateNutrition();
    });

    const priceInput = card.querySelector(`[data-price="${id}"]`);
    priceInput.addEventListener('input', () => {
        selected[id].price100g = parseFloat(priceInput.value) || 0;
        updateNutrition();
    });

    list.appendChild(card);
}

function removeIngredient(id) {
    delete selected[id];
    const card = document.querySelector(`.ingredient-card[data-id="${id}"]`);
    if (card) card.remove();
    if (Object.keys(selected).length === 0) {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = '';
    }
    updateNutrition();
}

function updateNutrition() {
    const names = Object.keys(selected);
    if (names.length === 0) {
        document.getElementById('no-data-msg').style.display = 'flex';
        document.getElementById('nutrition-content').style.display = 'none';
        return;
    }
    document.getElementById('no-data-msg').style.display = 'none';
    document.getElementById('nutrition-content').style.display = 'block';

    const totals = {};
    MACROS.forEach(([key]) => totals[key] = 0);

    let totalWeight = 0;
    let totalPrice = 0;
    names.forEach(name => {
        const g = selected[name];
        totalWeight += g.grams;
        totalPrice += (g.grams / 100) * g.price100g;
        const data = ALL_DATA[g.name];
        if (!data) return;
        MACROS.forEach(([key]) => {
            totals[key] += (parseFloat(data[key]) || 0) * g.grams / 100;
        });
    });

    document.getElementById('total-weight-val').textContent = totalWeight;
    document.getElementById('total-price-val').textContent = totalPrice.toFixed(2);

    // Summary cards
    document.getElementById('card-kcal').textContent = Math.round(totals['energie_kcal_100g']);
    document.getElementById('card-prot').textContent = (totals['proteines_g_100g']).toFixed(1);
    document.getElementById('card-lip').textContent = (totals['lipides_g_100g']).toFixed(1);
    document.getElementById('card-suc').textContent = (totals['sucres_g_100g']).toFixed(1);

    // Table
    const tbody = document.getElementById('macro-tbody');
    tbody.innerHTML = '';

    let lastSection = null;
    MACROS.forEach(([key, label, unit], index) => {
        const section = SECTIONS[key];
        if (section && section !== lastSection) {
            lastSection = section;
            const tr = document.createElement('tr');
            tr.className = 'section-row';
            tr.innerHTML = `<td colspan="3">${section}</td>`;
            tbody.appendChild(tr);
        }
        const val = totals[key];
        const isKcal = key === 'energie_kcal_100g';
        const display = val.toFixed(1) + ' ' + unit + ' / ' + RECOS[index][1] + ' ' + unit;
        const isZero = val === 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${label}</td>
      <td><span class="badge-unit ${isKcal ? 'kcal' : ''}">${isKcal ? 'kcal' : unit}</span></td>
      <td class="${isZero ? 'zero' : ''}">${isZero ? '0 ' + unit : display}</td>
    `;
        tbody.appendChild(tr);
    });
}

/* ── Vue comparaison ── */
const compareSelA = document.getElementById('compare-a');
const compareSelB = document.getElementById('compare-b');

compareSelA.addEventListener('change', renderCompare);
compareSelB.addEventListener('change', renderCompare);

function compareClass(a, b) {
    if (a === b) return 'cmp-equal';
    return a > b ? 'cmp-more' : 'cmp-less';
}

function renderCompare() {
    const nameA = compareSelA.value;
    const nameB = compareSelB.value;
    const dataA = ALL_DATA[nameA];
    const dataB = ALL_DATA[nameB];

    const emptyMsg = document.getElementById('compare-empty');
    const tableWrap = document.getElementById('compare-table');

    if (!dataA || !dataB) {
        emptyMsg.hidden = false;
        tableWrap.hidden = true;
        return;
    }
    emptyMsg.hidden = true;
    tableWrap.hidden = false;

    document.getElementById('compare-head-a').textContent = nameA;
    document.getElementById('compare-head-b').textContent = nameB;

    const tbody = document.getElementById('compare-tbody');
    tbody.innerHTML = '';

    let lastSection = null;
    MACROS.forEach(([key, label, unit]) => {
        const section = SECTIONS[key];
        if (section && section !== lastSection) {
            lastSection = section;
            const tr = document.createElement('tr');
            tr.className = 'section-row';
            tr.innerHTML = `<td colspan="4">${section}</td>`;
            tbody.appendChild(tr);
        }
        const valA = parseFloat(dataA[key]) || 0;
        const valB = parseFloat(dataB[key]) || 0;
        const isKcal = key === 'energie_kcal_100g';
        const shownUnit = isKcal ? 'kcal' : unit;
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${label}</td>
      <td><span class="badge-unit ${isKcal ? 'kcal' : ''}">${shownUnit}</span></td>
      <td class="cmp-val ${compareClass(valA, valB)}">${valA.toFixed(1)} ${shownUnit}</td>
      <td class="cmp-val ${compareClass(valB, valA)}">${valB.toFixed(1)} ${shownUnit}</td>
    `;
        tbody.appendChild(tr);
    });
}
