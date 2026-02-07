# แผนพัฒนา "บันทึกของหมูบิว" - Personal Finance Tracker

## สถานะการพัฒนาปัจจุบัน (3 ก.พ. 2569)

### ไฟล์ที่สร้างแล้ว:
- [x] `index.html` - โครงสร้าง UI ทั้ง 6 หน้า (Dashboard, Add, Transactions, Reports, Settings, Categories)
- [x] `css/main.css` - Styles ครบถ้วน (Light/Dark Theme, Responsive)
- [x] `js/utils.js` - Helper Functions (UUID, Format, Toast, Modal, etc.)
- [x] `js/storage.js` - LocalStorage Management (CRUD Transactions, Categories, Budget, Settings)
- [x] `js/sync.js` - Google Sheets Sync (Push/Pull)
- [ ] `js/app.js` - **กำลังทำ** - Main Logic + Event Handlers + Charts
- [ ] `manifest.json` - PWA Manifest
- [ ] `sw.js` - Service Worker
- [ ] `google-apps-script/Code.gs` - Google Apps Script Backend

### โฟลเดอร์ที่สร้างแล้ว:
- `css/`
- `js/`
- `images/`
- `google-apps-script/`

---

## ข้อมูลโปรเจค

### ชื่อแอพ: บันทึกของหมูบิว
### เป้าหมาย: Webapp บันทึกรายรับรายจ่ายส่วนบุคคล
### เทคโนโลยี: PWA + Google Apps Script + Google Sheets
### UI Style: Cute & Friendly (ฟอนต์ 'Mali' จาก Google Fonts)
### ผู้ใช้: คนเดียว (Personal) - ไม่ต้องมี Login

---

## ฟีเจอร์ที่ต้องทำ

### 1. Dashboard (หน้าแรก)
- แสดงยอดรวมรายรับ/รายจ่าย/คงเหลือ ประจำเดือน
- Month Picker เลือกเดือน/ปี
- Budget Progress Bar + แจ้งเตือน 80%
- กราฟ Pie Chart สัดส่วนรายจ่าย
- รายการล่าสุด 5 รายการ
- ปุ่ม Quick Add

### 2. บันทึกรายรับ-รายจ่าย
- ประเภท: รายรับ/รายจ่าย (Toggle)
- วันที่: Date Picker (Flatpickr)
- จำนวนเงิน: Input Number
- หมวดหมู่: Dropdown
- รายละเอียด: Text Input
- แนบใบเสร็จ: Upload Image (Base64)
- แท็ก: Optional

### 3. รายการทั้งหมด
- แสดงรายการย้อนหลัง
- กรอง: ช่วงวัน, ประเภท, หมวดหมู่
- แก้ไข/ลบรายการ
- แสดงยอดรวมที่กรอง

### 4. รายงานและกราฟ
- Pie Chart: สัดส่วนหมวดหมู่
- Bar Chart: รายรับ vs รายจ่าย
- Line Chart: แนวโน้มรายวัน
- Top 10 รายจ่าย
- Export CSV

### 5. ตั้งค่า
- งบประมาณรายเดือน
- จัดการหมวดหมู่
- Light/Dark Theme
- Sync กับ Google Sheets
- ล้างข้อมูล

---

## หมวดหมู่เริ่มต้น

### รายจ่าย:
1. 🍜 อาหารและเครื่องดื่ม
2. 🚗 ค่าเดินทาง
3. 🏠 ค่าที่พัก
4. 🛒 ช้อปปิ้ง
5. 💊 สุขภาพ
6. 🎮 บันเทิง
7. 📚 การศึกษา
8. 💰 อื่นๆ

### รายรับ:
1. 💼 เงินเดือน
2. 💸 รายได้เสริม
3. 🎁 ของขวัญ/โบนัส
4. 💰 อื่นๆ

---

## โครงสร้างข้อมูล (Data Schema)

### Transaction Object:
```json
{
  "id": "uuid-string",
  "type": "income|expense",
  "date": "2026-02-03",
  "amount": 120.50,
  "category": "อาหารและเครื่องดื่ม",
  "description": "ข้าวเที่ยง",
  "receipt": "base64-image-data",
  "tags": ["อาหาร", "ฉุกเฉิน"],
  "createdAt": "2026-02-03T10:30:00Z",
  "updatedAt": "2026-02-03T10:30:00Z"
}
```

