// login.js - نظام تسجيل الدخول المتقدم للعيادة الطبية

// استيراد قاعدة البيانات
import storeDB from './db.js';

class LoginSystem {
    constructor() {
        this.db = storeDB; // استخدام قاعدة البيانات المستوردة
        this.isInitialized = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 دقيقة
        this.init();
    }

    async init() {
        try {
            console.log('بدء تهيئة نظام تسجيل الدخول...');
            
            await this.initializeDatabase();
            this.setupEventListeners();
            this.collectDeviceInfo();
            await this.updateSystemStats();
            this.checkOnlineStatus();
            this.isInitialized = true;
            
            console.log('تم تهيئة نظام تسجيل الدخول بنجاح');
            this.showAlert('تم تهيئة النظام بنجاح', 'success');
            
        } catch (error) {
            console.error('فشل في تهيئة نظام تسجيل الدخول:', error);
            this.showAlert('فشل في تهيئة النظام. جاري التشغيل في وضع الاستعداد...', 'warning');
            this.setupFallbackMode();
        }
    }

    // تهيئة قاعدة البيانات مع معالجة محسنة للأخطاء
    async initializeDatabase() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('محاولة الاتصال بقاعدة البيانات...');
                
                // التحقق من دعم indexedDB
                if (!window.indexedDB) {
                    throw new Error('المتصفح لا يدعم قاعدة البيانات. يرجى استخدام متصفح حديث.');
                }

                // الانتظار قليلاً لضمان تحميل قاعدة البيانات
                let attempts = 0;
                const maxAttempts = 10;
                
