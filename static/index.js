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
document.querySelectorAll('.nav-link').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(t => {
            const active = t === tab;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active);
        });
        ['meal', 'compare', 'about'].forEach(view => {
            document.getElementById('view-' + view).hidden = tab.dataset.view !== view;
        });
    });
});

/* ── Recherche d'aliment avec autocompletion ── */
const MAX_RESULTS = 50;

function normalize(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const ALIMENTS_INDEX = ALIMENTS.map(name => ({ name, norm: normalize(name) }));

function setupCombobox(inputId, listId, onPick) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    let highlighted = -1;

    function close() {
        list.hidden = true;
        highlighted = -1;
    }

    function pick(name) {
        onPick(name, input);
        close();
    }

    function render() {
        const q = normalize(input.value.trim());
        const matches = [];
        for (const a of ALIMENTS_INDEX) {
            if (a.norm.includes(q)) {
                matches.push(a.name);
                if (matches.length >= MAX_RESULTS) break;
            }
        }
        list.innerHTML = '';
        highlighted = -1;
        if (matches.length === 0) {
            const li = document.createElement('li');
            li.className = 'no-result';
            li.textContent = 'Aucun aliment trouvé';
            list.appendChild(li);
        } else {
            matches.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                // mousedown pour devancer le blur de l'input
                li.addEventListener('mousedown', e => {
                    e.preventDefault();
                    pick(name);
                });
                list.appendChild(li);
            });
        }
        list.hidden = false;
    }

    function moveHighlight(delta) {
        const items = [...list.querySelectorAll('li:not(.no-result)')];
        if (items.length === 0) return;
        highlighted = (highlighted + delta + items.length) % items.length;
        items.forEach((li, i) => li.classList.toggle('highlighted', i === highlighted));
        items[highlighted].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('blur', close);
    input.addEventListener('keydown', e => {
        if (list.hidden) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveHighlight(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveHighlight(-1);
        } else if (e.key === 'Enter') {
            const items = [...list.querySelectorAll('li:not(.no-result)')];
            if (highlighted >= 0 && items[highlighted]) {
                e.preventDefault();
                pick(items[highlighted].textContent);
            } else if (items.length === 1) {
                e.preventDefault();
                pick(items[0].textContent);
            }
        } else if (e.key === 'Escape') {
            close();
        }
    });
}

/* ── Vue meal prep ── */
setupCombobox('aliment-search', 'aliment-results', (name, input) => {
    input.value = '';
    addIngredient(name);
});

function addIngredient(name) {
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
    renderItem(id, name);
    updateNutrition();
}

function renderItem(id, name) {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'none';

    const list = document.getElementById('ingredients-list');
    const item = document.createElement('div');
    item.className = 'ingredient-item';
    item.dataset.id = id;

    item.innerHTML = `
        <div class="item-top">
          <span class="ingredient-name">${name}</span>
          <button class="btn-remove" aria-label="Retirer ${name}">&times;</button>
        </div>

        <div class="slider-row">
          <input type="range" min="1" max="500" value="100" step="1" style="--pct: 20%"
            aria-label="Quantité de ${name} en grammes">
          <div class="qty-display">100 g</div>
        </div>

        <div class="price-row">
          <label for="price-${id}">Prix au 100 g (€)</label>
          <input type="number" id="price-${id}" min="0" step="0.01" value="0">
        </div>
      `;

    item.querySelector('.btn-remove').addEventListener('click', () => removeIngredient(id));

    const slider = item.querySelector('input[type=range]');
    const qty = item.querySelector('.qty-display');
    slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        selected[id].grams = val;
        qty.textContent = val + ' g';
        const pct = ((val - 1) / 499 * 100).toFixed(1) + '%';
        slider.style.setProperty('--pct', pct);
        updateNutrition();
    });

    const priceInput = item.querySelector('input[type=number]');
    priceInput.addEventListener('input', () => {
        selected[id].price100g = parseFloat(priceInput.value) || 0;
        updateNutrition();
    });

    list.appendChild(item);
}

function removeIngredient(id) {
    delete selected[id];
    const item = document.querySelector(`.ingredient-item[data-id="${id}"]`);
    if (item) item.remove();
    if (Object.keys(selected).length === 0) {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = '';
    }
    updateNutrition();
}

function updateNutrition() {
    const ids = Object.keys(selected);
    if (ids.length === 0) {
        document.getElementById('no-data-msg').hidden = false;
        document.getElementById('nutrition-content').hidden = true;
        return;
    }
    document.getElementById('no-data-msg').hidden = true;
    document.getElementById('nutrition-content').hidden = false;

    const totals = {};
    MACROS.forEach(([key]) => totals[key] = 0);

    let totalWeight = 0;
    let totalPrice = 0;
    ids.forEach(id => {
        const item = selected[id];
        totalWeight += item.grams;
        totalPrice += (item.grams / 100) * item.price100g;
        const data = ALL_DATA[item.name];
        if (!data) return;
        MACROS.forEach(([key]) => {
            totals[key] += (parseFloat(data[key]) || 0) * item.grams / 100;
        });
    });

    document.getElementById('total-weight-val').textContent = totalWeight;
    document.getElementById('total-price-val').textContent = totalPrice.toFixed(2);

    // Stats
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
const compareState = { a: null, b: null };

setupCombobox('compare-a', 'compare-a-results', (name, input) => {
    input.value = name;
    compareState.a = name;
    renderCompare();
});

setupCombobox('compare-b', 'compare-b-results', (name, input) => {
    input.value = name;
    compareState.b = name;
    renderCompare();
});

// Si l'utilisateur vide un champ, la comparaison correspondante est annulee
['a', 'b'].forEach(side => {
    document.getElementById('compare-' + side).addEventListener('input', e => {
        if (e.target.value.trim() === '') {
            compareState[side] = null;
            renderCompare();
        }
    });
});

function compareClass(a, b) {
    if (a === b) return 'cmp-equal';
    return a > b ? 'cmp-more' : 'cmp-less';
}

function renderCompare() {
    const dataA = ALL_DATA[compareState.a];
    const dataB = ALL_DATA[compareState.b];

    const emptyMsg = document.getElementById('compare-empty');
    const tableWrap = document.getElementById('compare-table');

    if (!dataA || !dataB) {
        emptyMsg.hidden = false;
        tableWrap.hidden = true;
        return;
    }
    emptyMsg.hidden = true;
    tableWrap.hidden = false;

    document.getElementById('compare-head-a').textContent = compareState.a;
    document.getElementById('compare-head-b').textContent = compareState.b;

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
