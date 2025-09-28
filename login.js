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
    
    // وظيفة تسجيل الدخول
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
            
            // محاولة تسجيل الدخول
            const result = await storeDB.login(username, password, deviceInfo);
            
            // حفظ بيانات المستخدم إذا طلب تذكر البيانات
            if (rememberMe) {
                localStorage.setItem('rememberedUser', username);
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            // عرض رسالة الترحيب
            showWelcomeMessage();
            
            // الانتقال إلى لوحة التحكم بعد تأخير
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
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
        
        // في تطبيق حقيقي، هنا سيتم إرسال طلب استعادة كلمة المرور
        // للمخدم أو إرسال بريد إلكتروني
        
        alert(`تم إرسال رابط استعادة كلمة المرور إلى ${email}`);
        closeModal();
        emailInput.value = '';
    }
    
    // وظيفة التحقق من المستخدم المحفوظ
    function checkRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            usernameInput.value = rememberedUser;
            document.getElementById('rememberMe').checked = true;
        }
    }
    
    // وظيفة عرض رسالة الخطأ
    function showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
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
        } else {
            buttonText.textContent = 'تسجيل الدخول';
            buttonLoader.classList.remove('show');
            loginButton.disabled = false;
        }
    }
    
    // وظيفة عرض خطأ تسجيل الدخول
    function showLoginError(message) {
        // يمكن تحسين هذه الوظيفة لعرض رسائل خطأ أكثر تحديداً
        const errorElement = document.getElementById('passwordError');
        showError(errorElement, message);
        
        // إضافة تأثير اهتزاز للحقول
        usernameInput.style.animation = 'shake 0.5s';
        passwordInput.style.animation = 'shake 0.5s';
        
        setTimeout(() => {
            usernameInput.style.animation = '';
            passwordInput.style.animation = '';
        }, 500);
        
        // إضافة أنماط CSS للاهتزاز
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
    }
    
    // وظيفة عرض رسالة الترحيب
    function showWelcomeMessage() {
        welcomeMessage.classList.add('show');
    }
    
    // وظيفة الحصول على معلومات الجهاز
    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
});
