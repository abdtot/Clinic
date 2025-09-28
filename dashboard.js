// dashboard.js - نظام لوحة التحكم المتقدمة للعيادة الطبية

// استيراد قاعدة البيانات
import storeDB from './db.js';

class DashboardSystem {
    constructor() {
        this.db = storeDB; // استخدام قاعدة البيانات المستوردة
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.charts = {};
        this.init();
    }

    async init() {
        try {
            console.log('بدء تهيئة لوحة التحكم...');
            
            // التحقق من المصادقة
            await this.checkAuthentication();
            
            // تهيئة قاعدة البيانات
            await this.initializeDatabase();
            
            // إعداد واجهة المستخدم
            this.setupUI();
            
            // تحميل البيانات
            await this.loadDashboardData();
            
            // إعداد المخططات
            this.setupCharts();
            
            // بدء التحديث التلقائي
            this.startAutoRefresh();
            
            console.log('تم تهيئة لوحة التحكم بنجاح');
            
        } catch (error) {
            console.error('فشل في تهيئة لوحة التحكم:', error);
            this.showToast('فشل في تحميل لوحة التحكم', 'error');
            this.redirectToLogin();
        }
    }

    // التحقق من المصادقة
    async checkAuthentication() {
        try {
            const sessionData = localStorage.getItem('clinic_session') || sessionStorage.getItem('clinic_session');
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            
            if (!sessionData || !token) {
                throw new Error('لم يتم العثور على جلسة نشطة');
            }

            const session = JSON.parse(sessionData);
            this.currentUser = session.user;
            
            console.log('المستخدم الحالي:', this.currentUser);
            
        } catch (error) {
            console.error('خطأ في المصادقة:', error);
            throw new Error('يجب تسجيل الدخول للوصول إلى لوحة التحكم');
        }
    }

