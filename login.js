// login.js - نظام تسجيل الدخول المتقدم للعيادة الطبية
class LoginSystem {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 دقيقة
        this.init();
    }

    async init() {
        try {
            await this.initializeDatabase();
            this.setupEventListeners();
            this.collectDeviceInfo();
            this.updateSystemStats();
            this.checkOnlineStatus();
            this.isInitialized = true;
            
            console.log('تم تهيئة نظام تسجيل الدخول بنجاح');
        } catch (error) {
            console.error('فشل في تهيئة نظام تسجيل الدخول:', error);
            this.showAlert('فشل في تهيئة النظام. يرجى تحديث الصفحة.', 'error');
        }
    }

    // تهيئة قاعدة البيانات
    async initializeDatabase() {
        try {
            if (typeof clinicDB !== 'undefined') {
                this.db = clinicDB;
                
                // الانتظار حتى تكتمل تهيئة قاعدة البيانات
                await this.db.init();
                console.log('تم الاتصال بقاعدة البيانات بنجاح');
                
                // تحديث إحصائيات النظام
                await this.updateSystemStats();
                
                return true;
            } else {
                throw new Error('لم يتم العثور على قاعدة البيانات');
            }
        } catch (error) {
            console.error('خطأ في تهيئة قاعدة البيانات:', error);
            
            // وضع الاستعداد عند فشل الاتصال بقاعدة البيانات
            this.showAlert('جاري التشغيل في وضع الاستعداد...', 'warning');
            this.setupFallbackMode();
            
            throw error;
        }
    }

    // إعداد وضع الاستعداد
    setupFallbackMode() {
        // يمكن إضافة منطق للتخزين المحلي هنا
        console.log('تم تفعيل وضع الاستعداد');
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const passwordToggle = document.getElementById('passwordToggle');
        const forgotPasswordLink = document.getElementById('forgotPassword');
        const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
        const cancelRecovery = document.getElementById('cancelRecovery');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => this.togglePasswordVisibility());
        }

        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }

        if (closeForgotPasswordModal) {
            closeForgotPasswordModal.addEventListener('click', () => this.hideForgotPasswordModal());
        }

        if (cancelRecovery) {
            cancelRecovery.addEventListener('click', () => this.hideForgotPasswordModal());
        }

        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handlePasswordRecovery(e));
        }

        // مستمعي الأحداث للحقول
        this.setupInputValidation();
        
        // اكتشاف تغيير حالة الاتصال
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
        
        // إدخال لوحة المفاتيح
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // إعداد التحقق من صحة المدخلات
    setupInputValidation() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (usernameInput) {
            usernameInput.addEventListener('input', (e) => this.validateUsername(e.target.value));
            usernameInput.addEventListener('blur', (e) => this.validateUsername(e.target.value, true));
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.validatePassword(e.target.value));
            passwordInput.addEventListener('blur', (e) => this.validatePassword(e.target.value, true));
        }
    }

    // التحقق من صحة اسم المستخدم
    validateUsername(username, showFeedback = false) {
        const feedbackElement = document.querySelector('#username + .input-group + .input-feedback');
        
        if (!username.trim()) {
            if (showFeedback) {
                this.showInputFeedback(feedbackElement, 'يرجى إدخال اسم المستخدم', 'error');
            }
            return false;
        }

        if (username.length < 3) {
            if (showFeedback) {
                this.showInputFeedback(feedbackElement, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل', 'error');
            }
            return false;
        }

        this.showInputFeedback(feedbackElement, '', 'success');
        return true;
    }

    // التحقق من صحة كلمة المرور
    validatePassword(password, showFeedback = false) {
        const feedbackElement = document.querySelector('#password + .input-group + .input-feedback');
        
        if (!password) {
            if (showFeedback) {
                this.showInputFeedback(feedbackElement, 'يرجى إدخال كلمة المرور', 'error');
            }
            return false;
        }

        if (password.length < 6) {
            if (showFeedback) {
                this.showInputFeedback(feedbackElement, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            }
            return false;
        }

        this.showInputFeedback(feedbackElement, '', 'success');
        return true;
    }

    // عرض تعليقات الإدخال
    showInputFeedback(element, message, type = '') {
        if (!element) return;

        element.textContent = message;
        element.className = 'input-feedback ' + type;
    }

    // تبديل رؤية كلمة المرور
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('passwordToggle');
        const icon = toggleButton.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'icon-eye-slash';
            toggleButton.setAttribute('aria-label', 'إخفاء كلمة المرور');
        } else {
            passwordInput.type = 'password';
            icon.className = 'icon-eye';
            toggleButton.setAttribute('aria-label', 'إظهار كلمة المرور');
        }
    }

    // معالجة تسجيل الدخول
    async handleLogin(event) {
        event.preventDefault();
        
        if (!this.isInitialized) {
            this.showAlert('النظام غير مهيئ بعد. يرجى الانتظار...', 'error');
            return;
        }

        // التحقق من حالة القفل
        if (this.isAccountLocked()) {
            this.showAlert('تم تعطيل الحساب مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة. يرجى المحاولة لاحقاً.', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const username = formData.get('username').trim();
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';
        const deviceInfo = this.getDeviceInfo();

        // التحقق من الصحة
        if (!this.validateUsername(username, true) || !this.validatePassword(password, true)) {
            return;
        }

        // عرض حالة التحميل
        this.setLoginButtonState('loading');

        try {
            // محاولة تسجيل الدخول
            const result = await this.db.login(username, password, deviceInfo);
            
            if (result && result.user && result.token) {
                // حفظ بيانات الجلسة
                this.saveSession(result, rememberMe);
                
                // تسجيل نجاح تسجيل الدخول
                this.loginAttempts = 0;
                this.clearLoginLock();
                
                // عرض رسالة النجاح
                this.showAlert('تم تسجيل الدخول بنجاح! جاري التوجيه...', 'success');
                
                // التوجيه إلى الصفحة الرئيسية
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
                
            } else {
                throw new Error('استجابة غير صالحة من الخادم');
            }
            
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            this.handleLoginError(error);
        } finally {
            this.setLoginButtonState('idle');
        }
    }

    // معالجة أخطاء تسجيل الدخول
    handleLoginError(error) {
        this.loginAttempts++;
        
        // التحقق من عدد المحاولات
        if (this.loginAttempts >= this.maxLoginAttempts) {
            this.lockAccount();
            this.showAlert(`تم تعطيل الحساب مؤقتاً. يرجى المحاولة بعد ${this.lockoutTime / 60000} دقائق.`, 'error');
            return;
        }

        const remainingAttempts = this.maxLoginAttempts - this.loginAttempts;
        let errorMessage = '';

        if (error.message.includes('غير صحيحة')) {
            errorMessage = `اسم المستخدم أو كلمة المرور غير صحيحة. لديك ${remainingAttempts} محاولات متبقية.`;
        } else if (error.message.includes('غير نشط')) {
            errorMessage = 'الحساب غير نشط. يرجى التواصل مع المسؤول.';
        } else if (!navigator.onLine) {
            errorMessage = 'لا يوجد اتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.';
        } else {
            errorMessage = `فشل تسجيل الدخول. لديك ${remainingAttempts} محاولات متبقية.`;
        }

        this.showAlert(errorMessage, 'error');
        
        // اهتزاز النموذج للتأكيد البصري
        this.shakeLoginForm();
    }

    // حفظ بيانات الجلسة
    saveSession(loginResult, rememberMe) {
        const sessionData = {
            user: loginResult.user,
            token: loginResult.token,
            timestamp: Date.now(),
            rememberMe: rememberMe
        };

        // استخدام localStorage للتخزين طويل المدى إذا طلب المستخدم ذلك
        const storage = rememberMe ? localStorage : sessionStorage;
        
        storage.setItem('clinic_session', JSON.stringify(sessionData));
        storage.setItem('auth_token', loginResult.token);
        
        // أيضًا حفظ في localStorage للتحقق من الجلسة
        localStorage.setItem('last_login', new Date().toISOString());
        localStorage.setItem('user_role', loginResult.user.role);
    }

    // التحقق من حالة القفل
    isAccountLocked() {
        const lockTime = localStorage.getItem('login_lock_time');
        if (!lockTime) return false;

        const lockTimestamp = parseInt(lockTime);
        const currentTime = Date.now();

        return (currentTime - lockTimestamp) < this.lockoutTime;
    }

    // قفل الحساب
    lockAccount() {
        localStorage.setItem('login_lock_time', Date.now().toString());
        localStorage.setItem('login_attempts', this.loginAttempts.toString());
    }

    // مسح القفل
    clearLoginLock() {
        localStorage.removeItem('login_lock_time');
        localStorage.removeItem('login_attempts');
    }

    // تعيين حالة زر تسجيل الدخول
    setLoginButtonState(state) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');

        switch (state) {
            case 'loading':
                loginBtn.disabled = true;
                btnText.style.display = 'none';
                btnLoader.style.display = 'flex';
                break;
                
            case 'idle':
                loginBtn.disabled = false;
                btnText.style.display = 'block';
                btnLoader.style.display = 'none';
                break;
                
            case 'disabled':
                loginBtn.disabled = true;
                btnText.style.display = 'block';
                btnLoader.style.display = 'none';
                break;
        }
    }

    // اهتزاز النموذج
    shakeLoginForm() {
        const loginForm = document.getElementById('loginForm');
        loginForm.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            loginForm.style.animation = '';
        }, 500);
    }

    // جمع معلومات الجهاز
    collectDeviceInfo() {
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            touchSupport: 'ontouchstart' in window,
            online: navigator.onLine,
            timestamp: new Date().toISOString()
        };

        // حفظ معلومات الجهاز في الحقول المخفية
        const deviceInfoField = document.getElementById('deviceInfo');
        const screenResolutionField = document.getElementById('screenResolution');
        const browserInfoField = document.getElementById('browserInfo');

        if (deviceInfoField) deviceInfoField.value = JSON.stringify(deviceInfo);
        if (screenResolutionField) screenResolutionField.value = deviceInfo.screenResolution;
        if (browserInfoField) browserInfoField.value = deviceInfo.userAgent;

        return deviceInfo;
    }

    // الحصول على معلومات الجهاز
    getDeviceInfo() {
        const deviceInfoField = document.getElementById('deviceInfo');
        return deviceInfoField ? JSON.parse(deviceInfoField.value) : {};
    }

    // تحديث إحصائيات النظام
    async updateSystemStats() {
        try {
            if (!this.db) return;

            const stats = await this.db.getAdvancedSystemStats();
            
            // تحديث العداد المتحرك
            this.animateCounter('patientsCount', stats.patients || 0);
            this.animateCounter('appointmentsCount', stats.todayAppointments || 0);
            this.animateCounter('doctorsCount', 1); // افتراضي - يمكن جلب البيانات الحقيقية

        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
            // استخدام القيم الافتراضية في حالة الخطأ
            this.animateCounter('patientsCount', 1250);
            this.animateCounter('appointmentsCount', 18);
            this.animateCounter('doctorsCount', 3);
        }
    }

    // تحريك العداد
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const duration = 2000; // مدة التحريك بالميلي ثانية
        const step = Math.ceil(targetValue / (duration / 16)); // 60 fps
        let currentValue = 0;

        const timer = setInterval(() => {
            currentValue += step;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = this.formatNumber(currentValue);
        }, 16);
    }

    // تنسيق الأرقام
    formatNumber(num) {
        return new Intl.NumberFormat('ar-SA').format(num);
    }

    // التحقق من حالة الاتصال
    checkOnlineStatus() {
        const offlineMode = document.getElementById('offlineMode');
        
        if (!navigator.onLine) {
            offlineMode.style.display = 'block';
            this.showAlert('أنت تعمل في وضع عدم الاتصال. بعض الميزات قد لا تكون متاحة.', 'warning');
        } else {
            offlineMode.style.display = 'none';
        }
    }

    // معالجة تغيير حالة الاتصال
    handleOnlineStatusChange(isOnline) {
        const offlineMode = document.getElementById('offlineMode');
        
        if (isOnline) {
            offlineMode.style.display = 'none';
            this.showToast('تم استعادة الاتصال بالإنترنت', 'success');
            
            // محاولة إعادة الاتصال بقاعدة البيانات
            this.reconnectDatabase();
        } else {
            offlineMode.style.display = 'block';
            this.showAlert('فقدان الاتصال بالإنترنت. جاري التشغيل في وضع عدم الاتصال.', 'warning');
        }
    }

    // إعادة الاتصال بقاعدة البيانات
    async reconnectDatabase() {
        try {
            await this.initializeDatabase();
            this.showToast('تم إعادة الاتصال بالنظام', 'success');
        } catch (error) {
            console.error('فشل في إعادة الاتصال:', error);
        }
    }

    // إدارة نافذة استعادة كلمة المرور
    showForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        modal.style.display = 'flex';
        
        // التركيز على حقل الإدخال
        setTimeout(() => {
            const emailInput = document.getElementById('recoveryEmail');
            if (emailInput) emailInput.focus();
        }, 100);
    }

    hideForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        modal.style.display = 'none';
        
        // مسح النموذج
        const form = document.getElementById('forgotPasswordForm');
        if (form) form.reset();
    }

    // معالجة استعادة كلمة المرور
    async handlePasswordRecovery(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('recoveryEmail');
        const email = emailInput.value.trim();

        if (!this.validateEmail(email)) {
            this.showAlert('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }

        // في تطبيق حقيقي، هنا سيتم إرسال طلب استعادة كلمة المرور
        // هذا تنفيذ تجريبي
        this.showAlert('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني', 'success');
        this.hideForgotPasswordModal();
    }

    // التحقق من صحة البريد الإلكتروني
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // اختصارات لوحة المفاتيح
    handleKeyboardShortcuts(event) {
        // Ctrl + Enter لتسجيل الدخول
        if (event.ctrlKey && event.key === 'Enter') {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                this.handleLogin(new Event('submit'));
            }
        }

        // Escape لإغلاق النوافذ المنبثقة
        if (event.key === 'Escape') {
            this.hideForgotPasswordModal();
        }

        // Tab للتنقل بين الحقول
        if (event.key === 'Tab') {
            this.handleTabNavigation(event);
        }
    }

    // إدارة التنقل بـ Tab
    handleTabNavigation(event) {
        // يمكن إضافة منطق متقدم للتنقل هنا
    }

    // عرض التنبيهات
    showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        if (!container) return;

        // إزالة التنبيهات القديمة
        container.innerHTML = '';

        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = `
            <i class="icon-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
        `;

        container.appendChild(alert);

        // إزالة التنبيه تلقائياً بعد 5 ثوانٍ
        if (type !== 'error') {
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
    }

    // عرض الرسائل العائمة
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="icon-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // إزالة الرسالة تلقائياً بعد 5 ثوانٍ
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // الحصول على الأيقونة المناسبة لنوع التنبيه
    getAlertIcon(type) {
        const icons = {
            'success': 'check',
            'error': 'exclamation',
            'warning': 'exclamation-triangle',
            'info': 'info'
        };
        return icons[type] || 'info';
    }
}

