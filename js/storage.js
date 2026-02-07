/**
 * บันทึกของหมูบิว - Storage Module
 * Version: 1.0.0
 * จัดการข้อมูลใน LocalStorage
 */

const Storage = {
    // Keys สำหรับ LocalStorage
    KEYS: {
        TRANSACTIONS: 'mubew_transactions',
        CATEGORIES: 'mubew_categories',
        BUDGET: 'mubew_budget',
        SETTINGS: 'mubew_settings'
    },

    // หมวดหมู่เริ่มต้น
    DEFAULT_CATEGORIES: {
        expense: [
            { id: 'exp_1', name: 'อาหารและเครื่องดื่ม', icon: '🍜', type: 'expense' },
            { id: 'exp_2', name: 'ค่าเดินทาง', icon: '🚗', type: 'expense' },
            { id: 'exp_3', name: 'ค่าที่พัก', icon: '🏠', type: 'expense' },
            { id: 'exp_4', name: 'ช้อปปิ้ง', icon: '🛒', type: 'expense' },
            { id: 'exp_5', name: 'สุขภาพ', icon: '💊', type: 'expense' },
            { id: 'exp_6', name: 'บันเทิง', icon: '🎮', type: 'expense' },
            { id: 'exp_7', name: 'การศึกษา', icon: '📚', type: 'expense' },
            { id: 'exp_8', name: 'อื่นๆ', icon: '💰', type: 'expense' }
        ],
        income: [
            { id: 'inc_1', name: 'เงินเดือน', icon: '💼', type: 'income' },
            { id: 'inc_2', name: 'รายได้เสริม', icon: '💸', type: 'income' },
            { id: 'inc_3', name: 'ของขวัญ/โบนัส', icon: '🎁', type: 'income' },
            { id: 'inc_4', name: 'อื่นๆ', icon: '💰', type: 'income' }
        ]
    },

    // การตั้งค่าเริ่มต้น
    DEFAULT_SETTINGS: {
        gasUrl: 'https://script.google.com/macros/s/AKfycbyu27750o5gqnxiJPdjTEPfMxEeORFNEEUpo0uZ38WGnnNk2ePH7j0JfLkuK_NKo_Zy/exec',
        darkMode: false,
        notifications: true,
        lastSync: null
    },

    // งบประมาณเริ่มต้น
    DEFAULT_BUDGET: {
        monthlyBudget: 0,
        alertThreshold: 80,
        categoryBudgets: {}
    },

    /**
     * อ่านข้อมูลจาก LocalStorage
     * @param {string} key - key ของข้อมูล
     * @returns {any} ข้อมูลที่อ่านได้
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Storage.get error for key "${key}":`, error);
            return null;
        }
    },

    /**
     * บันทึกข้อมูลลง LocalStorage
     * @param {string} key - key ของข้อมูล
     * @param {any} value - ข้อมูลที่ต้องการบันทึก
     * @returns {boolean} สำเร็จหรือไม่
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage.set error for key "${key}":`, error);
            // ตรวจสอบ quota exceeded
            if (error.name === 'QuotaExceededError') {
                Utils.showToast('พื้นที่เก็บข้อมูลเต็ม กรุณาลบข้อมูลเก่า', 'error');
            }
            return false;
        }
    },

    /**
     * ลบข้อมูลจาก LocalStorage
     * @param {string} key - key ของข้อมูล
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Storage.remove error for key "${key}":`, error);
        }
    },

    /**
     * ล้างข้อมูลทั้งหมด
     */
    clear() {
        try {
            // เก็บเฉพาะ key ของแอพนี้
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.error('Storage.clear error:', error);
        }
    },

    // ==================== TRANSACTIONS ====================

    /**
     * ดึงรายการทั้งหมด
     * @returns {array} รายการทั้งหมด
     */
    getTransactions() {
        return this.get(this.KEYS.TRANSACTIONS) || [];
    },

    /**
     * บันทึกรายการทั้งหมด
     * @param {array} transactions - รายการ
     */
    saveTransactions(transactions) {
        return this.set(this.KEYS.TRANSACTIONS, transactions);
    },

    /**
     * เพิ่มรายการใหม่
     * @param {object} transaction - รายการที่ต้องการเพิ่ม
     * @returns {object} รายการที่เพิ่ม (พร้อม id)
     */
    addTransaction(transaction) {
        try {
            const transactions = this.getTransactions();

            // สร้าง transaction object ใหม่พร้อม id
            const newTransaction = {
                id: Utils.generateUUID(),
                type: transaction.type || 'expense',
                date: transaction.date || Utils.getTodayISO(),
                amount: parseFloat(transaction.amount) || 0,
                category: transaction.category || '',
                description: transaction.description || '',
                receipt: transaction.receipt || null,
                tags: transaction.tags || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            transactions.push(newTransaction);
            this.saveTransactions(transactions);

            return newTransaction;
        } catch (error) {
            console.error('Storage.addTransaction error:', error);
            return null;
        }
    },

    /**
     * แก้ไขรายการ
     * @param {string} id - ID ของรายการ
     * @param {object} updates - ข้อมูลที่ต้องการอัปเดต
     * @returns {object|null} รายการที่แก้ไข
     */
    updateTransaction(id, updates) {
        try {
            const transactions = this.getTransactions();
            const index = transactions.findIndex(t => String(t.id) === String(id));

            if (index === -1) {
                console.warn(`Transaction not found: ${id}`);
                return null;
            }

            // อัปเดตข้อมูล
            transactions[index] = {
                ...transactions[index],
                ...updates,
                id: transactions[index].id, // ไม่ให้เปลี่ยน id
                createdAt: transactions[index].createdAt, // ไม่ให้เปลี่ยน createdAt
                updatedAt: new Date().toISOString()
            };

            // แปลง amount เป็นตัวเลข
            if (updates.amount !== undefined) {
                transactions[index].amount = parseFloat(updates.amount) || 0;
            }

            this.saveTransactions(transactions);
            return transactions[index];
        } catch (error) {
            console.error('Storage.updateTransaction error:', error);
            return null;
        }
    },

    /**
     * ลบรายการ
     * @param {string} id - ID ของรายการ
     * @returns {boolean} สำเร็จหรือไม่
     */
    deleteTransaction(id) {
        try {
            const transactions = this.getTransactions();
            const filtered = transactions.filter(t => String(t.id) !== String(id));

            if (filtered.length === transactions.length) {
                console.warn(`Transaction not found: ${id}`);
                return false;
            }

            this.saveTransactions(filtered);
            return true;
        } catch (error) {
            console.error('Storage.deleteTransaction error:', error);
            return false;
        }
    },

    /**
     * ดึงรายการตาม ID
     * @param {string} id - ID ของรายการ
     * @returns {object|null}
     */
    getTransactionById(id) {
        const transactions = this.getTransactions();
        return transactions.find(t => String(t.id) === String(id)) || null;
    },

    /**
     * ดึงรายการตามช่วงวันที่
     * @param {string} startDate - วันเริ่มต้น (YYYY-MM-DD)
     * @param {string} endDate - วันสิ้นสุด (YYYY-MM-DD)
     * @returns {array}
     */
    getTransactionsByDateRange(startDate, endDate) {
        const transactions = this.getTransactions();
        return transactions.filter(t =>
            Utils.isDateInRange(t.date, startDate, endDate)
        );
    },

    /**
     * ดึงรายการตามเดือน
     * @param {number} year - ปี
     * @param {number} month - เดือน (0-11)
     * @returns {array}
     */
    getTransactionsByMonth(year, month) {
        const { firstDay, lastDay } = Utils.getMonthRange(year, month);
        return this.getTransactionsByDateRange(firstDay, lastDay);
    },

    /**
     * คำนวณยอดรวมรายรับ/รายจ่าย
     * @param {array} transactions - รายการ (optional, ถ้าไม่ส่งจะใช้ทั้งหมด)
     * @returns {object} { income, expense, balance }
     */
    calculateTotals(transactions = null) {
        const txs = transactions || this.getTransactions();

        const income = txs
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const expense = txs
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        return {
            income,
            expense,
            balance: income - expense
        };
    },

    /**
     * คำนวณยอดรายจ่ายตามหมวดหมู่
     * @param {array} transactions - รายการ
     * @returns {object} { category: amount }
     */
    getExpensesByCategory(transactions = null) {
        const txs = transactions || this.getTransactions();
        const expenses = txs.filter(t => t.type === 'expense');

        return expenses.reduce((result, t) => {
            const category = t.category || 'อื่นๆ';
            result[category] = (result[category] || 0) + (parseFloat(t.amount) || 0);
            return result;
        }, {});
    },

    // ==================== CATEGORIES ====================

    /**
     * ดึงหมวดหมู่ทั้งหมด
     * @returns {object} { expense: [], income: [] }
     */
    getCategories() {
        const saved = this.get(this.KEYS.CATEGORIES);
        if (saved && saved.expense && saved.income) {
            return saved;
        }
        // ใช้ค่าเริ่มต้นและบันทึก
        this.saveCategories(this.DEFAULT_CATEGORIES);
        return this.DEFAULT_CATEGORIES;
    },

    /**
     * บันทึกหมวดหมู่
     * @param {object} categories - หมวดหมู่
     */
    saveCategories(categories) {
        return this.set(this.KEYS.CATEGORIES, categories);
    },

    /**
     * ดึงหมวดหมู่ตามประเภท
     * @param {string} type - 'income' หรือ 'expense'
     * @returns {array}
     */
    getCategoriesByType(type) {
        const categories = this.getCategories();
        return categories[type] || [];
    },

    /**
     * เพิ่มหมวดหมู่ใหม่
     * @param {string} type - ประเภท ('income' หรือ 'expense')
     * @param {object} category - { name, icon }
     * @returns {object} หมวดหมู่ที่เพิ่ม
     */
    addCategory(type, category) {
        try {
            const categories = this.getCategories();

            const newCategory = {
                id: Utils.generateUUID(),
                name: category.name,
                icon: category.icon || '📌',
                type: type
            };

            categories[type].push(newCategory);
            this.saveCategories(categories);

            return newCategory;
        } catch (error) {
            console.error('Storage.addCategory error:', error);
            return null;
        }
    },

    /**
     * ลบหมวดหมู่
     * @param {string} type - ประเภท
     * @param {string} id - ID ของหมวดหมู่
     * @returns {boolean}
     */
    deleteCategory(type, id) {
        try {
            const categories = this.getCategories();
            categories[type] = categories[type].filter(c => String(c.id) !== String(id));
            this.saveCategories(categories);
            return true;
        } catch (error) {
            console.error('Storage.deleteCategory error:', error);
            return false;
        }
    },

    /**
     * หา category object จากชื่อ
     * @param {string} name - ชื่อหมวดหมู่
     * @param {string} type - ประเภท (optional)
     * @returns {object|null}
     */
    getCategoryByName(name, type = null) {
        const categories = this.getCategories();

        if (type) {
            return categories[type].find(c => c.name === name) || null;
        }

        // ค้นหาทั้งสองประเภท
        return categories.expense.find(c => c.name === name) ||
            categories.income.find(c => c.name === name) ||
            null;
    },

    // ==================== BUDGET ====================

    /**
     * ดึงข้อมูลงบประมาณ
     * @returns {object}
     */
    getBudget() {
        return this.get(this.KEYS.BUDGET) || { ...this.DEFAULT_BUDGET };
    },

    /**
     * บันทึกงบประมาณ
     * @param {object} budget
     */
    saveBudget(budget) {
        return this.set(this.KEYS.BUDGET, {
            ...this.DEFAULT_BUDGET,
            ...budget
        });
    },

    /**
     * อัปเดตงบประมาณรายเดือน
     * @param {number} amount - จำนวนเงิน
     */
    setMonthlyBudget(amount) {
        const budget = this.getBudget();
        budget.monthlyBudget = parseFloat(amount) || 0;
        this.saveBudget(budget);
    },

    /**
     * อัปเดตเกณฑ์แจ้งเตือน
     * @param {number} threshold - เปอร์เซ็นต์ (0-100)
     */
    setBudgetAlertThreshold(threshold) {
        const budget = this.getBudget();
        budget.alertThreshold = Math.min(100, Math.max(0, parseInt(threshold) || 80));
        this.saveBudget(budget);
    },

    /**
     * คำนวณสถานะงบประมาณ
     * @param {number} year - ปี
     * @param {number} month - เดือน (0-11)
     * @returns {object} { used, total, percent, status }
     */
    getBudgetStatus(year, month) {
        const budget = this.getBudget();
        const transactions = this.getTransactionsByMonth(year, month);
        const { expense } = this.calculateTotals(transactions);

        const total = budget.monthlyBudget || 0;
        const used = expense;
        const percent = total > 0 ? Utils.calculatePercent(used, total) : 0;

        let status = 'normal';
        if (percent >= 100) {
            status = 'danger';
        } else if (percent >= budget.alertThreshold) {
            status = 'warning';
        }

        return { used, total, percent, status };
    },

    // ==================== SETTINGS ====================

    /**
     * ดึงการตั้งค่า
     * @returns {object}
     */
    getSettings() {
        return this.get(this.KEYS.SETTINGS) || { ...this.DEFAULT_SETTINGS };
    },

    /**
     * บันทึกการตั้งค่า
     * @param {object} settings
     */
    saveSettings(settings) {
        return this.set(this.KEYS.SETTINGS, {
            ...this.DEFAULT_SETTINGS,
            ...settings
        });
    },

    /**
     * อัปเดตการตั้งค่าบางส่วน
     * @param {object} updates - ข้อมูลที่ต้องการอัปเดต
     */
    updateSettings(updates) {
        const settings = this.getSettings();
        this.saveSettings({ ...settings, ...updates });
    },

    /**
     * ดึง GAS URL
     * @returns {string}
     */
    getGasUrl() {
        const settings = this.getSettings();
        return settings.gasUrl || '';
    },

    /**
     * บันทึก GAS URL
     * @param {string} url
     */
    setGasUrl(url) {
        this.updateSettings({ gasUrl: url });
    },

    /**
     * บันทึกเวลา Sync ล่าสุด
     */
    updateLastSync() {
        this.updateSettings({ lastSync: new Date().toISOString() });
    },

    /**
     * ดึงเวลา Sync ล่าสุด
     * @returns {string|null}
     */
    getLastSync() {
        const settings = this.getSettings();
        return settings.lastSync || null;
    },

    // ==================== DATA EXPORT/IMPORT ====================

    /**
     * Export ข้อมูลทั้งหมด
     * @returns {object}
     */
    exportAllData() {
        return {
            transactions: this.getTransactions(),
            categories: this.getCategories(),
            budget: this.getBudget(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * Import ข้อมูลทั้งหมด (ใช้ merge strategy สำหรับ transactions)
     * @param {object} data - ข้อมูลที่ต้องการ import
     * @param {boolean} mergeTransactions - true = merge, false = overwrite (default: true)
     * @returns {boolean}
     */
    importAllData(data, mergeTransactions = true) {
        try {
            if (data.transactions) {
                if (mergeTransactions) {
                    // Merge transactions by ID และ updatedAt
                    const local = this.getTransactions();
                    const cloud = data.transactions;
                    const merged = this.mergeTransactions(local, cloud);
                    this.saveTransactions(merged);
                } else {
                    this.saveTransactions(data.transactions);
                }
            }
            if (data.categories) this.saveCategories(data.categories);
            if (data.budget) this.saveBudget(data.budget);
            if (data.settings) this.saveSettings(data.settings);
            return true;
        } catch (error) {
            console.error('Storage.importAllData error:', error);
            return false;
        }
    },

    /**
     * Merge transactions จาก local และ cloud
     * ใช้ updatedAt เพื่อตัดสินว่าข้อมูลไหนใหม่กว่า
     * @param {array} local - transactions จาก local
     * @param {array} cloud - transactions จาก cloud
     * @returns {array} merged transactions
     */
    mergeTransactions(local, cloud) {
        const merged = new Map();

        // ใส่ local ทั้งหมดก่อน
        local.forEach(t => {
            merged.set(String(t.id), t);
        });

        // Merge cloud เข้าไป
        cloud.forEach(cloudTx => {
            const id = String(cloudTx.id);
            const localTx = merged.get(id);

            if (!localTx) {
                // ไม่มีใน local - เพิ่มเข้าไป
                merged.set(id, cloudTx);
            } else {
                // มีใน local - เปรียบเทียบ updatedAt
                const localTime = new Date(localTx.updatedAt || localTx.createdAt || 0).getTime();
                const cloudTime = new Date(cloudTx.updatedAt || cloudTx.createdAt || 0).getTime();

                if (cloudTime > localTime) {
                    // Cloud ใหม่กว่า - ใช้ cloud
                    merged.set(id, cloudTx);
                }
                // ถ้า local ใหม่กว่าหรือเท่ากัน - เก็บ local ไว้
            }
        });

        return Array.from(merged.values());
    },

    /**
     * เตรียมข้อมูลสำหรับ Export CSV
     * @param {array} transactions - รายการ (optional)
     * @returns {array} ข้อมูลสำหรับ CSV
     */
    prepareCSVData(transactions = null) {
        const txs = transactions || this.getTransactions();

        return txs.map(t => ({
            'วันที่': Utils.formatDateDisplay(t.date),
            'ประเภท': t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
            'หมวดหมู่': t.category,
            'รายละเอียด': t.description || '',
            'จำนวนเงิน': t.amount,
            'แท็ก': Array.isArray(t.tags) ? t.tags.join(', ') : '',
            'วันที่สร้าง': t.createdAt
        }));
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