    // تهيئة قاعدة البيانات
    async initializeDatabase() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.db && typeof this.db.init === 'function') {
                    // التأكد من تهيئة قاعدة البيانات
                    await this.db.init();
                    
                    console.log('تم الاتصال بقاعدة البيانات بنجاح');
                    resolve(true);
                } else {
                    throw new Error('لم يتم العثور على قاعدة البيانات');
                }
            } catch (error) {
                console.error('خطأ في تهيئة قاعدة البيانات:', error);
                reject(error);
            }
        });
    }

    // إعداد واجهة المستخدم
    setupUI() {
        this.setupEventListeners();
        this.updateUserInfo();
        this.updateClinicInfo();
        this.startClock();
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // تبديل الشريط الجانبي
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // التنقل بين الأقسام
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });

        // الإشعارات
        const notificationsBtn = document.getElementById('notificationsBtn');
        const closeNotificationsModal = document.getElementById('closeNotificationsModal');
        
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => this.showNotifications());
        }
        
        if (closeNotificationsModal) {
            closeNotificationsModal.addEventListener('click', () => this.hideNotifications());
        }

        // البحث
        const searchBtn = document.getElementById('searchBtn');
        const closeSearchModal = document.getElementById('closeSearchModal');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.showSearch());
        }
        
        if (closeSearchModal) {
            closeSearchModal.addEventListener('click', () => this.hideSearch());
        }

        // تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        const closeLogoutModal = document.getElementById('closeLogoutModal');
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.showLogoutConfirmation());
        }
        
        if (closeLogoutModal) {
            closeLogoutModal.addEventListener('click', () => this.hideLogoutConfirmation());
        }
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => this.hideLogoutConfirmation());
        }
        
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.logout());
        }

        // البحث العالمي
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
        }

        // تحديث المخططات
        const chartFilters = document.querySelectorAll('.chart-filter');
        chartFilters.forEach(filter => {
            filter.addEventListener('change', (e) => this.updateCharts(e.target.id, e.target.value));
        });
    }

    // تبديل الشريط الجانبي
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
    }

    // تبديل القسم
    switchSection(section) {
        // إخفاء جميع الأقسام
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(sec => sec.classList.remove('active'));
        
        // إزالة النشاط من جميع روابط التنقل
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        // إظهار القسم المطلوب
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // تفعيل رابط التنقل
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // تحديث العنوان
        this.updatePageTitle(section);
        
        // حفظ القسم الحالي
        this.currentSection = section;
        
        // تحميل بيانات القسم إذا لزم الأمر
        this.loadSectionData(section);
    }

    // تحديث عنوان الصفحة
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'لوحة التحكم',
            'patients': 'إدارة المرضى',
            'appointments': 'إدارة المواعيد',
            'prescriptions': 'الوصفات الطبية',
            'invoices': 'الفواتير والمحاسبة',
            'reports': 'التقارير والإحصائيات',
            'settings': 'الإعدادات'
        };
        
        const subtitles = {
            'dashboard': 'نظرة عامة على نشاط العيادة',
            'patients': 'إدارة سجلات المرضى والبيانات الطبية',
            'appointments': 'جدولة وإدارة مواعيد المرضى',
            'prescriptions': 'إنشاء وإدارة الوصفات الطبية',
            'invoices': 'الفواتير والسجلات المالية',
            'reports': 'تقارير وإحصائيات مفصلة',
            'settings': 'إعدادات النظام والتخصيص'
        };
        
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        
        if (pageTitle) pageTitle.textContent = titles[section] || section;
        if (pageSubtitle) pageSubtitle.textContent = subtitles[section] || '';
    }

    // تحديث معلومات المستخدم
    updateUserInfo() {
        if (!this.currentUser) return;
        
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        
        if (userName) {
            userName.textContent = this.currentUser.fullName || this.currentUser.username || 'د. غير معروف';
        }
        
        if (userRole) {
            userRole.textContent = this.getRoleDisplayName(this.currentUser.role);
        }
    }

    // تحديث معلومات العيادة
    async updateClinicInfo() {
        try {
            if (!this.db) return;
            
            const clinicName = await this.db.getSettingValue('clinic_name', 'العيادة الطبية');
            const doctorName = await this.db.getSettingValue('doctor_name', 'د. غير معروف');
            const specialization = await this.db.getSettingValue('doctor_specialization', 'الرعاية الصحية المتكاملة');
            
            const clinicNameElement = document.getElementById('clinicName');
            const clinicSpecializationElement = document.getElementById('clinicSpecialization');
            
            if (clinicNameElement) clinicNameElement.textContent = clinicName;
            if (clinicSpecializationElement) clinicSpecializationElement.textContent = specialization;
            
        } catch (error) {
            console.error('خطأ في تحديث معلومات العيادة:', error);
        }
    }

    // الحصول على اسم الدور المعروض
    getRoleDisplayName(role) {
        const roles = {
            'doctor': 'طبيب',
            'admin': 'مدير النظام',
            'assistant': 'مساعد طبي',
            'reception': 'استقبال'
        };
        
        return roles[role] || role;
    }

    // تحميل بيانات لوحة التحكم
    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            // تحميل الإحصائيات
            await this.loadStatistics();
            
            // تحميل المواعيد القادمة
            await this.loadUpcomingAppointments();
            
            // تحميل المرضى الجدد
            await this.loadRecentPatients();
            
            // تحميل الإشعارات
            await this.loadNotifications();
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
            this.showLoading(false);
            this.showToast('فشل في تحميل بعض البيانات', 'warning');
        }
    }

    // تحميل الإحصائيات
    async loadStatistics() {
        try {
            if (!this.db) return;
            
            const stats = await this.db.getAdvancedSystemStats();
            
            // تحديث بطاقات الإحصائيات
            this.updateStatCard('totalPatients', stats.patients || 0);
            this.updateStatCard('todayAppointments', stats.todayAppointments || 0);
            this.updateStatCard('totalPrescriptions', 0); // سيتم تحديثها لاحقاً
            this.updateStatCard('monthlyRevenue', stats.monthlyRevenue || 0);
            
            // تحديث الشارات
            this.updateNavBadge('patientsBadge', stats.patients || 0);
            this.updateNavBadge('appointmentsBadge', stats.todayAppointments || 0);
            
        } catch (error) {
            console.error('خطأ في تحميل الإحصائيات:', error);
        }
    }

    // تحديث بطاقة الإحصائية
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            this.animateValue(element, 0, value, 1000);
        }
    }

    // تحريك القيمة
    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(start + (end - start) * progress);
            element.textContent = this.formatNumber(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = this.formatNumber(end);
            }
        };
        
        requestAnimationFrame(step);
    }

    // تنسيق الأرقام
    formatNumber(num) {
        return new Intl.NumberFormat('ar-SA').format(num);
    }

    // تحديث شارات التنقل
    updateNavBadge(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (value > 0) {
                element.textContent = value > 99 ? '99+' : value;
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        }
    }

    // تحميل المواعيد القادمة
    async loadUpcomingAppointments() {
        try {
            if (!this.db) return;
            
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const appointments = await this.db.getAppointmentsByDateRange(today, tomorrow, {
                status: ['scheduled', 'confirmed']
            });
            
            this.renderUpcomingAppointments(appointments.slice(0, 5)); // عرض أول 5 مواعيد فقط
            
        } catch (error) {
            console.error('خطأ في تحميل المواعيد القادمة:', error);
            this.renderUpcomingAppointments([]);
        }
    }

    // عرض المواعيد القادمة
    renderUpcomingAppointments(appointments) {
        const container = document.getElementById('upcomingAppointmentsList');
        if (!container) return;
        
        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <p>لا توجد مواعيد قادمة</p>
                </div>
            `;
            return;
        }
        
        const appointmentsHTML = appointments.map(apt => `
            <div class="appointment-item">
                <div class="appointment-info">
                    <h4>${apt.patientName || 'مريض غير معروف'}</h4>
                    <p>${this.formatTime(apt.date)} - ${apt.type || 'كشف عام'}</p>
                </div>
                <div class="appointment-status ${apt.status}">
                    <span>${this.getStatusDisplayName(apt.status)}</span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = appointmentsHTML;
    }

    // تحميل المرضى الجدد
    async loadRecentPatients() {
        try {
            if (!this.db) return;
            
            const patients = await this.db.getAll('patients');
            const recentPatients = patients
                .filter(p => p.isActive)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5); // آخر 5 مرضى
            
            this.renderRecentPatients(recentPatients);
            
        } catch (error) {
            console.error('خطأ في تحميل المرضى الجدد:', error);
            this.renderRecentPatients([]);
        }
    }

    // عرض المرضى الجدد
    renderRecentPatients(patients) {
        const container = document.getElementById('recentPatientsList');
        if (!container) return;
        
        if (patients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>لا توجد مرضى مضافين حديثاً</p>
                </div>
            `;
            return;
        }
        
        const patientsHTML = patients.map(patient => `
            <div class="patient-item">
                <div class="patient-avatar">
                    <i class="fas fa-user-injured"></i>
                </div>
                <div class="patient-info">
                    <h4>${patient.name || 'غير معروف'}</h4>
                    <p>${patient.phone || 'لا يوجد رقم'} • ${this.formatDate(patient.createdAt)}</p>
                </div>
                <div class="patient-actions">
                    <button class="btn-view" data-patient-id="${patient.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = patientsHTML;
        
        // إضافة مستمعي الأحداث لأزرار العرض
        const viewButtons = container.querySelectorAll('.btn-view');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const patientId = btn.getAttribute('data-patient-id');
                this.viewPatient(patientId);
            });
        });
    }

    // تحميل الإشعارات
    async loadNotifications() {
        try {
            if (!this.db) return;
            
            const notifications = await this.db.getAll('notifications', {
                isRead: false
            }, 'createdAt', 'desc');
            
            this.updateNotificationsBadge(notifications.length);
            this.renderNotifications(notifications.slice(0, 10)); // آخر 10 إشعارات فقط
            
        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
            this.updateNotificationsBadge(0);
        }
    }

    // تحديث شارة الإشعارات
    updateNotificationsBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // عرض الإشعارات
    renderNotifications(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات جديدة</p>
                </div>
            `;
            return;
        }
        
        const notificationsHTML = notifications.map(notif => `
            <div class="notification-item ${notif.priority}">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notif.title}</h4>
                    <p>${notif.message}</p>
                    <span class="notification-time">${this.formatTimeAgo(notif.createdAt)}</span>
                </div>
                <button class="notification-dismiss" data-notification-id="${notif.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        container.innerHTML = notificationsHTML;
        
        // إضافة مستمعي الأحداث لأزرار الإخفاء
        const dismissButtons = container.querySelectorAll('.notification-dismiss');
        dismissButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const notificationId = btn.getAttribute('data-notification-id');
                await this.dismissNotification(notificationId);
            });
        });
    }

    // إعداد المخططات
    setupCharts() {
        this.setupAppointmentsChart();
        this.setupRevenueChart();
    }

    // مخطط المواعيد
    setupAppointmentsChart() {
        const ctx = document.getElementById('appointmentsChart');
        if (!ctx) return;
        
        this.charts.appointments = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
                datasets: [{
                    label: 'عدد المواعيد',
                    data: [12, 19, 15, 17, 14, 8, 10],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // مخطط الإيرادات
    setupRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'الإيرادات',
                    data: [12000, 15000, 18000, 14000, 16000, 20000],
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // تحديث المخططات
    updateCharts(chartId, period) {
        // في تطبيق حقيقي، هنا سيتم جلب البيانات الحقيقية حسب الفترة
        console.log(`تحديث المخطط ${chartId} للفترة ${period}`);
    }

    // الساعة الحية
    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const timeDisplay = document.getElementById('timeDisplay');
            if (timeDisplay) {
                timeDisplay.textContent = timeString;
            }
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    // البحث العالمي
    async handleGlobalSearch(query) {
        if (query.length < 2) {
            const resultsContainer = document.getElementById('searchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = '';
            }
            return;
        }
        
        try {
            const results = await this.db.search('patients', query, ['name', 'phone', 'nationalId']);
            this.renderSearchResults(results.slice(0, 10)); // عرض أول 10 نتائج فقط
            
        } catch (error) {
            console.error('خطأ في البحث:', error);
        }
    }

    // عرض نتائج البحث
    renderSearchResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>لا توجد نتائج للبحث</p>
                </div>
            `;
            return;
        }
        
        const resultsHTML = results.map(result => `
            <div class="search-result-item" data-patient-id="${result.id}">
                <div class="result-avatar">
                    <i class="fas fa-user-injured"></i>
                </div>
                <div class="result-info">
                    <h4>${result.name}</h4>
                    <p>${result.phone || 'لا يوجد رقم'} • ${result.nationalId || 'لا يوجد رقم وطني'}</p>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = resultsHTML;
        
        // إضافة مستمعي الأحداث لنتائج البحث
        const resultItems = container.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const patientId = item.getAttribute('data-patient-id');
                this.viewPatient(patientId);
                this.hideSearch();
            });
        });
    }

    // عرض المريض
    viewPatient(patientId) {
        // في تطبيق حقيقي، هنا سيتم عرض تفاصيل المريض
        console.log('عرض المريض:', patientId);
        this.switchSection('patients');
    }

    // إخفاء الإشعار
    async dismissNotification(notificationId) {
        try {
            if (!this.db) return;
            
            await this.db.update('notifications', notificationId, {
                isRead: true
            }, this.currentUser.id);
            
            // إعادة تحميل الإشعارات
            await this.loadNotifications();
            
        } catch (error) {
            console.error('خطأ في إخفاء الإشعار:', error);
        }
    }

    // إظهار الإشعارات
    showNotifications() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideNotifications() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // إظهار البحث
    showSearch() {
        const modal = document.getElementById('searchModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // التركيز على حقل البحث
            setTimeout(() => {
                const searchInput = document.getElementById('globalSearch');
                if (searchInput) searchInput.focus();
            }, 100);
        }
    }

    hideSearch() {
        const modal = document.getElementById('searchModal');
        if (modal) {
            modal.style.display = 'none';
            
            // مسح البحث
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) searchInput.value = '';
            
            const resultsContainer = document.getElementById('searchResults');
            if (resultsContainer) resultsContainer.innerHTML = '';
        }
    }

    // تأكيد تسجيل الخروج
    showLogoutConfirmation() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideLogoutConfirmation() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // تسجيل الخروج
    async logout() {
        try {
            this.showLoading(true);
            
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            
            if (this.db && token) {
                await this.db.logout(token, this.currentUser.id);
            }
            
            // مسح بيانات الجلسة
            localStorage.removeItem('clinic_session');
            sessionStorage.removeItem('clinic_session');
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            
            this.showLoading(false);
            this.redirectToLogin();
            
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
            this.showLoading(false);
            
            // مسح البيانات المحلية على أي حال
            localStorage.removeItem('clinic_session');
            sessionStorage.removeItem('clinic_session');
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            
            this.redirectToLogin();
        }
    }

    // التوجيه إلى صفحة تسجيل الدخول
    redirectToLogin() {
        window.location.href = 'login.html';
    }

    // بدء التحديث التلقائي
    startAutoRefresh() {
        // تحديث البيانات كل 5 دقائق
        setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);
    }

    // تحميل بيانات القسم
    loadSectionData(section) {
        // في تطبيق حقيقي، هنا سيتم تحميل البيانات الخاصة بكل قسم
        console.log('تحميل بيانات القسم:', section);
    }

    // دوال مساعدة للتنسيق
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
        if (diffHours < 24) return `قبل ${diffHours} ساعة`;
        if (diffDays < 7) return `قبل ${diffDays} يوم`;
        return this.formatDate(dateString);
    }

    getStatusDisplayName(status) {
        const statuses = {
            'scheduled': 'مجدول',
            'confirmed': 'مؤكد',
            'completed': 'مكتمل',
            'cancelled': 'ملغى',
            'no-show': 'لم يحضر'
        };
        return statuses[status] || status;
    }

    getNotificationIcon(type) {
        const icons = {
            'appointment_reminder': 'calendar-alt',
            'new_patient': 'user-plus',
            'low_stock': 'exclamation-triangle',
            'system_alert': 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }

    // عرض التحميل
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
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
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

// تهيئة لوحة التحكم عند تحميل الصفحة
let dashboardSystem;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        dashboardSystem = new DashboardSystem();
    } catch (error) {
        console.error('فشل في تحميل لوحة التحكم:', error);
        
        // عرض رسالة خطأ
        const alertContainer = document.createElement('div');
        alertContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            text-align: center;
            padding: 2rem;
        `;
        alertContainer.innerHTML = `
            <div>
                <h2>خطأ في تحميل النظام</h2>
                <p>فشل في تحميل لوحة التحكم. يرجى تحديث الصفحة أو الاتصال بالدعم الفني.</p>
                <button onclick="window.location.href='login.html'" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 1rem;
                ">العودة إلى تسجيل الدخول</button>
            </div>
        `;
        document.body.appendChild(alertContainer);
    }
});

// تصدير للنظام العالمي
export default DashboardSystem;
