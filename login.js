import storeDB from './db.js';

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة متغيرات DOM
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const loginButton = document.getElementById('loginButton');
    const buttonLoader = document.getElementById('buttonLoader');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
    const cancelRecovery = document.getElementById('cancelRecovery');
    const sendRecovery = document.getElementById('sendRecovery');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    // التحقق من البيانات المحفوظة
    checkRememberedUser();
    
    // إضافة مستمعي الأحداث
    loginForm.addEventListener('submit', handleLogin);
    togglePassword.addEventListener('click', togglePasswordVisibility);
    forgotPasswordLink.addEventListener('click', openForgotPasswordModal);
    closeForgotPasswordModal.addEventListener('click', closeModal);
    cancelRecovery.addEventListener('click', closeModal);
    sendRecovery.addEventListener('click', handlePasswordRecovery);
    
    // التحقق من صحة الحقول أثناء الكتابة
    usernameInput.addEventListener('input', validateUsername);
    passwordInput.addEventListener('input', validatePassword);
    
    // إغلاق النافذة المنبثقة بالنقر خارجها
    window.addEventListener('click', function(event) {
        if (event.target === forgotPasswordModal) {
            closeModal();
        }
    });
    
    // وظيفة التحقق من اسم المستخدم
    function validateUsername() {
        const username = usernameInput.value.trim();
        const errorElement = document.getElementById('usernameError');
        
        if (username.length < 3) {
            showError(errorElement, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
            return false;
        } else {
            hideError(errorElement);
            return true;
        }
    }
    
    // وظيفة التحقق من كلمة المرور
    function validatePassword() {
        const password = passwordInput.value;
        const errorElement = document.getElementById('passwordError');
        
        if (password.length < 6) {
            showError(errorElement, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return false;
        } else {
            hideError(errorElement);
            return true;
        }
    }
    
    // وظيفة تسجيل الدخول - معدلة لحفظ التوكن
    async function handleLogin(event) {
        event.preventDefault();
        
        // التحقق من صحة البيانات
        const isUsernameValid = validateUsername();
        const isPasswordValid = validatePassword();
        
        if (!isUsernameValid || !isPasswordValid) {
            return;
        }
        
        // عرض حالة التحميل
        showLoadingState(true);
        
        try {
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // الحصول على معلومات الجهاز
            const deviceInfo = getDeviceInfo();
            
            console.log('جاري محاولة تسجيل الدخول...');
            
            // محاولة تسجيل الدخول
            const result = await storeDB.login(username, password, deviceInfo);
            
            console.log('تم تسجيل الدخول بنجاح:', result);
            
            // ✅ حفظ التوكن وبيانات المستخدم في localStorage
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userId', result.user.id);
            localStorage.setItem('userData', JSON.stringify(result.user));
            
            // حفظ بيانات المستخدم إذا طلب تذكر البيانات
            if (rememberMe) {
                localStorage.setItem('rememberedUser', username);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberedUser');
                localStorage.removeItem('rememberMe');
            }
            
            // حفظ وقت تسجيل الدخول
            localStorage.setItem('loginTime', new Date().toISOString());
            
            console.log('تم حفظ البيانات في localStorage:', {
                token: result.token,
                userId: result.user.id,
                rememberMe: rememberMe
            });
            
            // عرض رسالة الترحيب
            showWelcomeMessage();
            
            // الانتقال إلى لوحة التحكم بعد تأخير
            setTimeout(() => {
                console.log('جارٍ التوجيه إلى لوحة التحكم...');
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            // عرض رسالة الخطأ
            showLoginError(error.message);
        } finally {
            // إخفاء حالة التحميل
            showLoadingState(false);
        }
    }
    
    // وظيفة تبديل رؤية كلمة المرور
    function togglePasswordVisibility() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = togglePassword.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    }
    
    // وظيفة فتح نافذة استعادة كلمة المرور
    function openForgotPasswordModal(event) {
        event.preventDefault();
        forgotPasswordModal.classList.add('show');
    }
    
    // وظيفة إغلاق النافذة المنبثقة
    function closeModal() {
        forgotPasswordModal.classList.remove('show');
    }
    
    // وظيفة استعادة كلمة المرور
    async function handlePasswordRecovery() {
        const emailInput = document.getElementById('recoveryEmail');
        const email = emailInput.value.trim();
        
        if (!email) {
            alert('يرجى إدخال البريد الإلكتروني');
            return;
        }
        
        // التحقق من صحة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('يرجى إدخال بريد إلكتروني صحيح');
            return;
        }
        
        try {
            // التحقق من وجود مستخدم بهذا البريد الإلكتروني
            const user = await storeDB.getByIndex('users', 'email', email);
            if (!user) {
                alert('لا يوجد حساب مرتبط بهذا البريد الإلكتروني');
                return;
            }
            
            // في تطبيق حقيقي، هنا سيتم إرسال طلب استعادة كلمة المرور
            // للمخدم أو إرسال بريد إلكتروني
            
            // محاكاة إرسال البريد الإلكتروني
            showRecoverySuccess();
            
        } catch (error) {
            console.error('خطأ في استعادة كلمة المرور:', error);
            alert('حدث خطأ أثناء محاولة استعادة كلمة المرور. يرجى المحاولة مرة أخرى.');
        }
    }
    
    // وظيفة عرض نجاح استعادة كلمة المرور
    function showRecoverySuccess() {
        const emailInput = document.getElementById('recoveryEmail');
        const email = emailInput.value.trim();
        
        alert(`تم إرسال رابط استعادة كلمة المرور إلى ${email}\n\nيرجى التحقق من بريدك الإلكتروني ومتابعة التعليمات.`);
        closeModal();
        emailInput.value = '';
    }
    
    // وظيفة التحقق من المستخدم المحفوظ
    function checkRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        const rememberMe = localStorage.getItem('rememberMe');
        
        if (rememberedUser && rememberMe === 'true') {
            usernameInput.value = rememberedUser;
            document.getElementById('rememberMe').checked = true;
        }
    }
    
    // وظيفة عرض رسالة الخطأ
    function showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // إضافة تأثير اهتزاز للحقل
        const input = errorElement.previousElementSibling;
        if (input && input.classList.contains('password-container')) {
            input = input.querySelector('input');
        }
        
        if (input) {
            input.style.animation = 'shake 0.5s';
            setTimeout(() => {
                input.style.animation = '';
            }, 500);
        }
    }
    
    // وظيفة إخفاء رسالة الخطأ
    function hideError(errorElement) {
        errorElement.classList.remove('show');
    }
    
    // وظيفة عرض حالة التحميل
    function showLoadingState(isLoading) {
        const buttonText = loginButton.querySelector('.button-text');
        
        if (isLoading) {
            buttonText.textContent = 'جاري تسجيل الدخول...';
            buttonLoader.classList.add('show');
            loginButton.disabled = true;
            loginButton.style.opacity = '0.7';
        } else {
            buttonText.textContent = 'تسجيل الدخول';
            buttonLoader.classList.remove('show');
            loginButton.disabled = false;
            loginButton.style.opacity = '1';
        }
    }
    
    // وظيفة عرض خطأ تسجيل الدخول
    function showLoginError(message) {
        // عرض رسالة الخطأ في حقل كلمة المرور
        const errorElement = document.getElementById('passwordError');
        showError(errorElement, message);
        
        // إضافة تأثير اهتزاز للحقول
        usernameInput.style.animation = 'shake 0.5s';
        passwordInput.style.animation = 'shake 0.5s';
        
        setTimeout(() => {
            usernameInput.style.animation = '';
            passwordInput.style.animation = '';
        }, 500);
        
        // مسح كلمة المرور
        passwordInput.value = '';
        passwordInput.focus();
    }
    
    // وظيفة عرض رسالة الترحيب
    function showWelcomeMessage() {
        welcomeMessage.classList.add('show');
        
        // إضافة تأثير تدريجي
        setTimeout(() => {
            const welcomeContent = welcomeMessage.querySelector('.welcome-content');
            welcomeContent.style.transform = 'scale(1.1)';
            welcomeContent.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                welcomeContent.style.transform = 'scale(1)';
            }, 300);
        }, 100);
    }
    
    // وظيفة الحصول على معلومات الجهاز
    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            browser: getBrowserInfo(),
            os: getOSInfo()
        };
    }
    
    // وظيفة الحصول على معلومات المتصفح
    function getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = "unknown";
        
        if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
            browser = "Chrome";
        } else if (userAgent.includes("Firefox")) {
            browser = "Firefox";
        } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
            browser = "Safari";
        } else if (userAgent.includes("Edg")) {
            browser = "Edge";
        }
        
        return browser;
    }
    
    // وظيفة الحصول على معلومات نظام التشغيل
    function getOSInfo() {
        const userAgent = navigator.userAgent;
        let os = "unknown";
        
        if (userAgent.includes("Windows")) {
            os = "Windows";
        } else if (userAgent.includes("Mac")) {
            os = "macOS";
        } else if (userAgent.includes("Linux")) {
            os = "Linux";
        } else if (userAgent.includes("Android")) {
            os = "Android";
        } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
            os = "iOS";
        }
        
        return os;
    }
    
    // إضافة أنماط CSS للاهتزاز إذا لم تكن موجودة
    if (!document.getElementById('shakeAnimation')) {
        const style = document.createElement('style');
        style.id = 'shakeAnimation';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-5px); }
                40%, 80% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // إضافة تحسينات للواجهة
    function enhanceUI() {
        // إضافة تأثيرات للعناصر
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
            });
        });
        
        // إضافة تأثيرات للأزرار
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mousedown', function() {
                this.style.transform = 'scale(0.98)';
            });
            
            button.addEventListener('mouseup', function() {
                this.style.transform = 'scale(1)';
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }
    
    // تهيئة تحسينات الواجهة
    enhanceUI();
    
    // التركيز على حقل اسم المستخدم عند تحميل الصفحة
    setTimeout(() => {
        if (usernameInput.value === '') {
            usernameInput.focus();
        } else {
            passwordInput.focus();
        }
    }, 500);
    
    // إضافة إمكانية استخدام زر Enter للتنقل بين الحقول
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // التحقق من حالة الاتصال بقاعدة البيانات
    async function checkDatabaseConnection() {
        try {
            await storeDB.init();
            console.log('الاتصال بقاعدة البيانات نشط');
            return true;
        } catch (error) {
            console.error('فشل الاتصال بقاعدة البيانات:', error);
            showDatabaseError();
            return false;
        }
    }
    
    // عرض خطأ الاتصال بقاعدة البيانات
    function showDatabaseError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'database-error';
        errorDiv.innerHTML = `
            <div class="error-banner">
                <i class="fas fa-database"></i>
                <span>فشل الاتصال بقاعدة البيانات. يرجى تحديث الصفحة.</span>
                <button onclick="window.location.reload()">تحديث</button>
            </div>
        `;
        
        document.body.prepend(errorDiv);
        
        // إضافة الأنماط إذا لم تكن موجودة
        if (!document.getElementById('databaseErrorStyle')) {
            const style = document.createElement('style');
            style.id = 'databaseErrorStyle';
            style.textContent = `
                .database-error {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: #f44336;
                    color: white;
                    padding: 10px 20px;
                    text-align: center;
                    z-index: 10000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .error-banner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .error-banner button {
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .error-banner button:hover {
                    background: rgba(255,255,255,0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // التحقق من الاتصال عند تحميل الصفحة
    checkDatabaseConnection();
});

// إضافة دالة مساعدة للتحقق من صحة التوكن في الصفحات الأخرى
window.checkAuthToken = function() {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const loginTime = localStorage.getItem('loginTime');
    
    if (!token || !userId) {
        return false;
    }
    
    // التحقق من أن الجلسة ليست قديمة جداً (أكثر من 24 ساعة)
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            console.log('الجلسة قديمة، يتم تسجيل الخروج...');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userData');
            localStorage.removeItem('loginTime');
            return false;
        }
    }
    
    return true;
};

// دالة للحصول على بيانات المستخدم
window.getUserData = function() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
};

// دالة للتأكد من أن المستخدم مسجل الدخول قبل الانتقال للصفحات
window.requireAuth = function() {
    if (!window.checkAuthToken()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
};
