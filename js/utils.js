/**
 * บันทึกของหมูบิว - Utility Functions
 * Version: 1.0.0
 * Helper functions สำหรับใช้ทั่วทั้งแอพ
 */

const Utils = {
    /**
     * สร้าง UUID v4 สำหรับ ID ของรายการ
     * @returns {string} UUID string
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * แปลงตัวเลขเป็นรูปแบบสกุลเงินไทย
     * @param {number} amount - จำนวนเงิน
     * @param {boolean} showSign - แสดงเครื่องหมาย +/-
     * @returns {string} ตัวเลขในรูปแบบสกุลเงิน
     */
    formatCurrency(amount, showSign = false) {
        const num = parseFloat(amount) || 0;
        const formatted = new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(Math.abs(num));

        if (showSign && num !== 0) {
            return (num > 0 ? '+' : '-') + formatted + ' ฿';
        }
        return formatted + ' ฿';
    },

    /**
     * แปลงวันที่เป็นรูปแบบไทย (เช่น 3 ก.พ. 2569)
     * @param {string|Date} date - วันที่
     * @param {boolean} showYear - แสดงปีหรือไม่
     * @returns {string} วันที่ในรูปแบบไทย
     */
    formatDateThai(date, showYear = true) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];

        const day = d.getDate();
        const month = thaiMonths[d.getMonth()];
        const year = d.getFullYear() + 543; // พ.ศ.

        return showYear ? `${day} ${month} ${year}` : `${day} ${month}`;
    },

    /**
     * แปลงวันที่เป็นเวลา (HH:mm)
     * @param {string|Date} date - วันที่
     * @returns {string} เวลาในรูปแบบ HH:mm
     */
    formatTime(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * แปลงวันที่เป็นรูปแบบ ISO (YYYY-MM-DD)
     * @param {Date} date - วันที่
     * @returns {string} วันที่ในรูปแบบ ISO
     */
    formatDateISO(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    },

    /**
     * แปลงวันที่เป็นรูปแบบแสดงผล (DD/MM/YYYY)
     * @param {string|Date} date - วันที่
     * @returns {string} วันที่ในรูปแบบแสดงผล
     */
    formatDateDisplay(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    },

    /**
     * แปลงเดือนเป็นชื่อภาษาไทย
     * @param {number} monthIndex - index ของเดือน (0-11)
     * @returns {string} ชื่อเดือนภาษาไทย
     */
    getThaiMonthName(monthIndex) {
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
            'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
            'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        return thaiMonths[monthIndex] || '';
    },

    /**
     * สร้างข้อความแสดงเดือนและปี
     * @param {number} month - เดือน (0-11)
     * @param {number} year - ปี (ค.ศ.)
     * @returns {string} เช่น "มกราคม 2569"
     */
    getMonthYearDisplay(month, year) {
        const thaiYear = year + 543;
        return `${this.getThaiMonthName(month)} ${thaiYear}`;
    },

    /**
     * ดึงวันแรกและวันสุดท้ายของเดือน
     * @param {number} year - ปี
     * @param {number} month - เดือน (0-11)
     * @returns {object} { firstDay, lastDay }
     */
    getMonthRange(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return {
            firstDay: this.formatDateISO(firstDay),
            lastDay: this.formatDateISO(lastDay)
        };
    },

    /**
     * ดึงวันที่ปัจจุบันในรูปแบบ ISO
     * @returns {string} วันที่ปัจจุบัน (YYYY-MM-DD)
     */
    getTodayISO() {
        return this.formatDateISO(new Date());
    },

    /**
     * Parse แท็กจาก string เป็น array
     * @param {string} tagString - เช่น "#อาหาร #จำเป็น"
     * @returns {array} ['อาหาร', 'จำเป็น']
     */
    parseTags(tagString) {
        if (!tagString || typeof tagString !== 'string') return [];

        return tagString
            .split(/[\s,]+/)
            .map(tag => tag.replace(/^#/, '').trim())
            .filter(tag => tag.length > 0);
    },

    /**
     * แปลง array ของแท็กเป็น string
     * @param {array} tags - ['อาหาร', 'จำเป็น']
     * @returns {string} "#อาหาร #จำเป็น"
     */
    formatTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0) return '';
        return tags.map(tag => `#${tag}`).join(' ');
    },

    /**
     * ย่อขนาดรูปภาพเป็น Base64
     * @param {File} file - ไฟล์รูปภาพ
     * @param {number} maxWidth - ความกว้างสูงสุด
     * @param {number} quality - คุณภาพ (0-1)
     * @returns {Promise<string>} Base64 string
     */
    compressImage(file, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const base64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * แสดง Toast Notification
     * @param {string} message - ข้อความ
     * @param {string} type - ประเภท (success, error, info)
     * @param {number} duration - ระยะเวลาแสดง (ms)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastEmoji = document.getElementById('toastEmoji');

        if (!toast || !toastMessage) return;

        toast.className = 'toast';
        if (type) toast.classList.add(type);
        toastMessage.textContent = message;

        // Set pig emoji based on type
        if (toastEmoji) {
            if (type === 'success') {
                toastEmoji.textContent = '🐷✨'; // Happy pig
            } else if (type === 'error') {
                toastEmoji.textContent = '🐷💔'; // Sad pig
            } else {
                toastEmoji.textContent = '🐷'; // Normal pig
            }
        }

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    /**
     * แสดง Confetti Celebration Effect
     * @param {number} count - จำนวน confetti (default 50)
     */
    showConfetti(count = 50) {
        const container = document.getElementById('confettiContainer');
        if (!container) return;

        // Pastel colors for confetti
        const colors = [
            '#FFB7B2', '#B5EAD7', '#C7B8EA', '#FFEAA7',
            '#FFD6D3', '#B8D4E3', '#FFDAB9', '#DCD6F7'
        ];

        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 1 + 2.5) + 's';

            // Random rotation for variety
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            container.appendChild(confetti);
        }

        // Auto cleanup after 3.5 seconds
        setTimeout(() => {
            container.innerHTML = '';
        }, 3500);
    },

    /**
     * แสดง/ซ่อน Loading Overlay
     * @param {boolean} show - แสดงหรือซ่อน
     * @param {string} text - ข้อความ (optional)
     */
    showLoading(show, text = 'กำลังโหลด...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay?.querySelector('.loading-text');

        if (!overlay) return;

        if (show) {
            if (loadingText) loadingText.textContent = text;
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    },

    /**
     * แสดง Modal
     * @param {string} modalId - ID ของ modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    /**
     * ซ่อน Modal
     * @param {string} modalId - ID ของ modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Debounce function
     * @param {function} func - ฟังก์ชันที่ต้องการ debounce
     * @param {number} wait - เวลารอ (ms)
     * @returns {function}
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Deep clone object
     * @param {object} obj - object ที่ต้องการ clone
     * @returns {object}
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * เปรียบเทียบวันที่ (ไม่รวมเวลา)
     * @param {string|Date} date1
     * @param {string|Date} date2
     * @returns {number} -1, 0, 1
     */
    compareDates(date1, date2) {
        const d1 = new Date(date1).setHours(0, 0, 0, 0);
        const d2 = new Date(date2).setHours(0, 0, 0, 0);

        if (d1 < d2) return -1;
        if (d1 > d2) return 1;
        return 0;
    },

    /**
     * ตรวจสอบว่าวันที่อยู่ในช่วงที่กำหนดหรือไม่
     * @param {string} date - วันที่ที่ต้องการตรวจสอบ
     * @param {string} startDate - วันเริ่มต้น
     * @param {string} endDate - วันสิ้นสุด
     * @returns {boolean}
     */
    isDateInRange(date, startDate, endDate) {
        const d = new Date(date).setHours(0, 0, 0, 0);
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(0, 0, 0, 0);

        return d >= start && d <= end;
    },

    /**
     * คำนวณเปอร์เซ็นต์
     * @param {number} value - ค่าที่ต้องการคำนวณ
     * @param {number} total - ค่ารวม
     * @returns {number} เปอร์เซ็นต์ (0-100)
     */
    calculatePercent(value, total) {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    },

    /**
     * สีสำหรับแต่ละหมวดหมู่ (ใช้กับกราฟ)
     */
    categoryColors: [
        '#FF8FAB', // ชมพู
        '#A8E6CF', // เขียว
        '#FFD6E8', // ชมพูอ่อน
        '#FFDFBA', // ส้ม
        '#B4E4FF', // ฟ้า
        '#DCD6F7', // ม่วง
        '#F7D6E0', // โรส
        '#C9E4DE', // มิ้นท์
        '#FFB3BA', // แดงอ่อน
        '#FFDAC1', // พีช
    ],

    /**
     * ดึงสีสำหรับหมวดหมู่
     * @param {number} index - index ของหมวดหมู่
     * @returns {string} สีในรูปแบบ hex
     */
    getCategoryColor(index) {
        return this.categoryColors[index % this.categoryColors.length];
    },

    /**
     * Export ข้อมูลเป็นไฟล์ CSV
     * @param {array} data - ข้อมูลที่ต้องการ export
     * @param {string} filename - ชื่อไฟล์
     */
    exportCSV(data, filename = 'export.csv') {
        if (!data || data.length === 0) {
            this.showToast('ไม่มีข้อมูลที่จะ Export', 'error');
            return;
        }

        // สร้าง CSV content
        const headers = Object.keys(data[0]);
        const csvContent = [
            // BOM for UTF-8
            '\uFEFF',
            // Headers
            headers.join(','),
            // Data rows
            ...data.map(row =>
                headers.map(header => {
                    let value = row[header];
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof value === 'string') {
                        value = value.replace(/"/g, '""');
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            value = `"${value}"`;
                        }
                    }
                    return value ?? '';
                }).join(',')
            )
        ].join('\n');

        // สร้างและดาวน์โหลดไฟล์
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);

        this.showToast('Export สำเร็จ!', 'success');
    },

    /**
     * ตรวจสอบว่าออนไลน์หรือไม่
     * @returns {boolean}
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * จัดกลุ่มข้อมูลตาม key
     * @param {array} array - ข้อมูลที่ต้องการจัดกลุ่ม
     * @param {string} key - key ที่ใช้จัดกลุ่ม
     * @returns {object}
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = item[key];
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {});
    },

    /**
     * เรียงลำดับ array ตาม key
     * @param {array} array - ข้อมูล
     * @param {string} key - key ที่ใช้เรียง
     * @param {string} order - 'asc' หรือ 'desc'
     * @returns {array}
     */
    sortBy(array, key, order = 'desc') {
        return [...array].sort((a, b) => {
            const valueA = a[key];
            const valueB = b[key];

            if (order === 'asc') {
                return valueA > valueB ? 1 : -1;
            }
            return valueA < valueB ? 1 : -1;
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
