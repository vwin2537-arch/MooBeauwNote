/**
 * บันทึกของหมูบิว - Sync Module
 * Version: 1.0.0
 * จัดการการ Sync ข้อมูลกับ Google Sheets ผ่าน Google Apps Script
 */

const Sync = {
    // สถานะการ Sync
    STATUS: {
        IDLE: 'idle',
        SYNCING: 'syncing',
        SUCCESS: 'success',
        ERROR: 'error'
    },

    // สถานะปัจจุบัน
    currentStatus: 'idle',

    /**
     * ตรวจสอบว่ามี GAS URL หรือไม่
     * @returns {boolean}
     */
    hasGasUrl() {
        const url = Storage.getGasUrl();
        return url && url.trim().length > 0;
    },

    /**
     * ตรวจสอบว่าออนไลน์และมี GAS URL
     * @returns {boolean}
     */
    canSync() {
        return Utils.isOnline() && this.hasGasUrl();
    },

    /**
     * อัปเดตสถานะ Sync บน UI
     * @param {string} status - สถานะ
     */
    updateSyncStatus(status) {
        this.currentStatus = status;
        const statusEl = document.getElementById('syncStatus');

        if (!statusEl) return;

        // ล้าง class เก่า
        statusEl.classList.remove('syncing', 'error', 'success');

        switch (status) {
            case this.STATUS.SYNCING:
                statusEl.classList.add('syncing');
                statusEl.innerHTML = '<span class="sync-icon">↻</span>';
                statusEl.title = 'กำลัง Sync...';
                break;
            case this.STATUS.SUCCESS:
                statusEl.classList.add('success');
                statusEl.innerHTML = '<span class="sync-icon">✓</span>';
                statusEl.title = 'Sync สำเร็จ';
                break;
            case this.STATUS.ERROR:
                statusEl.classList.add('error');
                statusEl.innerHTML = '<span class="sync-icon">✗</span>';
                statusEl.title = 'Sync ล้มเหลว';
                break;
            default:
                statusEl.innerHTML = '<span class="sync-icon">✓</span>';
                statusEl.title = 'พร้อม Sync';
        }
    },

    /**
     * อัปเดตเวลา Sync ล่าสุดบน UI
     */
    updateLastSyncDisplay() {
        const lastSync = Storage.getLastSync();
        const el = document.getElementById('lastSyncTime');

        if (!el) return;

        if (!lastSync) {
            el.textContent = 'ยังไม่เคย Sync';
            return;
        }

        const syncDate = new Date(lastSync);
        const now = new Date();
        const diffMs = now - syncDate;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
            el.textContent = 'Sync ล่าสุด: เมื่อสักครู่';
        } else if (diffMins < 60) {
            el.textContent = `Sync ล่าสุด: ${diffMins} นาทีที่แล้ว`;
        } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            el.textContent = `Sync ล่าสุด: ${hours} ชั่วโมงที่แล้ว`;
        } else {
            el.textContent = `Sync ล่าสุด: ${Utils.formatDateThai(syncDate)}`;
        }
    },

    /**
     * Push ข้อมูลไปยัง Google Sheets
     * @returns {Promise<boolean>}
     */
    async pushToCloud() {
        if (!this.canSync()) {
            if (!Utils.isOnline()) {
                Utils.showToast('ไม่มีการเชื่อมต่ออินเทอร์เน็ต', 'error');
            } else {
                Utils.showToast('กรุณาตั้งค่า Google Apps Script URL ก่อน', 'error');
            }
            return false;
        }

        try {
            this.updateSyncStatus(this.STATUS.SYNCING);

            const gasUrl = Storage.getGasUrl();
            const payload = {
                action: 'push',
                data: Storage.exportAllData()
            };

            // ใช้วิธี Form POST แทน fetch เพื่อหลีกเลี่ยงปัญหา CORS
            const result = await this.postToGAS(gasUrl, payload);

            if (result) {
                Storage.updateLastSync();
                this.updateSyncStatus(this.STATUS.SUCCESS);
                this.updateLastSyncDisplay();
                Utils.showToast('Sync สำเร็จ!', 'success');
                return true;
            } else {
                throw new Error('ไม่ได้รับการตอบกลับจาก Server');
            }
        } catch (error) {
            console.error('Sync.pushToCloud error:', error);
            this.updateSyncStatus(this.STATUS.ERROR);
            Utils.showToast('Sync ล้มเหลว: ' + error.message, 'error');
            return false;
        }
    },

    /**
     * ส่งข้อมูลไปยัง GAS ด้วย Form POST ผ่าน Hidden iframe
     * วิธีนี้ไม่มีปัญหา CORS และทำงานได้กับ GAS Web App
     * @param {string} url 
     * @param {object} payload 
     * @returns {Promise<boolean>}
     */
    postToGAS(url, payload) {
        return new Promise((resolve, reject) => {
            // ลอง fetch แบบ no-cors ก่อน ถ้ามี Error ค่อย fallback
            fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            })
                .then(() => {
                    // no-cors ไม่สามารถ verify response ได้ ถือว่าสำเร็จถ้าไม่ throw
                    console.log('POST sent successfully (no-cors mode)');
                    resolve(true);
                })
                .catch((error) => {
                    console.error('fetch error, trying fallback:', error);
                    // Fallback: ใช้ navigator.sendBeacon
                    if (navigator.sendBeacon) {
                        const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
                        const success = navigator.sendBeacon(url, blob);
                        if (success) {
                            console.log('sendBeacon success');
                            resolve(true);
                        } else {
                            reject(new Error('sendBeacon failed'));
                        }
                    } else {
                        reject(error);
                    }
                });
        });
    },

    /**
     * Pull ข้อมูลจาก Google Sheets
     * @returns {Promise<boolean>}
     */
    async pullFromCloud() {
        if (!this.canSync()) {
            if (!Utils.isOnline()) {
                Utils.showToast('ไม่มีการเชื่อมต่ออินเทอร์เน็ต', 'error');
            } else {
                Utils.showToast('กรุณาตั้งค่า Google Apps Script URL ก่อน', 'error');
            }
            return false;
        }

        try {
            this.updateSyncStatus(this.STATUS.SYNCING);
            Utils.showLoading(true, 'กำลังโหลดข้อมูลจาก Cloud...');

            const gasUrl = Storage.getGasUrl();

            // ใช้ JSONP-like approach ผ่าน doGet
            const url = `${gasUrl}?action=pull&callback=handlePullResponse&t=${Date.now()}`;

            // เพิ่ม timeout 15 วินาที
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            let response;
            try {
                response = await fetch(url, { signal: controller.signal });
            } catch (err) {
                if (err.name === 'AbortError') {
                    throw new Error('หมดเวลาการเชื่อมต่อ (Timeout)');
                }
                throw err;
            } finally {
                clearTimeout(timeoutId);
            }

            const text = await response.text();

            // Parse JSON จาก response
            // GAS ควร return JSON โดยตรง
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // ลอง extract JSON จาก JSONP format
                const match = text.match(/handlePullResponse\((.*)\)/);
                if (match) {
                    data = JSON.parse(match[1]);
                } else {
                    throw new Error('Invalid response format');
                }
            }

            if (data.error) {
                throw new Error(data.error);
            }

            // บังคับแปลง ID เป็น String (ตาม SKILL.md)
            if (data.transactions) {
                data.transactions = data.transactions.map(t => ({
                    ...t,
                    id: String(t.id),
                    amount: parseFloat(t.amount) || 0
                }));
            }

            // Import ข้อมูล
            Storage.importAllData(data);

            Storage.updateLastSync();
            this.updateSyncStatus(this.STATUS.SUCCESS);
            this.updateLastSyncDisplay();
            Utils.showLoading(false);
            Utils.showToast('โหลดข้อมูลจาก Cloud สำเร็จ!', 'success');

            // Refresh UI
            if (typeof App !== 'undefined' && App.refresh) {
                App.refresh();
            }

            return true;
        } catch (error) {
            console.error('Sync.pullFromCloud error:', error);
            this.updateSyncStatus(this.STATUS.ERROR);
            Utils.showLoading(false);
            Utils.showToast('โหลดข้อมูลล้มเหลว: ' + error.message, 'error');
            return false;
        }
    },

    /**
     * Sync แบบ Auto (Push เมื่อมีการเปลี่ยนแปลง)
     * ใช้ debounce เพื่อไม่ให้ sync บ่อยเกินไป
     */
    autoSync: Utils.debounce(async function () {
        if (Sync.canSync()) {
            await Sync.pushToCloud();
        }
    }, 3000), // รอ 3 วินาทีหลังจากมีการเปลี่ยนแปลง (เร็วขึ้นหน่อย)

    /**
     * เริ่มต้น Auto Sync เมื่อมีการเปลี่ยนแปลงข้อมูล
     */
    initAutoSync() {
        // Listen สำหรับ storage changes
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('mubew_')) {
                this.autoSync();
            }
        });

        // Listen สำหรับ online/offline
        window.addEventListener('online', () => {
            Utils.showToast('กลับมาออนไลน์แล้ว', 'success');
            this.updateSyncStatus(this.STATUS.IDLE);
            // Sync เมื่อกลับมาออนไลน์
            this.autoSync();
        });

        window.addEventListener('offline', () => {
            Utils.showToast('ขาดการเชื่อมต่อ - ข้อมูลจะ Sync เมื่อกลับมาออนไลน์', 'error');
            this.updateSyncStatus(this.STATUS.ERROR);
        });

        // อัปเดตสถานะเริ่มต้น
        if (!Utils.isOnline()) {
            this.updateSyncStatus(this.STATUS.ERROR);
        }

        this.updateLastSyncDisplay();
    },

    /**
     * Trigger Auto Sync (เรียกจากที่อื่นเมื่อมีการเปลี่ยนแปลง)
     */
    triggerAutoSync() {
        this.autoSync();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sync;
}
