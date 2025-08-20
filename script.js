// --- DOM Element Selection ---
const balanceDisplay = document.getElementById('balance');
const totalIncomeDisplay = document.getElementById('total-income');
const totalExpenseDisplay = document.getElementById('total-expense');
const transactionForm = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const recentTransactionList = document.getElementById('recent-transaction-list');
const fullHistoryList = document.getElementById('full-history-list');
const homePage = document.getElementById('home-page');
const historyPage = document.getElementById('history-page');
const navHome = document.getElementById('nav-home');
const navHistory = document.getElementById('nav-history');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// --- State Management ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let transactionIdToDelete = null;

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function updateSummary() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const allAmounts = transactions.map(t => t.amount);
    const total = allAmounts.reduce((acc, item) => (acc += item), 0);
    balanceDisplay.innerText = total < 0 ? `-${formatAsRupee(Math.abs(total))}` : formatAsRupee(total);
    const monthlyIncome = transactions.filter(t => t.amount > 0 && new Date(t.date) >= monthStart).reduce((acc, t) => acc + t.amount, 0);
    totalIncomeDisplay.innerText = formatAsRupee(monthlyIncome);
    const dailyExpense = transactions.filter(t => t.amount < 0 && new Date(t.date) >= todayStart).reduce((acc, t) => acc + t.amount, 0);
    totalExpenseDisplay.innerText = formatAsRupee(Math.abs(dailyExpense));
}

function renderRecentHistory() {
    recentTransactionList.innerHTML = '';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysTransactions = transactions.filter(t => new Date(t.date) >= todayStart).reverse();
    if (todaysTransactions.length === 0) {
        recentTransactionList.innerHTML = '<p class="text-center text-gray-500 p-4">No transactions for today.</p>';
    } else {
        todaysTransactions.forEach(transaction => addTransactionToDOM(transaction, recentTransactionList));
    }
}

function addTransactionToDOM(transaction, listElement) {
    const item = document.createElement('li');
    item.className = 'transaction-item flex justify-between items-center p-3';
    item.dataset.id = transaction.id;
    const isExpense = transaction.amount < 0;
    const sign = isExpense ? '-' : '+';
    const color = isExpense ? 'text-red-500' : 'text-green-500';
    const formattedAmount = `${sign}${formatAsRupee(Math.abs(transaction.amount))}`;
    item.innerHTML = `<span>${transaction.description}</span><span class="${color} font-semibold">${formattedAmount}</span>`;

    // Right-click event listener for desktop
    item.addEventListener('contextmenu', (event) => {
        event.preventDefault(); 
        triggerDelete(transaction.id);
    });

    // Double-click for deletion
    item.addEventListener('dblclick', () => triggerDelete(transaction.id));

    listElement.appendChild(item);
}

function renderFullHistory() {
    fullHistoryList.innerHTML = '';
    if (transactions.length === 0) {
        fullHistoryList.innerHTML = '<p class="text-center text-gray-500 p-4">No history to display.</p>';
        return;
    }
    const groupedByDate = transactions.reduce((acc, t) => {
        const date = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(t);
        return acc;
    }, {});
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')));
    for (const date of sortedDates) {
        const dateContainer = document.createElement('div');
        const dateHeader = document.createElement('h3');
        dateHeader.className = 'text-lg font-semibold text-gray-700 border-b pb-2 mb-2';
        dateHeader.innerText = date;
        dateContainer.appendChild(dateHeader);
        const dailyTransactions = groupedByDate[date];
        const dailyExpense = dailyTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
        if (dailyExpense < 0) {
            const dailySummary = document.createElement('div');
            dailySummary.className = 'text-sm text-gray-600 p-3 bg-gray-50 rounded-md mb-2 flex justify-between items-center';
            dailySummary.innerHTML = `<span>Total Expenses for the day:</span> <span class="font-semibold text-red-500">${formatAsRupee(Math.abs(dailyExpense))}</span>`;
            dateContainer.appendChild(dailySummary);
        }
        const dailyList = document.createElement('ul');
        dailyTransactions.forEach(t => addTransactionToDOM(t, dailyList));
        dateContainer.appendChild(dailyList);
        fullHistoryList.appendChild(dateContainer);
    }
}

function formatAsRupee(number) {
    return `₹${number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function handleFormSubmit(event) {
    event.preventDefault();
    const description = descriptionInput.value.trim();
    const rawAmountString = amountInput.value.trim();
    const isIncome = rawAmountString.startsWith('+');
    const amountString = rawAmountString.replace(/[^0-9.]/g, '');
    let amount = parseFloat(amountString);
    if (description === '' || isNaN(amount)) return;
    if (!isIncome) amount = -Math.abs(amount);
    transactions.push({ id: Date.now(), description, amount, date: new Date().toISOString() });
    saveTransactions();
    updateAll();
    descriptionInput.value = '';
    amountInput.value = '';
    descriptionInput.focus();
}

function formatCurrencyInput(event) {
    let value = event.target.value;
    if (!value) return;
    let cursorPosition = event.target.selectionStart;
    let originalLength = value.length;
    let sign = '';
    if (value.startsWith('+')) sign = '+';
    else if (value.startsWith('-')) sign = '-';
    let numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) numericValue = parts[0] + '.' + parts.slice(1).join('');
    let integerPart = parts[0];
    let decimalPart = parts.length > 1 ? '.' + parts[1] : '';
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let formattedValue = sign + integerPart + decimalPart;
    event.target.value = formattedValue;
    let newLength = formattedValue.length;
    event.target.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));
}

// --- Deletion Logic ---
function triggerDelete(id) {
    transactionIdToDelete = id;
    deleteModal.classList.remove('hidden');
}

function confirmDeletion() {
    transactions = transactions.filter(t => t.id !== transactionIdToDelete);
    saveTransactions();
    updateAll();
    if (!historyPage.classList.contains('hidden')) {
        renderFullHistory();
    }
    deleteModal.classList.add('hidden');
    transactionIdToDelete = null;
}

function cancelDeletion() {
    deleteModal.classList.add('hidden');
    transactionIdToDelete = null;
}

// --- Navigation Logic ---
function showHomePage() {
    homePage.classList.remove('hidden');
    historyPage.classList.add('hidden');
    navHome.classList.add('nav-active');
    navHistory.classList.remove('nav-active');
}

function showHistoryPage() {
    homePage.classList.add('hidden');
    historyPage.classList.remove('hidden');
    navHome.classList.remove('nav-active');
    navHistory.classList.add('nav-active');
    renderFullHistory();
}

function updateAll() {
    updateSummary();
    renderRecentHistory();
}

function init() {
    transactionForm.addEventListener('submit', handleFormSubmit);
    amountInput.addEventListener('input', formatCurrencyInput);
    navHome.addEventListener('click', showHomePage);
    navHistory.addEventListener('click', showHistoryPage);
    confirmDeleteBtn.addEventListener('click', confirmDeletion);
    cancelDeleteBtn.addEventListener('click', cancelDeletion);
    updateAll();
}

init();
