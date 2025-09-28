// settings.js - إدارة الإعدادات المتقدمة لتطبيق العيادة الطبية
class SettingsManager {
    constructor() {
        this.db = clinicDB;
        this.settings = new Map();
        this.changedSettings = new Set();
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // التحقق من تهيئة قاعدة البيانات
            if (!this.db) {
                console.error('قاعدة البيانات غير مهيئة');
                return;
            }

            // تحميل جميع الإعدادات
            await this.loadAllSettings();
            
            // تهيئة واجهة المستخدم
            this.initializeUI();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            console.log('تم تهيئة مدير الإعدادات بنجاح');
        } catch (error) {
            console.error('فشل في تهيئة مدير الإعدادات:', error);
            this.showToast('فشل في تحميل الإعدادات', 'error');
        }
    }

    // تحميل جميع الإعدادات من قاعدة البيانات
    async loadAllSettings() {
        try {
            const allSettings = await this.db.getAllSettings();
            this.settings.clear();
            
            allSettings.forEach(setting => {
                this.settings.set(setting.key, setting);
            });
            
            this.populateSettingsForm();
            console.log('تم تحميل جميع الإعدادات:', this.settings.size);
        } catch (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
            throw error;
        }
    }

    // تعبئة النموذج بقيم الإعدادات
    populateSettingsForm() {
        this.settings.forEach((setting, key) => {
            const element = document.getElementById(key);
            if (element) {
                this.setElementValue(element, setting.value, setting.type);
            }
        });

        // تحديث معاينات الصور
        this.updateImagePreviews();
    }

    // تعيين قيمة العنصر بناءً على نوعه
    setElementValue(element, value, type) {
        switch (type) {
            case 'boolean':
                element.checked = Boolean(value);
                break;
            case 'number':
                element.value = Number(value);
                break;
            case 'select':
                element.value = value;
                break;
            case 'array':
                // معالجة المصفوفات (مثل طرق الدفع)
                if (element.type === 'select-multiple') {
                    const values = Array.isArray(value) ? value : [value];
                    Array.from(element.options).forEach(option => {
                        option.selected = values.includes(option.value);
                    });
                }
                break;
            case 'object':
                // معالجة الكائنات (مثل القيم الطبيعية للتحاليل)
                if (element.tagName === 'TEXTAREA') {
                    element.value = JSON.stringify(value, null, 2);
                }
                break;
            default:
                element.value = value || '';
        }
    }

    // الحصول على قيمة العنصر بناءً على نوعه
    getElementValue(element, type) {
        switch (type) {
            case 'boolean':
                return element.checked;
            case 'number':
                return Number(element.value);
            case 'select':
                return element.value;
            case 'array':
                if (element.type === 'select-multiple') {
                    return Array.from(element.selectedOptions).map(option => option.value);
                }
                return element.value.split(',').map(item => item.trim());
            case 'object':
                try {
                    return JSON.parse(element.value);
                } catch {
                    return {};
                }
            default:
                return element.value;
        }
    }

    // تحديث معاينات الصور
    updateImagePreviews() {
        this.updateImagePreview('clinic_logo', 'clinic_logo_preview');
        this.updateImagePreview('doctor_signature', 'doctor_signature_preview');
    }

    updateImagePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        if (input && preview) {
            const setting = this.settings.get(inputId);
            if (setting && setting.value) {
                // إذا كانت هناك صورة محفوظة، عرضها
                preview.innerHTML = `<img src="${setting.value}" alt="معاينة" style="max-width: 100%; max-height: 200px; border-radius: 4px;">`;
                preview.classList.add('has-image');
            }
        }
    }

    // تهيئة واجهة المستخدم
    initializeUI() {
        // فتح الأقسام النشطة
        this.openActiveSections();
        
        // إعداد معاينات الصور
        this.setupImageUploads();
        
        // إعداد البحث والتصفية
        this.setupSearchAndFilter();
    }

    // فتح الأقسام النشطة
    openActiveSections() {
        const activeSections = ['general', 'doctor'];
        activeSections.forEach(section => {
            this.toggleSection(section, true);
        });
    }

    // إعداد تحميل الصور
    setupImageUploads() {
        const imageInputs = document.querySelectorAll('.setting-file-input');
        imageInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleImageUpload(e.target);
            });
        });
    }

    // معالجة تحميل الصور
    async handleImageUpload(input) {
        const file = input.files[0];
        if (!file) return;

        const previewId = input.id + '_preview';
        const preview = document.getElementById(previewId);

        if (!file.type.startsWith('image/')) {
            this.showToast('الرجاء اختيار ملف صورة', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('حجم الصورة يجب أن يكون أقل من 5MB', 'error');
            return;
        }

        try {
            // تحويل الصورة إلى base64
            const base64 = await this.fileToBase64(file);
            preview.innerHTML = `<img src="${base64}" alt="معاينة" style="max-width: 100%; max-height: 200px; border-radius: 4px;">`;
            preview.classList.add('has-image');

            // تحديث الإعداد فوراً
            await this.updateSetting(input.id, base64);
            this.showToast('تم تحميل الصورة بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تحميل الصورة:', error);
            this.showToast('فشل في تحميل الصورة', 'error');
        }
    }

    // تحويل الملف إلى base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // إعداد البحث والتصفية
    setupSearchAndFilter() {
        const searchInput = document.getElementById('settingsSearch');
        const filterButtons = document.querySelectorAll('.filter-btn');

        // البحث في الوقت الحقيقي
        searchInput.addEventListener('input', (e) => {
            this.filterSettings(e.target.value);
        });

        // تصفية حسب التصنيف
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterByCategory(category);
                
                // تحديث الحالة النشطة للأزرار
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    // تصفية الإعدادات حسب النص
    filterSettings(searchTerm) {
        const sections = document.querySelectorAll('.settings-section');
        const term = searchTerm.toLowerCase();

        sections.forEach(section => {
            const sectionContent = section.textContent.toLowerCase();
            if (sectionContent.includes(term)) {
                section.style.display = 'block';
                
                // إبراز النتائج المتطابقة
                this.highlightMatches(section, term);
            } else {
                section.style.display = 'none';
            }
        });
    }

    // تصفية حسب التصنيف
    filterByCategory(category) {
        const sections = document.querySelectorAll('.settings-section');

        sections.forEach(section => {
            if (category === 'all' || section.dataset.category === category) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }

    // إبراز النتائج المتطابقة
    highlightMatches(section, term) {
        // تنفيذ مبسط لإبراز النتائج - يمكن تطويره باستخدام Mark.js
        const elements = section.querySelectorAll('.setting-label, .setting-description');
        elements.forEach(element => {
            const text = element.textContent;
            if (text.toLowerCase().includes(term)) {
                element.style.backgroundColor = '#fffbeb';
                element.style.border = '1px solid #f59e0b';
            }
        });
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // تتبع التغييرات في الإعدادات
        this.setupChangeTracking();
        
        // أزرار الحفظ
        this.setupSaveButtons();
        
        // الأقسام القابلة للطي
        this.setupCollapsibleSections();
    }

    // تتبع التغييرات في الإعدادات
    setupChangeTracking() {
        const inputs = document.querySelectorAll('.setting-input, .setting-select, .setting-textarea, .switch input');
        
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const settingKey = e.target.id;
                this.changedSettings.add(settingKey);
                
                // إضافة تأثير التغيير
                const settingItem = e.target.closest('.setting-item');
                if (settingItem) {
                    settingItem.classList.add('changed');
                }
            });
        });
    }

    // إعداد أزرار الحفظ
    setupSaveButtons() {
        // أزرار حفظ الأقسام
        const saveButtons = document.querySelectorAll('.btn-save-section');
        saveButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.closest('.settings-section');
                const category = section.dataset.category;
                this.saveSectionSettings(category);
            });
        });

        // زر حفظ الكل
        const saveAllButton = document.querySelector('.btn-save-all');
        if (saveAllButton) {
            saveAllButton.addEventListener('click', () => {
                this.saveAllSettings();
            });
        }
    }

    // إعداد الأقسام القابلة للطي
    setupCollapsibleSections() {
        const sectionHeaders = document.querySelectorAll('.section-header');
        sectionHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const section = e.target.closest('.settings-section');
                const sectionId = section.dataset.category;
                this.toggleSection(sectionId);
            });
        });
    }

    // تبديل حالة القسم
    toggleSection(sectionId, forceOpen = false) {
        const section = document.querySelector(`[data-category="${sectionId}"]`);
        const content = document.getElementById(`${sectionId}-section`);
        const toggleIcon = section.querySelector('.section-toggle');

        if (forceOpen || section.classList.contains('active')) {
            section.classList.remove('active');
            content.style.maxHeight = '0';
            toggleIcon.style.transform = 'rotate(0deg)';
        } else {
            section.classList.add('active');
            content.style.maxHeight = content.scrollHeight + 'px';
            toggleIcon.style.transform = 'rotate(180deg)';
        }
    }

    // حفظ إعدادات قسم معين
    async saveSectionSettings(category) {
        try {
            this.showLoading(true);
            
            const sectionSettings = Array.from(this.settings.values())
                .filter(setting => setting.category === category);
            
            const updates = [];
            const changedInSection = Array.from(this.changedSettings)
                .filter(key => {
                    const setting = this.settings.get(key);
                    return setting && setting.category === category;
                });

            if (changedInSection.length === 0) {
                this.showToast('لا توجد تغييرات لحفظها في هذا القسم', 'warning');
                return;
            }

            for (const key of changedInSection) {
                const setting = this.settings.get(key);
                const element = document.getElementById(key);
                
                if (element && setting) {
                    const newValue = this.getElementValue(element, setting.type);
                    updates.push({
                        key: key,
                        value: newValue
                    });
                }
            }

            await this.updateMultipleSettings(updates);
            this.showToast(`تم حفظ إعدادات ${this.getCategoryName(category)} بنجاح`, 'success');
            
            // إزالة علامات التغيير
            changedInSection.forEach(key => {
                this.changedSettings.delete(key);
                const element = document.getElementById(key);
                if (element) {
                    const settingItem = element.closest('.setting-item');
                    if (settingItem) {
                        settingItem.classList.remove('changed');
                    }
                }
            });

        } catch (error) {
            console.error('خطأ في حفظ إعدادات القسم:', error);
            this.showToast('فشل في حفظ الإعدادات', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // حفظ جميع الإعدادات
    async saveAllSettings() {
        try {
            this.showLoading(true);
            
            if (this.changedSettings.size === 0) {
                this.showToast('لا توجد تغييرات لحفظها', 'warning');
                return;
            }

            const updates = [];
            for (const key of this.changedSettings) {
                const setting = this.settings.get(key);
                const element = document.getElementById(key);
                
                if (element && setting) {
                    const newValue = this.getElementValue(element, setting.type);
                    updates.push({
                        key: key,
                        value: newValue
                    });
                }
            }

            await this.updateMultipleSettings(updates);
            this.showToast('تم حفظ جميع الإعدادات بنجاح', 'success');
            
            // إزالة جميع علامات التغيير
            this.changedSettings.clear();
            document.querySelectorAll('.setting-item.changed').forEach(item => {
                item.classList.remove('changed');
            });

        } catch (error) {
            console.error('خطأ في حفظ جميع الإعدادات:', error);
            this.showToast('فشل في حفظ الإعدادات', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // تحديث إعداد واحد
    async updateSetting(key, value) {
        try {
            await this.db.updateSetting(key, value, this.currentUser?.id);
            
            // تحديث القيمة المحلية
            const setting = this.settings.get(key);
            if (setting) {
                setting.value = value;
            }
            
            return true;
        } catch (error) {
            console.error(`خطأ في تحديث الإعداد ${key}:`, error);
            throw error;
        }
    }

    // تحديث عدة إعدادات مرة واحدة
    async updateMultipleSettings(updates) {
        try {
            const settingsToUpdate = updates.map(update => {
                const originalSetting = this.settings.get(update.key);
                return {
                    ...originalSetting,
                    value: update.value
                };
            });

            await this.db.updateMultipleSettings(settingsToUpdate, this.currentUser?.id);
            
            // تحديث القيم المحلية
            updates.forEach(update => {
                const setting = this.settings.get(update.key);
                if (setting) {
                    setting.value = update.value;
                }
            });

            // تطبيق التغييرات على التطبيق
            this.applySettingsChanges(updates);

            return true;
        } catch (error) {
            console.error('خطأ في تحديث الإعدادات المتعددة:', error);
            throw error;
        }
    }

    // تطبيق التغييرات على التطبيق
    applySettingsChanges(updates) {
        updates.forEach(update => {
            const setting = this.settings.get(update.key);
            if (setting) {
                this.applySingleSetting(setting.key, update.value);
            }
        });
    }

    // تطبيق إعداد واحد على التطبيق
    applySingleSetting(key, value) {
        // تطبيق التغييرات على واجهة المستخدم والتطبيق
        switch (key) {
            case 'language':
                this.changeLanguage(value);
                break;
            case 'currency':
                this.updateCurrency(value);
                break;
            case 'clinic_name':
                this.updateClinicName(value);
                break;
            case 'clinic_logo':
                this.updateClinicLogo(value);
                break;
            case 'timezone':
                this.updateTimezone(value);
                break;
            case 'session_timeout':
                this.updateSessionTimeout(value);
                break;
            // إضافة المزيد من الحالات حسب الحاجة
        }
    }

    // تغيير لغة التطبيق
    changeLanguage(language) {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        
        // إعادة تحميل النصوص المترجمة
        this.loadTranslations(language);
    }

    // تحديث عملة التطبيق
    updateCurrency(currency) {
        // تحديث عرض العملة في جميع أنحاء التطبيق
        const currencySymbols = {
            'SAR': 'ر.س',
            'USD': '$',
            'EUR': '€',
            'EGP': 'ج.م'
        };
        
        const symbol = currencySymbols[currency] || currency;
        document.documentElement.style.setProperty('--currency-symbol', `"${symbol}"`);
    }

    // تحديث اسم العيادة
    updateClinicName(name) {
        // تحديث اسم العيادة في العنوان والشعار
        document.title = `${name} - الإعدادات`;
        const titleElements = document.querySelectorAll('.clinic-name');
        titleElements.forEach(el => el.textContent = name);
    }

    // تحديث شعار العيادة
    updateClinicLogo(logoData) {
        // تحديث الشعار في التطبيق
        const logoElements = document.querySelectorAll('.clinic-logo');
        logoElements.forEach(el => {
            if (logoData) {
                el.src = logoData;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    }

    // تحديث المنطقة الزمنية
    updateTimezone(timezone) {
        // تحديث المنطقة الزمنية للتطبيق
        if (window.moment) {
            moment.tz.setDefault(timezone);
        }
    }

    // تحديث مدة الجلسة
    updateSessionTimeout(minutes) {
        // تحديث مؤقت الجلسة
        if (window.sessionManager) {
            window.sessionManager.updateTimeout(minutes);
        }
    }

    // تحميل الترجمات
    loadTranslations(language) {
        // تنفيذ تحميل الترجمات - يمكن تطويره حسب نظام الترجمة
        console.log('تحميل الترجمات للغة:', language);
    }

    // الحصول على اسم التصنيف
    getCategoryName(category) {
        const names = {
            'general': 'العامة',
            'doctor': 'الدكتور',
            'appointments': 'المواعيد',
            'billing': 'الفواتير',
            'security': 'الأمان',
            'notifications': 'الإشعارات',
            'advanced': 'المتقدمة'
        };
        return names[category] || category;
    }

    // عرض رسالة التحميل
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    // عرض الرسائل العائمة
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // إزالة الرسالة تلقائياً بعد 5 ثوانٍ
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // تصدير الإعدادات
    async exportSettings() {
        try {
            const settings = Array.from(this.settings.values());
            const dataStr = JSON.stringify(settings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `clinic-settings-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showToast('تم تصدير الإعدادات بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تصدير الإعدادات:', error);
            this.showToast('فشل في تصدير الإعدادات', 'error');
        }
    }

    // استيراد الإعدادات
    async importSettings(file) {
        try {
            const text = await this.readFileAsText(file);
            const settings = JSON.parse(text);
            
            if (!Array.isArray(settings)) {
                throw new Error('تنسيق الملف غير صحيح');
            }

            // التحقق من صحة البيانات
            const validSettings = settings.filter(setting => 
                setting && setting.key && setting.category && setting.type
            );

            await this.updateMultipleSettings(validSettings);
            await this.loadAllSettings();
            
            this.showToast('تم استيراد الإعدادات بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في استيراد الإعدادات:', error);
            this.showToast('فشل في استيراد الإعدادات', 'error');
        }
    }

    // قراءة الملف كنص
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // إعادة تعيين الإعدادات إلى الافتراضية
    async resetToDefaults() {
        if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟ سيتم فقدان جميع التغييرات غير المحفوظة.')) {
            return;
        }

        try {
            this.showLoading(true);
            
            // إعادة تعيين الإعدادات في قاعدة البيانات
            await this.db.initializeDefaultSettings();
            
            // إعادة تحميل الإعدادات
            await this.loadAllSettings();
            
            // مسح التغييرات غير المحفوظة
            this.changedSettings.clear();
            document.querySelectorAll('.setting-item.changed').forEach(item => {
                item.classList.remove('changed');
            });
            
            this.showToast('تم إعادة تعيين الإعدادات إلى الافتراضية', 'success');
        } catch (error) {
            console.error('خطأ في إعادة تعيين الإعدادات:', error);
            this.showToast('فشل في إعادة تعيين الإعدادات', 'error');
        } finally {
            this.showLoading(false);
        }
    }
}

// الدوال العامة للاستخدام في HTML
let settingsManager;

// تهيئة مدير الإعدادات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    try {
        settingsManager = new SettingsManager();
        
        // تعيين المستخدم الحالي (يمكن الحصول عليه من نظام المصادقة)
        const currentUser = await getCurrentUser();
        if (currentUser) {
            settingsManager.currentUser = currentUser;
        }
    } catch (error) {
        console.error('فشل في تهيئة نظام الإعدادات:', error);
    }
});

// دالة للعودة للخلف
function goBack() {
    if (settingsManager && settingsManager.changedSettings.size > 0) {
        if (confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة دون حفظ؟')) {
            window.history.back();
        }
    } else {
        window.history.back();
    }
}

// دالة لتبديل القسم
function toggleSection(sectionId) {
    if (settingsManager) {
        settingsManager.toggleSection(sectionId);
    }
}

// دالة لحفظ قسم معين
function saveSectionSettings(category) {
    if (settingsManager) {
        settingsManager.saveSectionSettings(category);
    }
}

// دالة لحفظ جميع الإعدادات
function saveAllSettings() {
    if (settingsManager) {
        settingsManager.saveAllSettings();
    }
}

// دالة لتصفية الإعدادات
function filterSettings() {
    if (settingsManager) {
        const searchInput = document.getElementById('settingsSearch');
        settingsManager.filterSettings(searchInput.value);
    }
}

// دالة للحصول على المستخدم الحالي (تنفيذ مؤقت)
async function getCurrentUser() {
    try {
        // محاولة الحصول على المستخدم من الجلسة النشطة
        const token = localStorage.getItem('auth_token');
        if (token && clinicDB) {
            return await clinicDB.validateSession(token);
        }
    } catch (error) {
        console.error('خطأ في الحصول على المستخدم الحالي:', error);
    }
    return null;
}

// تصدير الكلاس للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}
