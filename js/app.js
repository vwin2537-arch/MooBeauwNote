/**
 * บันทึกของหมูบิว - Main Application Logic
 * Version: 1.0.0
 * Control logic สำหรับทุกหน้าในแอพ
 */

const App = {
    // ==================== STATE ====================
    state: {
        currentDate: new Date(), // เดือน/ปี ที่กำลังดูอยู่
        currentPage: 'dashboard',
        transactionToEdit: null, // เก็บ object รายการที่จะแก้ไข
        filter: { // สถานะตัวกรองในหน้า Transactions
            range: null, // string 'YYYY-MM-DD to YYYY-MM-DD'
            type: 'all',
            category: 'all'
        },
        charts: {}, // เก็บ instance ของ Chart.js
        selectedCategoryIcon: '💰' // ไอคอนที่เลือกไว้สำหรับหมวดหมู่ใหม่
    },

    // ==================== ICONS COLLECTION ====================
    icons: [
        '💰', '💴', '💳', '🏦', '💹', '💎', '🐷', '🍜', '🍹', '☕', '🥐', '🍔', '🍕', '🍰', '🥞', '🍦', '🍓', ' Bento', '🛒', '🛍️', '👕', '👠', '👜', '💄', '🏠', '💡', '💧', '📶', '📱', '🚗', '🚌', '✈️', '🚆', '⛽', '🎬', '🎮', '🎤', '🎡', '🎟️', '💊', '🏥', '🧘', '🏃', '📚', '💻', '✏️', '🖇️', '🐱', '🐶', '🐰', '🐥', '🐹', '🐼', '🌸', '🍀', '🌈', '🌙', '✨', '🎁', '🎀', '📮', '🎈', '🧸', '💖', '⭐', '🍀', '🍬', '🍭', '🍩', '🍪', '🥨', '🍟', '🍳', '🍶', '🧺', '🧼', '🧸', '🎹', '🎨', '🧩', '🚀'
    ],

    // ==================== HELPER FUNCTIONS ====================

    /**
     * ทำลาย Chart instance ถ้ามีอยู่ (DRY helper)
     * @param {string} chartKey - key ใน state.charts
     */
    destroyChart(chartKey) {
        if (this.state.charts[chartKey]) {
            this.state.charts[chartKey].destroy();
            this.state.charts[chartKey] = null;
        }
    },

    // ==================== INITIALIZATION ====================

    /**
     * เริ่มต้นแอพ
     */
    async init() {
        console.log('App Initializing...');

        // 1. ตรวจสอบข้อมูลเริ่มต้น
        this.checkFirstRun();

        // 2. Setup Event Listeners
        this.setupEventListeners();
        this.setupNavigation();
        this.setupForms();

        // 3. Setup Libraries
        this.setupFlatpickr();

        // 4. Setup Sync (Auto Sync)
        if (typeof Sync !== 'undefined') {
            Sync.initAutoSync();
        }

        // 5. โหลดหน้าแรก (Dashboard)
        this.navigateTo('dashboard');

        // 6. ⭐ Auto-Pull from Google Sheets on Load (ดึงข้อมูลจาก Cloud เป็นหลัก)
        if (typeof Sync !== 'undefined' && Sync.canSync()) {
            console.log('Auto-pulling data from Google Sheets...');
            Utils.showLoading(true, 'กำลังโหลดข้อมูลจาก Cloud...');
            try {
                await Sync.pullFromCloud();
            } catch (e) {
                console.error('Auto-pull failed, using local data:', e);
            }
            Utils.showLoading(false);
        }

        // 7. โหลดข้อมูล Async (Refresh UI)
        setTimeout(() => {
            this.refresh();
        }, 100);

        console.log('App Initialized');
    },

    /**
     * ตรวจสอบการรันครั้งแรก
     */
    checkFirstRun() {
        // ตรวจสอบว่ามีหมวดหมู่หรือยัง ถ้าไม่มีให้สร้างค่าเริ่มต้น
        const categories = Storage.getCategories();
        if (!categories) {
            console.log('First run detected, initializing categories...');
            Storage.getCategories(); // จะสร้าง default ให้เอง
        }

        // ตรวจสอบงบประมาณ
        const budget = Storage.getBudget();
        if (!budget) {
            Storage.getBudget(); // จะสร้าง default ให้เอง
        }
    },

    /**
     * ตั้งค่า Event Listeners ทั่วไป
     */
    setupEventListeners() {
        // Theme Toggle
        const themeToggle = document.getElementById('darkModeToggle');
        if (themeToggle) {
            // โหลดค่าเดิม
            const settings = Storage.getSettings();
            if (settings.darkMode) {
                document.body.dataset.theme = 'dark';
                themeToggle.checked = true;
            }

            themeToggle.addEventListener('change', (e) => {
                const isDark = e.target.checked;
                document.body.dataset.theme = isDark ? 'dark' : '';
                Storage.updateSettings({ darkMode: isDark });
            });
        }

        // Header Sync Status Click (Manual Sync)
        const syncStatusBtn = document.getElementById('syncStatus');
        if (syncStatusBtn) {
            syncStatusBtn.addEventListener('click', async () => {
                // Prevent click if already syncing
                if (typeof Sync !== 'undefined' && Sync.currentStatus !== Sync.STATUS.SYNCING) {
                    // Add tactile feedback
                    syncStatusBtn.style.transform = 'scale(0.95)';
                    setTimeout(() => syncStatusBtn.style.transform = '', 100);

                    await Sync.pushToCloud();
                }
            });
        }
    },

    /**
     * ตั้งค่า Navigation System
     */
    setupNavigation() {
        // Bottom Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // ป้องกันการกดซ้ำหน้าเดิม (ยกเว้นปุ่ม +)
                const page = item.dataset.page;
                if (page === this.state.currentPage && page !== 'add') return;

                // ปุ่ม Add ให้รีเซ็ตฟอร์มก่อนเข้าเสมอ
                if (page === 'add') {
                    this.resetTransactionForm();
                }

                this.navigateTo(page);
            });
        });

        // Back Buttons
        const backBtns = document.querySelectorAll('.back-btn');
        backBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = btn.dataset.page || 'dashboard';
                this.navigateTo(targetPage);
            });
        });

        // Quick Add Button (Dashboard)
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => {
                this.resetTransactionForm();
                this.navigateTo('add');
            });
        }

        // See All Transactions Button
        const seeAllBtns = document.querySelectorAll('.see-all-btn');
        seeAllBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.navigateTo('transactions');
            });
        });

        // Manage Categories Button (Settings)
        const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => {
                this.navigateTo('categories');
            });
        }
    },

    /**
     * ตั้งค่าฟอร์มต่างๆ
     */
    setupForms() {
        // --- Transaction Form ---
        const txForm = document.getElementById('transactionForm');
        if (txForm) {
            txForm.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        }

        // Transaction Type Toggle (Income/Expense)
        const typeBtns = document.querySelectorAll('.type-btn');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all
                typeBtns.forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');

                // Update categories dropdown based on type
                const type = btn.dataset.type;
                this.renderCategoryDropdown(type);
            });
        });

        // Receipt Upload
        const uploadBtn = document.getElementById('uploadReceiptBtn');
        const fileInput = document.getElementById('txReceipt');
        const removeBtn = document.getElementById('removeReceiptBtn');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    try {
                        Utils.showLoading(true, 'กำลังประมวลผลรูปภาพ...');
                        const base64 = await Utils.compressImage(file);
                        this.showReceiptPreview(base64);
                        Utils.showLoading(false);
                    } catch (error) {
                        Utils.showLoading(false);
                        Utils.showToast('เกิดข้อผิดพลาดในการอัปโหลดรูป: ' + error.message, 'error');
                    }
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.hideReceiptPreview();
                if (fileInput) fileInput.value = '';
            });
        }

        // Delete Transaction Button
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const id = document.getElementById('editTransactionId').value;
                if (id) {
                    this.confirmDeleteTransaction(id);
                }
            });
        }

        // --- Month Picker ---
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');

        if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => this.changeMonth(1));

        // --- Settings Forms ---
        // Save Budget
        const saveBudgetBtn = document.getElementById('saveBudgetSettings');
        if (saveBudgetBtn) {
            saveBudgetBtn.addEventListener('click', () => {
                const amount = document.getElementById('monthlyBudget').value;
                const alert = document.getElementById('budgetAlert').value;

                Storage.setMonthlyBudget(amount);
                Storage.setBudgetAlertThreshold(alert);

                Utils.showToast('บันทึกงบประมาณเรียบร้อย', 'success');
                this.refresh(); // Update budget progress bar if visible

                // Trigger Instant Sync
                if (typeof Sync !== 'undefined') Sync.pushToCloud();
            });
        }

        // Save GAS URL
        const saveGasBtn = document.getElementById('saveGasUrl');
        if (saveGasBtn) {
            saveGasBtn.addEventListener('click', () => {
                const url = document.getElementById('gasUrl').value;
                Storage.setGasUrl(url);
                Utils.showToast('บันทึก URL เรียบร้อย', 'success');
                // Check connectivity
                if (url && typeof Sync !== 'undefined') {
                    Sync.updateSyncStatus(Sync.STATUS.IDLE);
                    Sync.pushToCloud(); // Trigger Sync immediately
                }
            });
        }

        // Sync Buttons
        const syncNowBtn = document.getElementById('syncNowBtn');
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                if (typeof Sync !== 'undefined') {
                    await Sync.pushToCloud();
                }
            });
        }

        const pullBtn = document.getElementById('pullFromCloudBtn');
        if (pullBtn) {
            pullBtn.addEventListener('click', async () => {
                if (typeof Sync !== 'undefined') {
                    await Sync.pullFromCloud();
                }
            });
        }

        // Clear Data Buttons
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                if (confirm('ต้องการล้าง Cache ทั้งหมดหรือไม่? (ข้อมูลอาจหายได้ถ้ายังไม่ได้ Sync)')) {
                    // Logic to clear application cache if Service Worker is used
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                        Utils.showToast('ล้าง Cache เรียบร้อย', 'success');
                    }
                }
            });
        }

        const clearAllDataBtn = document.getElementById('clearAllDataBtn');
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => {
                if (confirm('คุณแน่ใจว่าต้องการล้างข้อมูล "ทั้งหมด" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!')) {
                    Storage.clear();
                    Utils.showToast('ล้างข้อมูลทั้งหมดแล้ว', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                }
            });
        }
    },

    /**
     * Setup Flatpickr Date Picker
     */
    setupFlatpickr() {
        if (typeof flatpickr !== 'undefined') {
            flatpickr('.date-input', {
                locale: 'th',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'j F Y',
                defaultDate: 'today',
                disableMobile: false // ใช้ native picker บนมือถือถ้ารองรับ แต่นี่บังคับ UI ของ flatpickr
            });

            // Filter Range Picker
            flatpickr('#filterDateRange', {
                mode: 'range',
                locale: 'th',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'j M Y',
                onClose: (selectedDates, dateStr, instance) => {
                    if (selectedDates.length === 2) {
                        // Update filter logic here
                        this.state.filter.range = dateStr; // string "2023-01-01 to 2023-01-31"
                        this.loadTransactions(); // Reload list
                    }
                }
            });
        }
    },

    // ==================== NAVIGATION ====================

    /**
     * เปลี่ยนหน้า
     * @param {string} pageId - ID ของ section หน้า (ไม่รวม 'page-')
     */
    navigateTo(pageId) {
        // 1. Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.classList.remove('active'));

        // 2. Show target page
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.state.currentPage = pageId;

            // Scroll to top
            window.scrollTo(0, 0);

            // 3. Update Bottom Nav
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                if (item.dataset.page === pageId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // 4. Load page content
            this.loadPageContent(pageId);
        }
    },

    /**
     * โหลดข้อมูลเฉพาะของแต่ละหน้า
     * @param {string} pageId 
     */
    loadPageContent(pageId) {
        switch (pageId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'categories':
                this.loadCategoriesManagement();
                break;
            case 'add':
                // Initialized by setupForms or resetTransactionForm
                // ตรวจสอบว่ามีหมวดหมู่หรือไม่
                const type = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
                this.renderCategoryDropdown(type);
                break;
        }
    },

    /**
     * รีเฟรชข้อมูลหน้าปัจจุบัน
     */
    refresh() {
        this.loadPageContent(this.state.currentPage);
    },

    // ==================== DASHBOARD LOGIC ====================

    /**
     * โหลดข้อมูลหน้า Dashboard
     */
    loadDashboard() {
        // 1. Update Month Display
        const monthYear = Utils.getMonthYearDisplay(
            this.state.currentDate.getMonth(),
            this.state.currentDate.getFullYear()
        );
        document.getElementById('currentMonthDisplay').textContent = monthYear;

        // 2. Update Totals
        this.updateDashboardTotals();

        // 3. Update Budget Progress
        this.updateBudgetProgress();

        // 4. Update Pie Chart
        this.renderDashboardChart();

        // 5. Update Recent Transactions
        this.renderRecentTransactions();
    },

    /**
     * เปลี่ยนเดือน
     * @param {number} delta - -1 หรือ 1
     */
    changeMonth(delta) {
        // เปลี่ยนเดือนใน State
        const newDate = new Date(this.state.currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        this.state.currentDate = newDate;

        // Refresh หน้าแสดงผล
        this.refresh();
    },

    /**
     * อัปเดตยอดรวมรายรับ/รายจ่าย/คงเหลือ
     */
    updateDashboardTotals() {
        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();

        // ดึงรายการของเดือนนี้
        const transactions = Storage.getTransactionsByMonth(year, month);
        const { income, expense, balance } = Storage.calculateTotals(transactions);

        // Update DOM
        document.getElementById('totalIncome').textContent = Utils.formatCurrency(income);
        document.getElementById('totalExpense').textContent = Utils.formatCurrency(expense);
        document.getElementById('totalBalance').textContent = Utils.formatCurrency(balance);

        // Color balance
        const balanceEl = document.getElementById('totalBalance');
        if (balance < 0) balanceEl.style.color = 'var(--expense-color)';
        else if (balance > 0) balanceEl.style.color = 'var(--income-color)';
        else balanceEl.style.color = 'inherit';
    },

    /**
     * อัปเดตแถบงบประมาณ
     */
    updateBudgetProgress() {
        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();

        const { used, total, percent, status } = Storage.getBudgetStatus(year, month);

        const fill = document.getElementById('budgetProgressFill');
        const percentageText = document.getElementById('budgetPercent');
        const usedText = document.getElementById('budgetUsed');
        const totalText = document.getElementById('budgetTotal');

        if (fill && percentageText) {
            // Update width
            fill.style.width = `${Math.min(100, percent)}%`;
            percentageText.textContent = `${percent}%`;
            usedText.textContent = `ใช้ไป ${Utils.formatCurrency(used)}`;
            totalText.textContent = `/ ${Utils.formatCurrency(total)}`;

            // Update Color class
            fill.className = 'budget-progress-fill'; // reset
            if (status === 'danger') fill.classList.add('bg-danger');
            else if (status === 'warning') fill.classList.add('bg-warning');
        }
    },

    /**
     * วาดกราฟ Pie Chart ใน Dashboard
     */
    renderDashboardChart() {
        const ctx = document.getElementById('expensePieChart');
        const noDataMsg = document.getElementById('noDataMessage');
        if (!ctx) return;

        // ดึงข้อมูลรายจ่ายตามหมวดหมู่
        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();
        const transactions = Storage.getTransactionsByMonth(year, month);
        const expenses = Storage.getExpensesByCategory(transactions);

        // เช็คว่ามีข้อมูลหรือไม่
        const labels = Object.keys(expenses);
        const data = Object.values(expenses);

        if (data.length === 0 || data.reduce((a, b) => a + b, 0) === 0) {
            ctx.style.display = 'none';
            if (noDataMsg) noDataMsg.style.display = 'block';
            return;
        }

        ctx.style.display = 'block';
        if (noDataMsg) noDataMsg.style.display = 'none';

        // เตรียมสี
        const backgroundColors = labels.map((_, i) => Utils.getCategoryColor(i));

        // ทำลายกราฟเก่าถ้ามี
        this.destroyChart('dashboardPie');

        // สร้างกราฟใหม่
        this.state.charts.dashboardPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: { family: 'Mali', size: 12 }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * แสดงรายการ recent transactions
     */
    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        if (!container) return;

        // ดึงรายการทั้งหมด แล้วตัดเอา 5 รายการล่าสุด
        let transactions = Storage.getTransactions();
        transactions = Utils.sortBy(transactions, 'createdAt', 'desc').slice(0, 5);

        this.renderTransactionList(transactions, container);
    },

    // ==================== TRANSACTION FORM LOGIC ====================

    /**
     * Render Dropdown หมวดหมู่
     * @param {string} type - 'expense' | 'income'
     * @param {string} selectId - ID ของ select element (optional)
     */
    renderCategoryDropdown(type, selectId = 'txCategory') {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear options except first
        select.innerHTML = '<option value="">เลือกหมวดหมู่...</option>';

        const categories = Storage.getCategoriesByType(type);
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.icon} ${cat.name}`;
            select.appendChild(option);
        });

        // ถ้าเป็นการแก้ไข เลือกค่าเดิมกลับมา
        if (this.state.transactionToEdit && this.state.transactionToEdit.category) {
            select.value = this.state.transactionToEdit.category;
        }
    },

    /**
     * แสดง Preview ใบเสร็จ
     * @param {string} base64 
     */
    showReceiptPreview(base64) {
        const preview = document.getElementById('receiptPreview');
        const img = document.getElementById('receiptImage');
        const uploadBtn = document.getElementById('uploadReceiptBtn');

        if (preview && img) {
            img.src = base64;
            preview.style.display = 'block';
            if (uploadBtn) uploadBtn.style.display = 'none'; // ซ่อนปุ่มอัปโหลด
        }
    },

    /**
     * ซ่อน Preview ใบเสร็จ
     */
    hideReceiptPreview() {
        const preview = document.getElementById('receiptPreview');
        const img = document.getElementById('receiptImage');
        const uploadBtn = document.getElementById('uploadReceiptBtn');

        if (preview && img) {
            img.src = '';
            preview.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'inline-block'; // แสดงปุ่มอัปโหลดกลับมา
        }
    },

    /**
     * จัดการ Submit Transaction
     */
    async handleTransactionSubmit(e) {
        e.preventDefault();

        const type = document.querySelector('.type-btn.active').dataset.type;
        const date = document.getElementById('txDate').value; // flatpickr value
        const amount = document.getElementById('txAmount').value;
        const category = document.getElementById('txCategory').value;
        const description = document.getElementById('txDescription').value;
        const tags = document.getElementById('txTags').value;

        // Receipt info from img src
        const imgPreview = document.getElementById('receiptImage');
        const receipt = (imgPreview && imgPreview.src && imgPreview.src.startsWith('data:'))
            ? imgPreview.src
            : null;

        // Validation
        if (!date || !amount || !category) {
            Utils.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
            return;
        }

        // ตรวจสอบจำนวนเงิน
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Utils.showToast('จำนวนเงินต้องมากกว่า 0', 'error');
            return;
        }

        // ตรวจสอบขนาด receipt (limit 500KB)
        if (receipt && receipt.length > 500 * 1024) {
            Utils.showToast('รูปใบเสร็จใหญ่เกินไป กรุณาใช้รูปขนาดเล็กกว่า', 'error');
            return;
        }

        // แสดง loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ กำลังบันทึก...';

        const transactionData = {
            type,
            date,
            amount: parsedAmount,
            category,
            description,
            tags: Utils.parseTags(tags),
            receipt
        };

        const editId = document.getElementById('editTransactionId').value;

        try {
            if (editId) {
                // Edit existing
                const result = Storage.updateTransaction(editId, transactionData);
                if (result) {
                    Utils.showToast('แก้ไขรายการสำเร็จ', 'success');
                    Utils.showConfetti();
                    if (typeof Sync !== 'undefined') Sync.pushToCloud(); // Instant Sync
                } else {
                    Utils.showToast('แก้ไขไม่สำเร็จ', 'error');
                }
            } else {
                // Add new
                const result = Storage.addTransaction(transactionData);
                if (result) {
                    Utils.showToast('บันทึกรายการสำเร็จ', 'success');
                    Utils.showConfetti();
                    if (typeof Sync !== 'undefined') Sync.pushToCloud(); // Instant Sync
                } else {
                    Utils.showToast('บันทึกไม่สำเร็จ', 'error');
                }
            }

            // กลับหน้า Dashboard
            this.navigateTo('dashboard');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    },

    /**
     * Reset Form สำหรับการเพิ่มรายการใหม่
     */
    resetTransactionForm() {
        this.state.transactionToEdit = null;

        document.getElementById('editTransactionId').value = '';
        document.getElementById('addPageTitle').textContent = 'บันทึกรายการใหม่';
        document.getElementById('submitBtn').innerHTML = '&#128190; บันทึก';
        document.getElementById('deleteBtn').style.display = 'none';

        document.getElementById('transactionForm').reset();

        // Set default date to today using Flatpickr instance
        const dateInput = document.getElementById('txDate');
        if (dateInput && dateInput._flatpickr) {
            dateInput._flatpickr.setDate(new Date());
        }

        this.hideReceiptPreview();

        // Set default type expense
        const expenseBtn = document.querySelector('.type-btn[data-type="expense"]');
        if (expenseBtn) expenseBtn.click();
    },

    /**
     * เตรียมฟอร์มสำหรับการแก้ไข (Load data)
     * @param {string} id 
     */
    prepareEditTransaction(id) {
        const transaction = Storage.getTransactionById(id);
        if (!transaction) return;

        this.state.transactionToEdit = transaction;

        // Setup UI
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('addPageTitle').textContent = 'แก้ไขรายการ';
        document.getElementById('submitBtn').innerHTML = '&#128190; บันทึกการแก้ไข';
        document.getElementById('deleteBtn').style.display = 'block';

        this.navigateTo('add');

        // Fill Data
        // 1. Type
        const typeBtn = document.querySelector(`.type-btn[data-type="${transaction.type}"]`);
        if (typeBtn) typeBtn.click();

        // 2. Date
        const dateInput = document.getElementById('txDate');
        if (dateInput && dateInput._flatpickr) {
            dateInput._flatpickr.setDate(transaction.date);
        }

        // 3. Category - รอให้ dropdown render เสร็จก่อนด้วย requestAnimationFrame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const catSelect = document.getElementById('txCategory');
                if (catSelect) catSelect.value = transaction.category;
            });
        });

        // 4. Amount, Desc
        document.getElementById('txAmount').value = transaction.amount;
        document.getElementById('txDescription').value = transaction.description || '';

        // 5. Tags
        document.getElementById('txTags').value = Utils.formatTags(transaction.tags).replace(/#/g, '');

        // 6. Receipt
        if (transaction.receipt) {
            this.showReceiptPreview(transaction.receipt);
        } else {
            this.hideReceiptPreview();
        }
    },

    /**
     * ยืนยันการลบ
     */
    confirmDeleteTransaction(id) {
        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDeleteModal');
        const cancelBtn = document.getElementById('cancelDeleteModal');

        if (!modal) return;

        Utils.showModal('deleteModal');

        // Setup One-time listener
        const onConfirm = () => {
            Storage.deleteTransaction(id);
            Utils.showToast('ลบรายการเรียบร้อย', 'success');
            Utils.hideModal('deleteModal');
            this.navigateTo('dashboard');
            cleanup();
        };

        const onCancel = () => {
            Utils.hideModal('deleteModal');
            cleanup();
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    },

    /**
     * Render รายการลงใน container
     * @param {array} transactions 
     * @param {HTMLElement} container 
     */
    renderTransactionList(transactions, container) {
        container.innerHTML = '';

        if (transactions.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div>ไม่มีรายการ</div></div>';
            return;
        }

        // Group by Date for cleaner UI
        const grouped = Utils.groupBy(transactions, 'date');
        // Sort dates desc
        const dates = Object.keys(grouped).sort((a, b) => Utils.compareDates(b, a));

        dates.forEach(date => {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.style.padding = '8px 16px';
            dateHeader.style.backgroundColor = 'var(--bg-light)';
            dateHeader.style.color = 'var(--text-muted)';
            dateHeader.style.fontSize = '0.85rem';
            dateHeader.style.fontWeight = '500';
            dateHeader.textContent = Utils.formatDateThai(date);
            container.appendChild(dateHeader);

            grouped[date].forEach(t => {
                const item = document.createElement('div');
                // เพิ่ม type class (income/expense) เพื่อให้ CSS ทำงานถูกต้อง
                item.className = `transaction-item ${t.type}`;

                const isExpense = t.type === 'expense';
                const sign = isExpense ? '-' : '+';

                // Icon (หาจากหมวดหมู่ หรือ Default)
                const catObj = Storage.getCategoryByName(t.category, t.type);
                const icon = catObj ? catObj.icon : (isExpense ? '💸' : '💰');

                // ใช้ Class names ที่ตรงกับ main.css
                item.innerHTML = `
                    <div class="transaction-icon">${icon}</div>
                    <div class="transaction-details">
                        <div class="transaction-description">${t.description || t.category}</div>
                        <div class="transaction-category">
                            ${t.category} ${t.tags && t.tags.length > 0 ? Utils.formatTags(t.tags) : ''}
                        </div>
                    </div>
                    <div class="transaction-right">
                        <div class="transaction-amount">
                            ${sign}${Utils.formatCurrency(t.amount)} ฿
                        </div>
                        <!-- <div class="transaction-date">${Utils.formatTime(new Date(t.createdAt))}</div> -->
                    </div>
                `;

                // Click to edit
                item.addEventListener('click', () => {
                    this.prepareEditTransaction(t.id);
                });

                container.appendChild(item);
            });
        });
    },

    // ==================== PLACEHOLDERS FOR OTHER PAGES ====================
    // จะทยอย Implement ใน Task ถัดไป

    /**
     * โหลดข้อมูลหน้า Transactions (รายการทั้งหมด)
     */
    loadTransactions() {
        const container = document.getElementById('allTransactions');
        const emptyState = document.getElementById('emptyTransactions');
        const summaryIncome = document.getElementById('filteredIncome');
        const summaryExpense = document.getElementById('filteredExpense');

        if (!container) return;

        // 1. Setup Filters Events (ทำครั้งเดียว)
        if (!this.state.filterEventsBound) {
            const filterType = document.getElementById('filterType');
            const filterCategory = document.getElementById('filterCategory');

            if (filterType) {
                filterType.addEventListener('change', (e) => {
                    this.state.filter.type = e.target.value;
                    this.loadTransactions();
                });
            }

            if (filterCategory) {
                filterCategory.addEventListener('change', (e) => {
                    this.state.filter.category = e.target.value;
                    this.loadTransactions();
                });
            }

            // Populate Category Filter
            this.populateCategoryFilter();

            this.state.filterEventsBound = true;
        }

        // 2. Filter Data
        let transactions = Storage.getTransactions();

        // Filter by Date Range
        if (this.state.filter.range) {
            const [start, end] = this.state.filter.range.split(' to ');
            if (start) {
                // ถ้ามีแค่ start (เลือกวันเดียว) หรือครบทั้งคู่
                const endDate = end || start;
                transactions = transactions.filter(t =>
                    Utils.isDateInRange(t.date, start, endDate)
                );
            }
        }

        // Filter by Type
        if (this.state.filter.type !== 'all') {
            transactions = transactions.filter(t => t.type === this.state.filter.type);
        }

        // Filter by Category
        if (this.state.filter.category !== 'all') {
            transactions = transactions.filter(t => t.category === this.state.filter.category);
        }

        // 3. Sort by Date/Time desc
        transactions = Utils.sortBy(transactions, 'createdAt', 'desc');
        transactions = Utils.sortBy(transactions, 'date', 'desc');

        // 4. Calculate Summary for Filtered Data
        const totals = Storage.calculateTotals(transactions);
        if (summaryIncome) summaryIncome.textContent = Utils.formatCurrency(totals.income);
        if (summaryExpense) summaryExpense.textContent = Utils.formatCurrency(totals.expense);

        // 5. Render
        if (transactions.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        } else {
            container.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            this.renderTransactionList(transactions, container);
        }
    },

    /**
     * ใส่ตัวเลือกใน Dropdown ตัวกรองหมวดหมู่
     */
    populateCategoryFilter() {
        const filterCategory = document.getElementById('filterCategory');
        if (!filterCategory) return;

        const currentVal = filterCategory.value;
        const categories = Storage.getCategories(); // { expense: [], income: [] }

        let allCats = [];
        if (this.state.filter.type === 'all') {
            allCats = [...categories.expense, ...categories.income];
        } else {
            allCats = categories[this.state.filter.type] || [];
        }

        // Remove duplicates by name
        const uniqueCats = [];
        const seen = new Set();
        allCats.forEach(c => {
            if (!seen.has(c.name)) {
                seen.add(c.name);
                uniqueCats.push(c);
            }
        });

        // Keep "All" option
        filterCategory.innerHTML = '<option value="all">ทั้งหมด</option>';

        uniqueCats.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.icon} ${cat.name}`;
            filterCategory.appendChild(option);
        });

        // Restore value if still valid
        if (currentVal && seen.has(currentVal)) {
            filterCategory.value = currentVal;
        } else {
            filterCategory.value = 'all';
        }
    },

    // ==================== REPORTS LOGIC ====================

    /**
     * โหลดข้อมูลหน้า Reports
     */
    loadReports() {
        console.log('Loading Reports Page...');

        // 1. Setup Events (ทำครั้งเดียว)
        if (!this.state.reportEventsBound) {
            // Setup Period Selector (Month/Year)
            const periodBtns = document.querySelectorAll('.period-btn');
            periodBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    periodBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateReports();
                });
            });

            // Setup Month Navigation
            const prevBtn = document.getElementById('reportPrevMonth');
            const nextBtn = document.getElementById('reportNextMonth');

            if (prevBtn) prevBtn.addEventListener('click', () => this.changeReportDate(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => this.changeReportDate(1));

            // Export Button
            const exportBtn = document.getElementById('exportCsvBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    const transactions = this.getReportTransactions();
                    const csvData = Storage.prepareCSVData(transactions);
                    const filename = `transactions-${Utils.formatDateISO(this.state.reportDate || new Date())}.csv`;
                    Utils.exportCSV(csvData, filename);
                });
            }

            // Initialize Report State
            this.state.reportDate = new Date();
            this.state.reportEventsBound = true;
        }

        // 2. Update Date Display
        this.updateReportDateDisplay();

        // 3. Render Charts & Data
        this.updateReports();
    },

    /**
     * เปลี่ยนช่วงเวลาของรายงาน
     * @param {number} delta 
     */
    changeReportDate(delta) {
        const period = document.querySelector('.period-btn.active').dataset.period;
        const newDate = new Date(this.state.reportDate || new Date());

        if (period === 'month') {
            newDate.setMonth(newDate.getMonth() + delta);
        } else {
            newDate.setFullYear(newDate.getFullYear() + delta);
        }

        this.state.reportDate = newDate;
        this.updateReportDateDisplay();
        this.updateReports();
    },

    /**
     * อัปเดตการแสดงผลวันที่ในหน้า Reports
     */
    updateReportDateDisplay() {
        const period = document.querySelector('.period-btn.active').dataset.period;
        const date = this.state.reportDate || new Date();
        const displayEl = document.getElementById('reportMonthDisplay');

        if (!displayEl) return;

        if (period === 'month') {
            displayEl.textContent = Utils.getMonthYearDisplay(date.getMonth(), date.getFullYear());
        } else {
            displayEl.textContent = `ปี ${date.getFullYear() + 543}`;
        }
    },

    /**
     * ดึงรายการสำหรับรายงานตามช่วงเวลาที่เลือก
     */
    getReportTransactions() {
        const period = document.querySelector('.period-btn.active').dataset.period;
        const date = this.state.reportDate || new Date();
        const year = date.getFullYear();

        if (period === 'month') {
            return Storage.getTransactionsByMonth(year, date.getMonth());
        } else {
            // รายปี
            const transactions = Storage.getTransactions();
            return transactions.filter(t => new Date(t.date).getFullYear() === year);
        }
    },

    /**
     * อัปเดตข้อมูลและกราฟในหน้า Reports
     */
    updateReports() {
        const transactions = this.getReportTransactions();

        // 1. Income vs Expense Chart
        this.renderIncomeExpenseChart(transactions);

        // 2. Category Pie Chart
        this.renderCategoryReportChart(transactions);

        // 3. Daily Trend Chart
        this.renderTrendChart(transactions);

        // 4. Top Expenses
        this.renderTopExpenses(transactions);
    },

    /**
     * กราฟ Bar Income vs Expense
     */
    renderIncomeExpenseChart(transactions) {
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        const { income, expense } = Storage.calculateTotals(transactions);

        this.destroyChart('incomeExpense');

        this.state.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['รายรับ', 'รายจ่าย'],
                datasets: [{
                    label: 'จำนวนเงิน',
                    data: [income, expense],
                    backgroundColor: ['#7DD3AE', '#E89A9A'],
                    borderRadius: 8,
                    barThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: false }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    /**
     * กราฟ Pie หมวดหมู่
     */
    renderCategoryReportChart(transactions) {
        const ctx = document.getElementById('categoryPieChart');
        if (!ctx) return;

        const expenses = Storage.getExpensesByCategory(transactions);
        const labels = Object.keys(expenses);
        const data = Object.values(expenses);

        this.destroyChart('categoryReport');

        if (data.length === 0) {
            // Show placeholder logic if needed, currently chart.js handles empty gracefully often or we hide it
            // For now, let's just create an empty chart or skip
            // A clearer way:
            this.state.charts.categoryReport = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['ไม่มีข้อมูล'],
                    datasets: [{ data: [1], backgroundColor: ['#eee'] }]
                },
                options: { events: [], plugins: { legend: { display: false } } }
            });
            return;
        }

        const backgroundColors = labels.map((_, i) => Utils.getCategoryColor(i));

        this.state.charts.categoryReport = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: { family: 'Mali', size: 12 }
                        }
                    }
                }
            }
        });
    },

    /**
     * กราฟ Line แนวโน้มรายวัน/รายเดือน
     */
    renderTrendChart(transactions) {
        const ctx = document.getElementById('dailyTrendChart');
        if (!ctx) return;

        const period = document.querySelector('.period-btn.active').dataset.period;
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        // Group data
        if (period === 'month') {
            // Group by Day (1-31)
            const daysInMonth = new Date(
                (this.state.reportDate || new Date()).getFullYear(),
                (this.state.reportDate || new Date()).getMonth() + 1,
                0
            ).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                labels.push(i);
                incomeData.push(0);
                expenseData.push(0);
            }

            transactions.forEach(t => {
                const day = new Date(t.date).getDate();
                const idx = day - 1;
                if (t.type === 'income') incomeData[idx] += t.amount;
                else expenseData[idx] += t.amount;
            });

        } else {
            // Group by Month (Jan-Dec)
            const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            labels.push(...thaiMonthsShort);

            for (let i = 0; i < 12; i++) {
                incomeData.push(0);
                expenseData.push(0);
            }

            transactions.forEach(t => {
                const month = new Date(t.date).getMonth();
                if (t.type === 'income') incomeData[month] += t.amount;
                else expenseData[month] += t.amount;
            });
        }

        this.destroyChart('trend');

        this.state.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'รายรับ',
                        data: incomeData,
                        borderColor: '#7DD3AE',
                        backgroundColor: 'rgba(125, 211, 174, 0.2)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'รายจ่าย',
                        data: expenseData,
                        borderColor: '#FFB3BA',
                        backgroundColor: 'rgba(255, 179, 186, 0.2)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    /**
     * แสดง Top 10 รายจ่าย
     */
    renderTopExpenses(transactions) {
        const container = document.getElementById('topExpensesList');
        if (!container) return;

        container.innerHTML = '';

        // Filter expenses only
        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            container.innerHTML = '<p class="no-data">ไม่มีข้อมูลรายจ่าย</p>';
            return;
        }

        // Sort by amount desc and take top 10
        const top10 = Utils.sortBy(expenses, 'amount', 'desc').slice(0, 10);

        top10.forEach((t, index) => {
            const item = document.createElement('div');
            item.className = 'top-expense-item';

            const catObj = Storage.getCategoryByName(t.category, 'expense');
            const icon = catObj ? catObj.icon : '💸';

            item.innerHTML = `
                <div class="rank">${index + 1}</div>
                <div class="te-icon">${icon}</div>
                <div class="te-info">
                    <div class="te-name">${t.description || t.category}</div>
                    <div class="te-date">${Utils.formatDateDisplay(t.date)}</div>
                </div>
                <div class="te-amount">-${Utils.formatCurrency(t.amount)}</div>
            `;

            container.appendChild(item);
        });
    },

    loadSettings() {
        console.log('Loading Settings Page...');
        // Load initial values
        const settings = Storage.getSettings();
        const budget = Storage.getBudget();

        // Budget Inputs
        const mbInput = document.getElementById('monthlyBudget');
        if (mbInput) mbInput.value = budget.monthlyBudget;

        const baInput = document.getElementById('budgetAlert');
        if (baInput) baInput.value = budget.alertThreshold;

        // GAS URL
        const gasInput = document.getElementById('gasUrl');
        if (gasInput) gasInput.value = settings.gasUrl;

        // Sync Time
        if (typeof Sync !== 'undefined') Sync.updateLastSyncDisplay();
    },

    // ==================== CATEGORY MANAGEMENT LOGIC ====================

    /**
     * โหลดหน้าจัดการหมวดหมู่
     */
    loadCategoriesManagement() {
        console.log('Loading Categories Page...');

        // 1. Setup Events
        // 1. Setup Events
        // Always setup picker events because elements might be re-rendered
        const openPickerBtn = document.getElementById('openIconPickerBtn');
        if (openPickerBtn) {
            // Remove old listener to be safe (optional if using {once: true} or assuming fresh DOM)
            const newBtn = openPickerBtn.cloneNode(true);
            openPickerBtn.parentNode.replaceChild(newBtn, openPickerBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openIconPicker();
            });
        }

        const closePickerBtn = document.getElementById('closeIconPicker');
        if (closePickerBtn) {
            const newCloseBtn = closePickerBtn.cloneNode(true);
            closePickerBtn.parentNode.replaceChild(newCloseBtn, closePickerBtn);
            newCloseBtn.addEventListener('click', () => Utils.closeModal('iconPickerModal'));
        }

        if (!this.state.categoryEventsBound) {
            // Tabs
            const tabs = document.querySelectorAll('.category-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.renderManageCategoryList();
                });
            });

            // Add Button
            const addBtn = document.getElementById('addCategoryBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.handleAddNewCategory());
            }

            this.state.categoryEventsBound = true;
        }

        // 2. Render List
        this.renderManageCategoryList();
    },

    /**
     * แสดงรายการหมวดหมู่ (สำหรับหน้าจัดการ)
     */
    renderManageCategoryList() {
        const container = document.getElementById('categoryList');
        const activeTab = document.querySelector('.category-tab.active');
        const type = activeTab ? activeTab.dataset.catType : 'expense';

        if (!container) {
            console.error('categoryList container not found');
            return;
        }

        container.innerHTML = '';

        const categories = Storage.getCategoriesByType(type);
        console.log(`Categories for ${type}:`, categories);

        if (!categories || categories.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>ไม่มีหมวดหมู่</p></div>';
            return;
        }

        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';

            item.innerHTML = `
                <div class="cat-left">
                    <span class="cat-icon">${cat.icon || '📌'}</span>
                    <span class="cat-name">${cat.name}</span>
                </div>
                <button class="delete-cat-btn" data-id="${cat.id}">&times;</button>
            `;

            // Setup Delete Event
            const deleteBtn = item.querySelector('.delete-cat-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`ต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) {
                    const success = Storage.deleteCategory(type, cat.id);
                    if (success) {
                        Utils.showToast('ลบหมวดหมู่เรียบร้อย', 'success');
                        // Trigger Instant Sync
                        if (typeof Sync !== 'undefined') Sync.pushToCloud();
                        this.renderManageCategoryList();
                    } else {
                        Utils.showToast('ลบหมวดหมู่ไม่สำเร็จ', 'error');
                    }
                }
            });

            container.appendChild(item);
        });
    },

    /**
     * เพิ่มหมวดหมู่ใหม่
     */
    handleAddNewCategory() {
        const nameInput = document.getElementById('newCategoryName');
        const activeTab = document.querySelector('.category-tab.active');
        const type = activeTab ? activeTab.dataset.catType : 'expense';

        const name = nameInput.value.trim();
        const icon = this.state.selectedCategoryIcon;

        if (!name) {
            Utils.showToast('กรุณาระบุชื่อหมวดหมู่', 'error');
            return;
        }

        const result = Storage.addCategory(type, { name, icon });

        if (result) {
            Utils.showToast('เพิ่มหมวดหมู่เรียบร้อย', 'success');
            // Trigger Instant Sync
            if (typeof Sync !== 'undefined') Sync.pushToCloud();

            nameInput.value = '';
            // No need to reset selectedCategoryIcon here, keep it for next one if they like
            this.renderManageCategoryList();
        } else {
            Utils.showToast('เพิ่มหมวดหมู่ไม่สำเร็จ', 'error');
        }
    },

    /**
     * เปิด Icon Picker
     */
    openIconPicker() {
        this.renderIconPicker();
        Utils.openModal('iconPickerModal');
    },

    /**
     * วาดรายการไอคอนใน Picker
     */
    renderIconPicker() {
        const grid = document.getElementById('iconGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.icons.forEach(icon => {
            const btn = document.createElement('button');
            btn.className = 'icon-picker-item';
            btn.innerHTML = icon;
            btn.addEventListener('click', () => {
                this.selectIcon(icon);
                Utils.closeModal('iconPickerModal');
            });
            grid.appendChild(btn);
        });
    },

    /**
     * เลือกไอคอนจาก Picker
     */
    selectIcon(icon) {
        this.state.selectedCategoryIcon = icon;
        const preview = document.getElementById('selectedIcon');
        if (preview) {
            preview.innerHTML = icon;
            preview.classList.add('jelly-anim');
            setTimeout(() => preview.classList.remove('jelly-anim'), 600);
        }
    }
};

// Start App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    // Expose App to global for debug
    window.App = App;
});