                const waitForDB = setInterval(() => {
                    attempts++;
                    
                    if (this.db && typeof this.db.init === 'function') {
                        clearInterval(waitForDB);
                        console.log('تم العثور على قاعدة البيانات، جاري التهيئة...');
                        
                        // تهيئة قاعدة البيانات
                        this.db.init().then(() => {
                            console.log('تم تهيئة قاعدة البيانات بنجاح');
                            resolve(true);
                        }).catch(error => {
                            console.error('فشل في تهيئة قاعدة البيانات:', error);
                            reject(error);
                        });
                        
                    } else if (attempts >= maxAttempts) {
                        clearInterval(waitForDB);
                        reject(new Error('تعذر العثور على قاعدة البيانات بعد عدة محاولات'));
                    } else {
                        console.log(`انتظار تحميل قاعدة البيانات... (المحاولة ${attempts}/${maxAttempts})`);
                    }
                }, 500);
                
            } catch (error) {
                console.error('خطأ في تهيئة قاعدة البيانات:', error);
                reject(error);
            }
        });
    }

    // إعداد وضع الاستعداد
    setupFallbackMode() {
        console.log('تفعيل وضع الاستعداد...');
        
        // تعطيل زر تسجيل الدخول
        this.setLoginButtonState('disabled');
        
        // عرض رسالة للمستخدم
        this.showAlert('النظام يعمل في وضع الاستعداد. بعض الميزات قد لا تكون متاحة.', 'warning');
        
        // إعداد تخزين محلي بسيط
        this.setupLocalStorageFallback();
    }

    // إعداد التخزين المحلي للوضع الاحتياطي
    setupLocalStorageFallback() {
        // حفظ الإعدادات الأساسية في localStorage
        const basicSettings = {
            clinic_name: 'العيادة الطبية',
            language: 'ar',
            currency: 'SAR'
        };
        
        localStorage.setItem('clinic_basic_settings', JSON.stringify(basicSettings));
        
        // إنشاء كائن قاعدة بيانات وهمي للوظائف الأساسية
        this.db = {
            login: async (username, password, deviceInfo) => {
                // تنفيذ بسيط لتسجيل الدخول في وضع عدم الاتصال
                const users = JSON.parse(localStorage.getItem('clinic_users') || '[]');
                const user = users.find(u => u.username === username && u.password === this.hashPassword(password));
                
                if (user) {
                    return {
                        user: this.sanitizeUser(user),
                        token: this.generateToken()
                    };
                } else {
                    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
                }
            },
            
            validateSession: async (token) => {
                const session = JSON.parse(localStorage.getItem('clinic_session') || '{}');
                return session.token === token ? session.user : null;
            },
            
            getAdvancedSystemStats: async () => {
                return {
                    patients: 0,
                    appointments: 0,
                    todayAppointments: 0,
                    monthlyRevenue: 0
                };
            }
        };
        
        // إنشاء مستخدم افتراضي إذا لم يكن موجوداً
        this.createFallbackUser();
    }

    // إنشاء مستخدم افتراضي للوضع الاحتياطي
    createFallbackUser() {
        const users = JSON.parse(localStorage.getItem('clinic_users') || '[]');
        
        if (users.length === 0) {
            const defaultUser = {
                id: 1,
                username: 'admin',
                password: this.hashPassword('admin123'),
                email: 'admin@clinic.com',
                role: 'doctor',
                fullName: 'طبيب العيادة',
                isActive: true,
                createdAt: new Date().toISOString()
            };
            
            users.push(defaultUser);
            localStorage.setItem('clinic_users', JSON.stringify(users));
            
            console.log('تم إنشاء مستخدم افتراضي للوضع الاحتياطي');
        }
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        try {
            const loginForm = document.getElementById('loginForm');
            const passwordToggle = document.getElementById('passwordToggle');
            const forgotPasswordLink = document.getElementById('forgotPassword');
            const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
            const cancelRecovery = document.getElementById('cancelRecovery');
            const forgotPasswordForm = document.getElementById('forgotPasswordForm');

            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            } else {
                console.error('لم يتم العثور على نموذج تسجيل الدخول');
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

            console.log('تم إعداد مستمعي الأحداث بنجاح');
        } catch (error) {
            console.error('خطأ في إعداد مستمعي الأحداث:', error);
        }
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

    // معالجة تسجيل الدخول مع تحسينات
    async handleLogin(event) {
        event.preventDefault();
        
        console.log('بدء عملية تسجيل الدخول...');

        // التحقق من حالة القفل
        if (this.isAccountLocked()) {
            const remainingTime = this.getRemainingLockoutTime();
            this.showAlert(`تم تعطيل الحساب مؤقتاً. يرجى المحاولة بعد ${remainingTime} دقائق.`, 'error');
            return;
        }

        const formData = new FormData(event.target);
        const username = formData.get('username')?.trim() || '';
        const password = formData.get('password') || '';
        const rememberMe = formData.get('rememberMe') === 'on';
        const deviceInfo = this.getDeviceInfo();

        // التحقق من الصحة الأساسية
        if (!username || !password) {
            this.showAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        // التحقق من الصحة المتقدمة
        if (!this.validateUsername(username, true) || !this.validatePassword(password, true)) {
            return;
        }

        // عرض حالة التحميل
        this.setLoginButtonState('loading');

        try {
            console.log('جاري تسجيل الدخول للمستخدم:', username);
            
            // محاولة تسجيل الدخول
            const result = await this.db.login(username, password, deviceInfo);
            
            if (result && result.user && result.token) {
                console.log('تم تسجيل الدخول بنجاح للمستخدم:', username);
                
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
                throw new Error('استجابة غير صالحة من النظام');
            }
            
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            this.handleLoginError(error, username);
        } finally {
            this.setLoginButtonState('idle');
        }
    }

    // معالجة أخطاء تسجيل الدخول
    handleLoginError(error, username) {
        this.loginAttempts++;
        
        // التحقق من عدد المحاولات
        if (this.loginAttempts >= this.maxLoginAttempts) {
            this.lockAccount();
            const remainingTime = this.getRemainingLockoutTime();
            this.showAlert(`تم تعطيل الحساب مؤقتاً. يرجى المحاولة بعد ${remainingTime} دقائق.`, 'error');
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

    // الحصول على الوقت المتبقي للقفل
    getRemainingLockoutTime() {
        const lockTime = localStorage.getItem('login_lock_time');
        if (!lockTime) return 0;

        const lockTimestamp = parseInt(lockTime);
        const currentTime = Date.now();
        const remainingTime = Math.ceil((this.lockoutTime - (currentTime - lockTimestamp)) / 60000);

        return Math.max(0, remainingTime);
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
        if (!loginBtn) return;

        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');

        switch (state) {
            case 'loading':
                loginBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnLoader) btnLoader.style.display = 'flex';
                break;
                
            case 'idle':
                loginBtn.disabled = false;
                if (btnText) btnText.style.display = 'block';
                if (btnLoader) btnLoader.style.display = 'none';
                break;
                
            case 'disabled':
                loginBtn.disabled = true;
                if (btnText) btnText.style.display = 'block';
                if (btnLoader) btnLoader.style.display = 'none';
                break;
        }
    }

    // اهتزاز النموذج
    shakeLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

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
            if (!this.db) {
                console.log('قاعدة البيانات غير متاحة، استخدام القيم الافتراضية');
                this.animateCounter('patientsCount', 1250);
                this.animateCounter('appointmentsCount', 18);
                this.animateCounter('doctorsCount', 3);
                return;
            }

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
            if (offlineMode) offlineMode.style.display = 'block';
            this.showAlert('أنت تعمل في وضع عدم الاتصال. بعض الميزات قد لا تكون متاحة.', 'warning');
        } else {
            if (offlineMode) offlineMode.style.display = 'none';
        }
    }

    // معالجة تغيير حالة الاتصال
    handleOnlineStatusChange(isOnline) {
        const offlineMode = document.getElementById('offlineMode');
        
        if (isOnline) {
            if (offlineMode) offlineMode.style.display = 'none';
            this.showToast('تم استعادة الاتصال بالإنترنت', 'success');
            
            // محاولة إعادة الاتصال بقاعدة البيانات
            this.reconnectDatabase();
        } else {
            if (offlineMode) offlineMode.style.display = 'block';
            this.showAlert('فقدان الاتصال بالإنترنت. جاري التشغيل في وضع عدم الاتصال.', 'warning');
        }
    }

    // إعادة الاتصال بقاعدة البيانات
    async reconnectDatabase() {
        try {
            if (this.db && this.db.init) {
                await this.db.init();
                this.showToast('تم إعادة الاتصال بالنظام', 'success');
                await this.updateSystemStats();
            }
        } catch (error) {
            console.error('فشل في إعادة الاتصال:', error);
        }
    }

    // إدارة نافذة استعادة كلمة المرور
    showForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        if (!modal) return;

        modal.style.display = 'flex';
        
        // التركيز على حقل الإدخال
        setTimeout(() => {
            const emailInput = document.getElementById('recoveryEmail');
            if (emailInput) emailInput.focus();
        }, 100);
    }

    hideForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        if (!modal) return;

        modal.style.display = 'none';
        
        // مسح النموذج
        const form = document.getElementById('forgotPasswordForm');
        if (form) form.reset();
    }

    // معالجة استعادة كلمة المرور
    async handlePasswordRecovery(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('recoveryEmail');
        const email = emailInput?.value.trim() || '';

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
                if (alert.parentNode === container) {
                    alert.remove();
                }
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
            setTimeout(() => {
                if (toast.parentNode === container) {
                    toast.remove();
                }
            }, 300);
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

    // دالة التشفير للوضع الاحتياطي
    hashPassword(password) {
        // تنفيذ بسيط للتشفير في الوضع الاحتياطي
        return btoa(encodeURIComponent(password));
    }

    // توليد توكن للوضع الاحتياطي
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // إزالة البيانات الحساسة من المستخدم
    sanitizeUser(user) {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    // التحقق من الجلسة الحالية
    async checkExistingSession() {
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
    }

    // مسح بيانات الجلسة
    clearSession() {
        localStorage.removeItem('clinic_session');
        sessionStorage.removeItem('clinic_session');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
    }
}

// إضافة الأنماط الديناميكية
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
        console.log('بدء تحميل نظام تسجيل الدخول...');
        loginSystem = new LoginSystem();
        
        // التحقق من وجود جلسة سابقة بعد تهيئة النظام
        setTimeout(() => {
            if (loginSystem && loginSystem.isInitialized) {
                loginSystem.checkExistingSession();
            }
        }, 1000);
        
    } catch (error) {
        console.error('فشل في تحميل نظام تسجيل الدخول:', error);
        
        // عرض رسالة خطأ للمستخدم
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert error">
                    <i class="icon-exclamation"></i>
                    <span>فشل في تحميل النظام. يرجى تحديث الصفحة أو الاتصال بالدعم الفني.</span>
                </div>
            `;
        }
    }
});

// دالة للمساعدة في التحقق من دعم indexedDB
function checkIndexedDBSupport() {
    if (!window.indexedDB) {
        console.error('هذا المتصفح لا يدعم IndexedDB');
        return false;
    }
    return true;
}

// التحقق من الدعم عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    if (!checkIndexedDBSupport()) {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert error">
                    <i class="icon-exclamation"></i>
                    <span>عذراً، متصفحك لا يدعم الميزات المطلوبة لتشغيل هذا التطبيق. يرجى استخدام متصفح حديث مثل Chrome, Firefox, أو Edge.</span>
                </div>
            `;
        }
    }
});

// تصدير النظام للاستخدام في ملفات أخرى
export default LoginSystem;