### Budget Object:
```json
{
  "monthlyBudget": 20000,
  "alertThreshold": 80,
  "categoryBudgets": {}
}
```

### Settings Object:
```json
{
  "gasUrl": "",
  "darkMode": false,
  "notifications": true,
  "lastSync": null
}
```

### LocalStorage Keys:
- `mubew_transactions`
- `mubew_categories`
- `mubew_budget`
- `mubew_settings`

---

## Color Palette (CSS Variables)

```css
--primary: #FF8FAB (ชมพูหวาน)
--primary-dark: #E57A96
--primary-light: #FFB3C6
--secondary: #FFD6E8

--success: #A8E6CF (เขียว - รายรับ)
--danger: #FFB3BA (แดง - รายจ่าย)
--warning: #FFDFBA (ส้ม)

--income-color: #7DD3AE
--expense-color: #E89A9A

--bg-light: #FFF9FB
--text-dark: #4A4A4A
```

---

## ไฟล์ที่ยังต้องสร้าง

### 1. js/app.js (Main Logic)
ต้องมี:
- `App.init()` - เริ่มต้นแอพ
- `App.navigateTo(page)` - สลับหน้า
- `App.refresh()` - รีเฟรช UI
- Dashboard functions (updateSummary, updateChart, updateRecentList)
- Transaction form handlers (save, edit, delete)
- Filter functions
- Chart.js integration (Pie, Bar, Line)
- Categories management
- Budget management
- Settings management
- Event listeners ทั้งหมด

### 2. manifest.json
```json
{
  "name": "บันทึกของหมูบิว",
  "short_name": "หมูบิว",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#FFF9FB",
  "theme_color": "#FF8FAB",
  "icons": [
    { "src": "images/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "images/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 3. sw.js (Service Worker)
- Cache Name: `mubew-cache-v1`
- Cache Strategy: Network First สำหรับ index.html, app.js
- Cache files: HTML, CSS, JS, Fonts, Icons
- Offline fallback

### 4. google-apps-script/Code.gs
```javascript
// doPost(e) - รับข้อมูลจาก Frontend
// doGet(e) - ส่งข้อมูลกลับ Frontend
// saveToSheet(data) - บันทึกลง Sheet
// getFromSheet() - อ่านจาก Sheet
// clearSheet() - ล้าง Sheet (ใช้ Clear & Overwrite strategy)
```

### 5. images/
- icon-192.png (PWA icon)
- icon-512.png (PWA icon)
- logo.svg (optional)

---

## กฎสำคัญ (จาก SKILL.md)

1. **Type Safety:** ID ต้องเป็น String เสมอ - ใช้ `String(item.id)` ตอน pullFromCloud
2. **Version Bumping:** ทุกครั้งที่แก้ JS ให้เปลี่ยน CACHE_NAME ใน sw.js
3. **Error Handling:** ครอบ try-catch ในทุกฟังก์ชันสำคัญ
4. **GAS Deployment:** ต้อง New Deployment ทุกครั้งที่แก้ Code.gs
5. **Sync Strategy:** ใช้ Clear & Overwrite, LocalStorage เป็น Source of Truth
6. **Font:** ใช้ 'Mali' จาก Google Fonts

---

## ขั้นตอนต่อไป

1. **สร้าง app.js** - ไฟล์หลักที่ควบคุมทั้งแอพ
2. **สร้าง manifest.json** - PWA config
3. **สร้าง sw.js** - Service Worker
4. **สร้าง Code.gs** - Google Apps Script
5. **สร้าง PWA icons** - รูป 192x192 และ 512x512
6. **ทดสอบ** - ทดสอบทุกฟังก์ชัน
7. **Deploy** - Host บน GitHub Pages หรือ Vercel

---

## Libraries ที่ใช้ (CDN)

```html
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Flatpickr (Date Picker) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/th.js"></script>

<!-- Google Fonts - Mali -->
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## หมายเหตุสำหรับ Session ถัดไป

1. เริ่มจากสร้าง `app.js` ต่อ
2. อ้างอิง index.html สำหรับ element IDs
3. อ้างอิง storage.js สำหรับ data functions
4. อ้างอิง utils.js สำหรับ helper functions
5. อ้างอิง sync.js สำหรับ sync functions
6. ใช้ Chart.js สำหรับกราฟ (Pie, Bar, Line)
7. ใช้ Flatpickr สำหรับ Date Picker

---

**สร้างโดย:** Claude Code
**วันที่:** 3 กุมภาพันธ์ 2569