// إضافة أنماط CSS الديناميكية
const dynamicStyles = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

@keyframes toastSlideOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-20px);
    }
}

.icon-check::before { content: "✓"; }
.icon-exclamation::before { content: "⚠"; }
.icon-exclamation-triangle::before { content: "⚠"; }
.icon-info::before { content: "ℹ"; }
.icon-eye-slash::before { content: "👁‍🗨"; }
`;

// إضافة الأنماط الديناميكية إلى الصفحة
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// تهيئة نظام تسجيل الدخول عند تحميل الصفحة
let loginSystem;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        loginSystem = new LoginSystem();
        
        // التحقق من وجود جلسة سابقة
        await loginSystem.checkExistingSession();
        
    } catch (error) {
        console.error('فشل في تحميل نظام تسجيل الدخول:', error);
    }
});

// إضافة دالة للتحقق من الجلسة الحالية
LoginSystem.prototype.checkExistingSession = async function() {
    try {
        const sessionData = localStorage.getItem('clinic_session') || sessionStorage.getItem('clinic_session');
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        
        if (sessionData && token && this.db) {
            const session = JSON.parse(sessionData);
            
            // التحقق من صلاحية الجلسة
            const user = await this.db.validateSession(token);
            if (user) {
                // توجيه تلقائي إلى لوحة التحكم
                this.showAlert('جاري استعادة جلستك...', 'info');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                // مسح الجلسة المنتهية
                this.clearSession();
            }
        }
    } catch (error) {
        console.error('خطأ في التحقق من الجلسة:', error);
        this.clearSession();
    }
};

// مسح بيانات الجلسة
LoginSystem.prototype.clearSession = function() {
    localStorage.removeItem('clinic_session');
    sessionStorage.removeItem('clinic_session');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
};

// تصدير النظام للاستخدام العالمي
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginSystem;
}
