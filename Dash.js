import storeDB from './db.js';

// تهيئة لوحة التحكم
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        // التحقق من صحة الجلسة
        await this.checkSession();
        
        // تهيئة المكونات
        this.initSidebar();
        this.initHeader();
        this.initCharts();
        this.loadDashboardData();
        this.initEventListeners();
        
        // تحديث البيانات تلقائياً
        this.startAutoRefresh();
    }

    // التحقق من صحة الجلسة
    async checkSession() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }

        try {
            this.currentUser = await storeDB.validateSession(token);
            if (!this.currentUser) {
                throw new Error('الجلسة منتهية الصلاحية');
            }
            this.updateUserInfo();
        } catch (error) {
            console.error('خطأ في التحقق من الجلسة:', error);
            this.logout();
        }
    }

    // تحديث معلومات المستخدم في الواجهة
    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser.fullName || 'د. غير معروف';
        document.getElementById('userRole').textContent = this.currentUser.role === 'doctor' ? 'طبيب' : 'مسؤول';
        document.getElementById('userNameSm').textContent = this.currentUser.fullName || 'د. غير معروف';
        document.getElementById('clinicName').textContent = this.currentUser.clinicName || 'العيادة الطبية';
    }

    // تهيئة الشريط الجانبي
    initSidebar() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const navLinks = document.querySelectorAll('.nav-link');
        const submenuToggles = document.querySelectorAll('.submenu-toggle');

        // تبديل الشريط الجانبي
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });

        // التنقل بين الأقسام
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // إزالة النشاط من جميع العناصر
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });

                // إضافة النشاط للعنصر الحالي
                const parent = link.closest('.nav-item');
                parent.classList.add('active');

                // تبديل القوائم الفرعية
                if (parent.classList.contains('has-submenu')) {
                    parent.classList.toggle('active');
                } else {
                    // تغيير القسم النشط
                    const target = link.getAttribute('href').substring(1);
                    this.switchSection(target);
                }
            });
        });

        // تبديل القوائم الفرعية
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const parent = toggle.closest('.has-submenu');
                parent.classList.toggle('active');
            });
        });
    }

    // تهيئة شريط العنوان
    initHeader() {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationPanel = document.getElementById('notificationPanel');
        const userBtn = document.getElementById('userBtn');
        const userMenu = document.getElementById('userMenu');
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutMenuBtn = document.getElementById('logoutMenuBtn');

        // تبديل لوحة الإشعارات
        notificationBtn.addEventListener('click', () => {
            notificationPanel.classList.toggle('show');
            this.loadNotifications();
        });

        // تبديل قائمة المستخدم
        userBtn.addEventListener('click', () => {
            userMenu.classList.toggle('show');
        });

        // تسجيل الخروج
        logoutBtn.addEventListener('click', () => this.showLogoutConfirm());
        logoutMenuBtn.addEventListener('click', () => this.showLogoutConfirm());

        // إغلاق القوائم عند النقر خارجها
        document.addEventListener('click', (e) => {
            if (!notificationBtn.contains(e.target) && !notificationPanel.contains(e.target)) {
                notificationPanel.classList.remove('show');
            }
            if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
                userMenu.classList.remove('show');
            }
        });

        // البحث العالمي
        const searchInput = document.getElementById('globalSearch');
        searchInput.addEventListener('input', (e) => {
            this.handleGlobalSearch(e.target.value);
        });
    }

    // تهيئة المخططات
    initCharts() {
        this.initRevenueChart();
        this.initPatientsAgeChart();
    }

    // مخطط الإيرادات
    initRevenueChart() {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        this.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'الإيرادات',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#2c5aa0',
                    backgroundColor: 'rgba(44, 90, 160, 0.1)',
                    tension: 0.4,
                    fill: true
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

        // تحديث المخطط عند تغيير الفترة
        document.getElementById('revenuePeriod').addEventListener('change', (e) => {
            this.updateRevenueChart(e.target.value);
        });
    }

    // مخطط توزيع الأعمار
    initPatientsAgeChart() {
        const ctx = document.getElementById('patientsAgeChart').getContext('2d');
        this.patientsAgeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['أقل من 18', '18-30', '31-45', '46-60', 'أكثر من 60'],
                datasets: [{
                    data: [15, 30, 25, 20, 10],
                    backgroundColor: [
                        '#2c5aa0',
                        '#4caf50',
                        '#ff9800',
                        '#f44336',
                        '#9c27b0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // تحميل بيانات لوحة التحكم
    async loadDashboardData() {
        try {
            // تحميل الإحصائيات
            const stats = await storeDB.getAdvancedSystemStats();
            this.updateStats(stats);

            // تحميل المواعيد القادمة
            const appointments = await this.loadUpcomingAppointments();
            this.renderUpcomingAppointments(appointments);

            // تحميل المرضى الجدد
            const patients = await this.loadRecentPatients();
            this.renderRecentPatients(patients);

            // تحميل التنبيهات
            const alerts = await this.loadImportantAlerts();
            this.renderImportantAlerts(alerts);

            // تحديث العدادت
            this.updateBadges();

        } catch (error) {
            console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
            this.showError('فشل في تحميل البيانات');
        }
    }

    // تحديث الإحصائيات
    updateStats(stats) {
        document.getElementById('totalPatients').textContent = stats.patients?.toLocaleString() || '0';
        document.getElementById('todayAppointments').textContent = stats.todayAppointments?.toLocaleString() || '0';
        document.getElementById('pendingInvoices').textContent = stats.pendingInvoices?.toLocaleString() || '0';
        document.getElementById('lowStockItems').textContent = stats.lowStockItems?.toLocaleString() || '0';
    }

    // تحميل المواعيد القادمة
    async loadUpcomingAppointments() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            return await storeDB.getAppointmentsByDateRange(today, tomorrow, {
                status: ['scheduled', 'confirmed']
            });
        } catch (error) {
            console.error('خطأ في تحميل المواعيد:', error);
            return [];
        }
    }

    // عرض المواعيد القادمة
    renderUpcomingAppointments(appointments) {
        const container = document.getElementById('upcomingAppointmentsList');
        
        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>لا توجد مواعيد قادمة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = appointments.slice(0, 5).map(appointment => `
            <div class="appointment-item">
                <div class="appointment-time">
                    <span class="time">${this.formatTime(appointment.date)}</span>
                    <span class="date">${this.formatDate(appointment.date)}</span>
                </div>
                <div class="appointment-details">
                    <div class="appointment-patient">${appointment.patientName || 'مريض'}</div>
                    <div class="appointment-type">${appointment.type || 'كشف عام'}</div>
                </div>
                <div class="appointment-status status-${appointment.status}">
                    ${this.getStatusText(appointment.status)}
                </div>
            </div>
        `).join('');
    }

    // تحميل المرضى الجدد
    async loadRecentPatients() {
        try {
            const patients = await storeDB.getAll('patients');
            return patients
                .filter(p => p.isActive)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
        } catch (error) {
            console.error('خطأ في تحميل المرضى:', error);
            return [];
        }
    }

    // عرض المرضى الجدد
    renderRecentPatients(patients) {
        const container = document.getElementById('recentPatientsList');
        
        if (patients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-times"></i>
                    <p>لا توجد بيانات مرضى</p>
                </div>
            `;
            return;
        }

        container.innerHTML = patients.map(patient => `
            <div class="patient-item">
                <div class="patient-avatar">
                    ${this.getInitials(patient.name || 'مريض')}
                </div>
                <div class="patient-details">
                    <div class="patient-name">${patient.name || 'مريض'}</div>
                    <div class="patient-info">${patient.phone || 'لا يوجد هاتف'}</div>
                </div>
                <div class="patient-age">
                    ${patient.age ? `${patient.age} سنة` : 'غير معروف'}
                </div>
            </div>
        `).join('');
    }

    // تحميل التنبيهات المهمة
    async loadImportantAlerts() {
        try {
            const alerts = [];
            
            // التحقق من الأدوية منخفضة المخزون
            const medications = await storeDB.getAll('medications');
            const lowStock = medications.filter(m => m.stock < (m.minStock || 10));
            
            if (lowStock.length > 0) {
                alerts.push({
                    type: 'warning',
                    icon: 'fas fa-pills',
                    message: `${lowStock.length} دواء منخفض المخزون`
                });
            }
            
            // التحقق من الفواتير المتأخرة
            const invoices = await storeDB.getAll('invoices');
            const overdueInvoices = invoices.filter(i => 
                i.status === 'pending' && 
                new Date(i.dueDate) < new Date()
            );
            
            if (overdueInvoices.length > 0) {
                alerts.push({
                    type: 'danger',
                    icon: 'fas fa-exclamation-triangle',
                    message: `${overdueInvoices.length} فاتورة متأخرة`
                });
            }
            
            // إضافة تنبيهات عامة
            alerts.push({
                type: 'info',
                icon: 'fas fa-info-circle',
                message: 'النظام يعمل بشكل طبيعي'
            });
            
            return alerts;
        } catch (error) {
            console.error('خطأ في تحميل التنبيهات:', error);
            return [];
        }
    }

    // عرض التنبيهات المهمة
    renderImportantAlerts(alerts) {
        const container = document.getElementById('importantAlertsList');
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <i class="${alert.icon} alert-icon"></i>
                <span>${alert.message}</span>
            </div>
        `).join('');
    }

    // تحميل الإشعارات
    async loadNotifications() {
        try {
            const notifications = await storeDB.getAll('notifications', {
                isRead: false
            }, 'createdAt', 'desc');
            
            const container = document.getElementById('notificationList');
            const countElement = document.getElementById('notificationCount');
            
            countElement.textContent = notifications.length;
            
            container.innerHTML = notifications.map(notification => `
                <div class="notification-item ${notification.isRead ? '' : 'unread'}">
                    <div class="notification-title">
                        <span>${notification.title}</span>
                        <span class="notification-time">${this.formatRelativeTime(notification.createdAt)}</span>
                    </div>
                    <div class="notification-message">${notification.message}</div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
        }
    }

    // تبديل الأقسام
    switchSection(sectionId) {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // إظهار القسم المطلوب
        const targetSection = document.getElementById(sectionId + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
            
            // تحديث العنوان
            document.getElementById('pageTitle').textContent = this.getSectionTitle(sectionId);
            document.getElementById('currentPage').textContent = this.getSectionTitle(sectionId);
            
            // تحميل بيانات القسم
            this.loadSectionData(sectionId);
        }
    }

    // تحميل بيانات القسم
    async loadSectionData(sectionId) {
        try {
            switch (sectionId) {
                case 'appointments':
                    await this.loadAppointmentsData();
                    break;
                case 'patients':
                    await this.loadPatientsData();
                    break;
                case 'invoices':
                    await this.loadInvoicesData();
                    break;
                // يمكن إضافة حالات أخرى للأقسام
            }
        } catch (error) {
            console.error(`خطأ في تحميل بيانات ${sectionId}:`, error);
            this.showError(`فشل في تحميل بيانات ${this.getSectionTitle(sectionId)}`);
        }
    }

    // تحميل بيانات المواعيد
    async loadAppointmentsData() {
        // تنفيذ تحميل بيانات المواعيد
        console.log('تحميل بيانات المواعيد...');
    }

    // تحميل بيانات المرضى
    async loadPatientsData() {
        // تنفيذ تحميل بيانات المرضى
        console.log('تحميل بيانات المرضى...');
    }

    // تحميل بيانات الفواتير
    async loadInvoicesData() {
        // تنفيذ تحميل بيانات الفواتير
        console.log('تحميل بيانات الفواتير...');
    }

    // البحث العالمي
    async handleGlobalSearch(query) {
        if (query.length < 2) return;
        
        try {
            const results = await Promise.all([
                storeDB.search('patients', query, ['name', 'nationalId', 'phone']),
                storeDB.search('appointments', query, ['patientName', 'type']),
                storeDB.search('invoices', query, ['invoiceNumber', 'patientName'])
            ]);
            
            this.displaySearchResults(results, query);
        } catch (error) {
            console.error('خطأ في البحث:', error);
        }
    }

    // عرض نتائج البحث
    displaySearchResults(results, query) {
        // تنفيذ عرض نتائج البحث
        console.log('نتائج البحث:', results);
    }

    // تحديث العدادت
    async updateBadges() {
        try {
            const [appointments, patients, invoices] = await Promise.all([
                storeDB.getAll('appointments', { status: 'scheduled' }),
                storeDB.getAll('patients', { isActive: true }),
                storeDB.getAll('invoices', { status: 'pending' })
            ]);
            
            document.getElementById('appointmentsBadge').textContent = appointments.length;
            document.getElementById('patientsBadge').textContent = patients.length;
            document.getElementById('invoicesBadge').textContent = invoices.length;
            
        } catch (error) {
            console.error('خطأ في تحديث العدادت:', error);
        }
    }

    // تحديث مخطط الإيرادات
    async updateRevenueChart(period) {
        try {
            const report = await storeDB.getAdvancedRevenueReport(
                this.getDateRange(period).start,
                this.getDateRange(period).end
            );
            
            // تحديث بيانات المخطط
            this.revenueChart.data.datasets[0].data = Object.values(report.dailyRevenue);
            this.revenueChart.update();
            
        } catch (error) {
            console.error('خطأ في تحديث مخطط الإيرادات:', error);
        }
    }

    // إظهار تأكيد تسجيل الخروج
    showLogoutConfirm() {
        const modal = document.getElementById('logoutConfirmModal');
        const cancelBtn = document.getElementById('cancelLogout');
        const confirmBtn = document.getElementById('confirmLogout');
        
        modal.classList.add('show');
        
        cancelBtn.onclick = () => modal.classList.remove('show');
        confirmBtn.onclick = () => this.logout();
    }

    // تسجيل الخروج
    async logout() {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                await storeDB.logout(token, this.currentUser?.id);
            }
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        } finally {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    }

    // بدء التحديث التلقائي
    startAutoRefresh() {
        // تحديث البيانات كل 5 دقائق
        setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);
        
        // تحديث الإشعارات كل دقيقة
        setInterval(() => {
            this.loadNotifications();
        }, 60 * 1000);
    }

    // إضافة مستمعي الأحداث
    initEventListeners() {
        // إضافة موعد جديد
        document.getElementById('addAppointmentBtn')?.addEventListener('click', () => {
            this.showAddAppointmentModal();
        });
        
        // إضافة مريض جديد
        document.getElementById('addPatientBtn')?.addEventListener('click', () => {
            this.showAddPatientModal();
        });
        
        // تعيين جميع الإشعارات كمقروءة
        document.getElementById('markAllRead')?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });
    }

    // إظهار نافذة إضافة موعد
    showAddAppointmentModal() {
        const modal = document.getElementById('addAppointmentModal');
        modal.classList.add('show');
        
        // تنفيذ نموذج إضافة الموعد
        this.renderAppointmentForm();
    }

    // إظهار نافذة إضافة مريض
    showAddPatientModal() {
        const modal = document.getElementById('addPatientModal');
        modal.classList.add('show');
        
        // تنفيذ نموذج إضافة المريض
        this.renderPatientForm();
    }

    // تعيين جميع الإشعارات كمقروءة
    async markAllNotificationsAsRead() {
        try {
            const notifications = await storeDB.getAll('notifications', { isRead: false });
            
            for (const notification of notifications) {
                await storeDB.update('notifications', notification.id, {
                    ...notification,
                    isRead: true
                }, this.currentUser.id);
            }
            
            this.loadNotifications();
            
        } catch (error) {
            console.error('خطأ في تعيين الإشعارات كمقروءة:', error);
            this.showError('فشل في تحديث الإشعارات');
        }
    }

    // عرض رسالة خطأ
    showError(message) {
        // تنفيذ عرض رسائل الخطأ
        console.error('خطأ:', message);
        // يمكن استخدام مكتبة مثل SweetAlert أو Toastify هنا
    }

    // دوال مساعدة
    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ar-SA');
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `قبل ${minutes} دقيقة`;
        if (hours < 24) return `قبل ${hours} ساعة`;
        if (days < 7) return `قبل ${days} يوم`;
        
        return this.formatDate(dateString);
    }

    getStatusText(status) {
        const statusMap = {
            'scheduled': 'مجدول',
            'confirmed': 'مؤكد',
            'completed': 'مكتمل',
            'cancelled': 'ملغى'
        };
        return statusMap[status] || status;
    }

    getInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase();
    }

    getSectionTitle(sectionId) {
        const titles = {
            'dashboard': 'لوحة التحكم',
            'appointments': 'المواعيد',
            'patients': 'المرضى',
            'medical-records': 'السجلات الطبية',
            'prescriptions': 'الوصفات الطبية',
            'invoices': 'الفواتير',
            'reports': 'التقارير',
            'inventory': 'المخزون',
            'lab': 'المختبر',
            'radiology': 'الأشعة',
            'settings': 'الإعدادات'
        };
        return titles[sectionId] || sectionId;
    }

    getDateRange(period) {
        const now = new Date();
        let start, end;
        
        switch (period) {
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }

    // دوال العرض (سيتم تنفيذها لاحقاً)
    renderAppointmentForm() {
        // تنفيذ نموذج إضافة الموعد
    }

    renderPatientForm() {
        // تنفيذ نموذج إضافة المريض
    }
}

// تهيئة لوحة التحكم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

// إغلاق النوافذ المنبثقة
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
    
    if (e.target.classList.contains('close-modal')) {
        e.target.closest('.modal').classList.remove('show');
    }
});


class Dashboard {
    // ... الكود الحالي ...

    // تحميل بيانات المواعيد
    async loadAppointmentsData() {
        try {
            console.log('جاري تحميل بيانات المواعيد...');
            
            // تحميل جميع المواعيد
            const appointments = await storeDB.getAll('appointments');
            const patients = await storeDB.getAll('patients');
            const users = await storeDB.getAll('users');
            
            // تحديث الإحصائيات
            this.updateAppointmentsStats(appointments);
            
            // تحديث العروض
            this.renderAppointmentsCalendar(appointments, patients, users);
            this.renderAppointmentsList(appointments, patients, users);
            
            // تحديث الفلاتر
            this.updateDoctorsFilter(users);
            
            console.log('تم تحميل بيانات المواعيد بنجاح');
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات المواعيد:', error);
            this.showError('فشل في تحميل بيانات المواعيد');
        }
    }

    // تحديث إحصائيات المواعيد
    updateAppointmentsStats(appointments) {
        const today = new Date().toISOString().split('T')[0];
        
        const totalAppointments = appointments.length;
        const todayAppointments = appointments.filter(apt => 
            apt.date && apt.date.startsWith(today)
        ).length;
        
        const completedAppointments = appointments.filter(apt => 
            apt.status === 'completed'
        ).length;
        
        // حساب التعارضات (هذا مثال مبسط)
        const conflictAppointments = this.checkAppointmentsConflicts(appointments);

        document.getElementById('totalAppointments').textContent = totalAppointments.toLocaleString();
        document.getElementById('todayAppointmentsCount').textContent = todayAppointments.toLocaleString();
        document.getElementById('completedAppointments').textContent = completedAppointments.toLocaleString();
        document.getElementById('conflictAppointments').textContent = conflictAppointments.toLocaleString();
    }

    // التحقق من تعارضات المواعيد
    checkAppointmentsConflicts(appointments) {
        let conflicts = 0;
        const appointmentsByDoctor = {};
        
        appointments.forEach(apt => {
            if (!apt.doctorId || !apt.date) return;
            
            if (!appointmentsByDoctor[apt.doctorId]) {
                appointmentsByDoctor[apt.doctorId] = [];
            }
            
            appointmentsByDoctor[apt.doctorId].push(apt);
        });
        
        // التحقق من التعارضات لكل طبيب
        Object.values(appointmentsByDoctor).forEach(doctorAppointments => {
            doctorAppointments.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            for (let i = 1; i < doctorAppointments.length; i++) {
                const prevApt = new Date(doctorAppointments[i-1].date);
                const currentApt = new Date(doctorAppointments[i].date);
                const timeDiff = (currentApt - prevApt) / (1000 * 60); // الفرق بالدقائق
                
                if (timeDiff < 30) { // إذا كان الفرق أقل من 30 دقيقة
                    conflicts++;
                }
            }
        });
        
        return conflicts;
    }

    // عرض المواعيد في التقويم
    renderAppointmentsCalendar(appointments, patients, users) {
        const appointmentsSlots = document.getElementById('appointmentsSlots');
        const timeSlotsList = document.querySelector('.time-slots-list');
        
        if (!appointmentsSlots || !timeSlotsList) return;
        
        // مسح المحتوى الحالي
        appointmentsSlots.innerHTML = '';
        timeSlotsList.innerHTML = '';
        
        // إنشاء شرائح الوقت (من 8 صباحاً إلى 6 مساءً)
        for (let hour = 8; hour <= 18; hour++) {
            // إضافة شريحة الوقت
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour}:00`;
            timeSlotsList.appendChild(timeSlot);
            
            // إضافة شريحة المواعيد
            const appointmentSlot = document.createElement('div');
            appointmentSlot.className = 'appointment-slot';
            appointmentSlot.id = `slot-${hour}`;
            appointmentsSlots.appendChild(appointmentSlot);
        }
        
        // عرض المواعيد الحالية
        const currentDate = new Date();
        const todayAppointments = appointments.filter(apt => {
            if (!apt.date) return false;
            const aptDate = new Date(apt.date);
            return aptDate.toDateString() === currentDate.toDateString();
        });
        
        todayAppointments.forEach(apt => {
            this.renderAppointmentEvent(apt, patients, users);
        });
        
        // تحديث التاريخ الحالي
        this.updateCurrentDate();
    }

    // عرض حدث موعد في التقويم
    renderAppointmentEvent(appointment, patients, users) {
        if (!appointment.date) return;
        
        const aptDate = new Date(appointment.date);
        const hour = aptDate.getHours();
        const minutes = aptDate.getMinutes();
        
        const slot = document.getElementById(`slot-${hour}`);
        if (!slot) return;
        
        const patient = patients.find(p => p.id === appointment.patientId);
        const doctor = users.find(u => u.id === appointment.doctorId);
        
        const event = document.createElement('div');
        event.className = `appointment-event ${appointment.status || 'scheduled'}`;
        
        // حساب الموقع والارتفاع
        const top = (minutes / 60) * 60; // 60px لكل ساعة
        const duration = appointment.duration || 30;
        const height = (duration / 60) * 60;
        
        event.style.top = `${top}px`;
        event.style.height = `${height}px`;
        
        event.innerHTML = `
            <div class="event-time">${this.formatTime(appointment.date)}</div>
            <div class="event-patient">${patient ? patient.name : 'مريض'}</div>
            ${doctor ? `<div class="event-doctor">د. ${doctor.fullName}</div>` : ''}
        `;
        
        // إضافة حدث النقر
        event.addEventListener('click', () => {
            this.showAppointmentDetails(appointment, patient, doctor);
        });
        
        slot.appendChild(event);
    }

    // عرض المواعيد في القائمة
    renderAppointmentsList(appointments, patients, users) {
        const tableBody = document.getElementById('appointmentsTableBody');
        if (!tableBody) return;
        
        if (appointments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <p>لا توجد مواعيد</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // ترتيب المواعيد من الأحدث إلى الأقدم
        const sortedAppointments = appointments.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        tableBody.innerHTML = sortedAppointments.map(apt => {
            const patient = patients.find(p => p.id === apt.patientId);
            const doctor = users.find(u => u.id === apt.doctorId);
            
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="appointment-checkbox" value="${apt.id}">
                    </td>
                    <td>${apt.appointmentNumber || 'N/A'}</td>
                    <td>${patient ? patient.name : 'مريض'}</td>
                    <td>${doctor ? `د. ${doctor.fullName}` : 'طبيب'}</td>
                    <td>
                        <div>${this.formatDate(apt.date)}</div>
                        <div class="text-muted">${this.formatTime(apt.date)}</div>
                    </td>
                    <td>${apt.type || 'كشف عام'}</td>
                    <td>
                        <span class="status-badge status-${apt.status || 'scheduled'}">
                            ${this.getStatusText(apt.status)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn btn-edit" onclick="dashboard.editAppointment(${apt.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-complete" onclick="dashboard.updateAppointmentStatus(${apt.id}, 'completed')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn btn-cancel" onclick="dashboard.updateAppointmentStatus(${apt.id}, 'cancelled')">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="dashboard.deleteAppointment(${apt.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // تحديث الترقيم
        this.updateAppointmentsPagination(sortedAppointments.length);
    }

    // تحديث ترقيم الصفحات
    updateAppointmentsPagination(totalItems) {
        const pagination = document.getElementById('appointmentsPagination');
        if (!pagination) return;
        
        const itemsPerPage = 10;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        let paginationHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="page-btn ${i === 1 ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        pagination.innerHTML = paginationHTML;
        
        // تحديث معلومات الصفحة
        document.getElementById('totalAppointmentsCount').textContent = totalItems.toLocaleString();
        document.getElementById('currentPageSize').textContent = Math.min(itemsPerPage, totalItems);
        
        // إضافة أحداث النقر لأزرار الصفحات
        pagination.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pagination.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // هنا يمكن إضافة منطق تحميل الصفحة
            });
        });
    }

    // تحديث فلتر الأطباء
    updateDoctorsFilter(users) {
        const doctorFilter = document.getElementById('doctorFilter');
        if (!doctorFilter) return;
        
        const doctors = users.filter(user => user.role === 'doctor' && user.isActive);
        
        doctorFilter.innerHTML = `
            <option value="all">جميع الأطباء</option>
            ${doctors.map(doctor => `
                <option value="${doctor.id}">د. ${doctor.fullName || doctor.username}</option>
            `).join('')}
        `;
    }

    // تحديث التاريخ الحالي في التقويم
    updateCurrentDate() {
        const currentDate = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        const dateString = currentDate.toLocaleDateString('ar-SA', options);
        document.getElementById('currentDate').textContent = dateString;
        document.getElementById('dayHeader').textContent = currentDate.toLocaleDateString('ar-SA', { weekday: 'long' });
    }

    // عرض تفاصيل الموعد
    showAppointmentDetails(appointment, patient, doctor) {
        // تنفيذ نافذة تفاصيل الموعد
        console.log('عرض تفاصيل الموعد:', appointment);
        
        // يمكن استخدام SweetAlert أو إنشاء نافذة مخصصة
        const patientName = patient ? patient.name : 'مريض';
        const doctorName = doctor ? `د. ${doctor.fullName}` : 'طبيب';
        
        alert(`
            تفاصيل الموعد:
            المريض: ${patientName}
            الطبيب: ${doctorName}
            التاريخ: ${this.formatDate(appointment.date)}
            الوقت: ${this.formatTime(appointment.date)}
            النوع: ${appointment.type || 'كشف عام'}
            الحالة: ${this.getStatusText(appointment.status)}
            ${appointment.notes ? `ملاحظات: ${appointment.notes}` : ''}
        `);
    }

    // تحرير موعد
    async editAppointment(appointmentId) {
        try {
            const appointment = await storeDB.get('appointments', appointmentId);
            if (!appointment) {
                this.showError('الموعد غير موجود');
                return;
            }
            
            this.showEditAppointmentModal(appointment);
            
        } catch (error) {
            console.error('خطأ في تحرير الموعد:', error);
            this.showError('فشل في تحرير الموعد');
        }
    }

    // تحديث حالة الموعد
    async updateAppointmentStatus(appointmentId, newStatus) {
        try {
            const appointment = await storeDB.get('appointments', appointmentId);
            if (!appointment) {
                this.showError('الموعد غير موجود');
                return;
            }
            
            await storeDB.update('appointments', appointmentId, {
                ...appointment,
                status: newStatus,
                updatedAt: new Date().toISOString()
            }, this.currentUser.id);
            
            this.showSuccess(`تم تحديث حالة الموعد إلى "${this.getStatusText(newStatus)}"`);
            this.loadAppointmentsData();
            
        } catch (error) {
            console.error('خطأ في تحديث حالة الموعد:', error);
            this.showError('فشل في تحديث حالة الموعد');
        }
    }

    // حذف موعد
    async deleteAppointment(appointmentId) {
        if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الموعد؟')) {
            return;
        }
        
        try {
            await storeDB.delete('appointments', appointmentId, this.currentUser.id);
            this.showSuccess('تم حذف الموعد بنجاح');
            this.loadAppointmentsData();
            
        } catch (error) {
            console.error('خطأ في حذف الموعد:', error);
            this.showError('فشل في حذف الموعد');
        }
    }

    // عرض نافذة إضافة موعد
    showAddAppointmentModal() {
        const modal = document.getElementById('addAppointmentModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderAppointmentForm();
    }

    // عرض نافذة تحرير موعد
    showEditAppointmentModal(appointment) {
        const modal = document.getElementById('addAppointmentModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderAppointmentForm(appointment);
    }

    // عرض نموذج الموعد
    async renderAppointmentForm(appointment = null) {
        const modalBody = document.querySelector('#addAppointmentModal .modal-body');
        if (!modalBody) return;
        
        const isEdit = !!appointment;
        const patients = await storeDB.getAll('patients');
        const users = await storeDB.getAll('users');
        const doctors = users.filter(user => user.role === 'doctor' && user.isActive);
        
        const formHTML = `
            <form id="appointmentForm" class="appointment-form">
                <div class="form-group">
                    <label for="appointmentPatient">المريض *</label>
                    <select id="appointmentPatient" required>
                        <option value="">اختر المريض</option>
                        ${patients.map(patient => `
                            <option value="${patient.id}" ${isEdit && appointment.patientId === patient.id ? 'selected' : ''}>
                                ${patient.name} - ${patient.phone || 'لا يوجد هاتف'}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="appointmentDoctor">الطبيب *</label>
                    <select id="appointmentDoctor" required>
                        <option value="">اختر الطبيب</option>
                        ${doctors.map(doctor => `
                            <option value="${doctor.id}" ${isEdit && appointment.doctorId === doctor.id ? 'selected' : ''}>
                                د. ${doctor.fullName || doctor.username}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="appointmentDate">التاريخ *</label>
                    <input type="date" id="appointmentDate" value="${isEdit ? appointment.date.split('T')[0] : ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="appointmentTime">الوقت *</label>
                    <input type="time" id="appointmentTime" value="${isEdit ? this.formatTimeForInput(appointment.date) : '08:00'}" required>
                </div>
                
                <div class="form-group">
                    <label for="appointmentDuration">المدة (دقيقة)</label>
                    <input type="number" id="appointmentDuration" value="${isEdit ? appointment.duration : 30}" min="15" max="180" step="15">
                </div>
                
                <div class="form-group">
                    <label for="appointmentType">نوع الموعد</label>
                    <select id="appointmentType">
                        <option value="كشف عام" ${isEdit && appointment.type === 'كشف عام' ? 'selected' : ''}>كشف عام</option>
                        <option value="كشف أخصائي" ${isEdit && appointment.type === 'كشف أخصائي' ? 'selected' : ''}>كشف أخصائي</option>
                        <option value="كشف طوارئ" ${isEdit && appointment.type === 'كشف طوارئ' ? 'selected' : ''}>كشف طوارئ</option>
                        <option value="متابعة" ${isEdit && appointment.type === 'متابعة' ? 'selected' : ''}>متابعة</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="appointmentStatus">الحالة</label>
                    <select id="appointmentStatus">
                        <option value="scheduled" ${isEdit && appointment.status === 'scheduled' ? 'selected' : ''}>مجدول</option>
                        <option value="confirmed" ${isEdit && appointment.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
                        <option value="completed" ${isEdit && appointment.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                        <option value="cancelled" ${isEdit && appointment.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
                    </select>
                </div>
                
                <div class="form-group form-group-full">
                    <label for="appointmentNotes">ملاحظات</label>
                    <textarea id="appointmentNotes" rows="3">${isEdit ? appointment.notes || '' : ''}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="dashboard.closeAppointmentModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'تحديث الموعد' : 'إضافة الموعد'}
                    </button>
                </div>
            </form>
        `;
        
        modalBody.innerHTML = formHTML;
        
        // إضافة مستمع الحدث للنموذج
        const form = document.getElementById('appointmentForm');
        form.addEventListener('submit', (e) => this.handleAppointmentSubmit(e, isEdit, appointment?.id));
    }

    // معالجة تقديم نموذج الموعد
    async handleAppointmentSubmit(event, isEdit = false, appointmentId = null) {
        event.preventDefault();
        
        try {
            const formData = {
                patientId: parseInt(document.getElementById('appointmentPatient').value),
                doctorId: parseInt(document.getElementById('appointmentDoctor').value),
                date: `${document.getElementById('appointmentDate').value}T${document.getElementById('appointmentTime').value}`,
                duration: parseInt(document.getElementById('appointmentDuration').value) || 30,
                type: document.getElementById('appointmentType').value,
                status: document.getElementById('appointmentStatus').value,
                notes: document.getElementById('appointmentNotes').value,
                updatedAt: new Date().toISOString()
            };
            
            if (!formData.patientId || !formData.doctorId || !formData.date) {
                this.showError('يرجى ملء جميع الحقول المطلوبة');
                return;
            }
            
            // التحقق من تعارض المواعيد
            const conflictCheck = await storeDB.checkAppointmentConflict(formData);
            if (conflictCheck.hasConflict) {
                this.showError(`تعارض في الموعد: ${conflictCheck.reason}`);
                return;
            }
            
            if (isEdit) {
                // تحديث الموعد الموجود
                await storeDB.update('appointments', appointmentId, formData, this.currentUser.id);
                this.showSuccess('تم تحديث الموعد بنجاح');
            } else {
                // إضافة موعد جديد
                formData.createdAt = new Date().toISOString();
                await storeDB.addAppointment(formData, this.currentUser.id);
                this.showSuccess('تم إضافة الموعد بنجاح');
            }
            
            this.closeAppointmentModal();
            this.loadAppointmentsData();
            
        } catch (error) {
            console.error('خطأ في حفظ الموعد:', error);
            this.showError('فشل في حفظ الموعد');
        }
    }

    // إغلاق نافذة الموعد
    closeAppointmentModal() {
        const modal = document.getElementById('addAppointmentModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // دوال مساعدة إضافية
    formatTimeForInput(dateString) {
        if (!dateString) return '08:00';
        const date = new Date(dateString);
        return date.toTimeString().slice(0, 5);
    }

    showSuccess(message) {
        // يمكن استخدام مكتبة مثل Toastify أو SweetAlert
        alert(`✅ ${message}`);
    }

    // ... باقي الدوال الحالية ...
}

// جعل الكائن متاحاً globally للاستخدام في event handlers
window.dashboard = new Dashboard();

class Dashboard {
    // ... الكود الحالي ...

    // تحميل بيانات المرضى
    async loadPatientsData() {
        try {
            console.log('جاري تحميل بيانات المرضى...');
            
            // تحميل جميع المرضى
            const patients = await storeDB.getAll('patients');
            const appointments = await storeDB.getAll('appointments');
            
            // تحديث الإحصائيات
            this.updatePatientsStats(patients, appointments);
            
            // تحديث العروض
            this.renderPatientsCards(patients, appointments);
            this.renderPatientsTable(patients, appointments);
            
            console.log('تم تحميل بيانات المرضى بنجاح');
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات المرضى:', error);
            this.showError('فشل في تحميل بيانات المرضى');
        }
    }

    // تحديث إحصائيات المرضى
    updatePatientsStats(patients, appointments) {
        const today = new Date().toISOString().split('T')[0];
        
        const totalPatients = patients.length;
        const newPatientsToday = patients.filter(patient => 
            patient.createdAt && patient.createdAt.startsWith(today)
        ).length;
        
        const activePatients = patients.filter(patient => 
            patient.isActive !== false
        ).length;
        
        const inactivePatients = totalPatients - activePatients;
        
        // حساب المرضى الذين لديهم مواعيد
        const patientsWithAppointments = new Set(
            appointments.map(apt => apt.patientId)
        ).size;

        document.getElementById('totalPatientsCount').textContent = totalPatients.toLocaleString();
        document.getElementById('newPatientsToday').textContent = newPatientsToday.toLocaleString();
        document.getElementById('patientsWithAppointments').textContent = patientsWithAppointments.toLocaleString();
        document.getElementById('inactivePatients').textContent = inactivePatients.toLocaleString();
    }

    // عرض المرضى في البطاقات
    renderPatientsCards(patients, appointments) {
        const patientsGrid = document.getElementById('patientsGrid');
        if (!patientsGrid) return;
        
        if (patients.length === 0) {
            patientsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-user-times"></i>
                    <p>لا توجد بيانات مرضى</p>
                    <button class="btn btn-primary" onclick="dashboard.showAddPatientModal()">
                        <i class="fas fa-plus"></i>
                        إضافة أول مريض
                    </button>
                </div>
            `;
            return;
        }
        
        // ترتيب المرضى من الأحدث إلى الأقدم
        const sortedPatients = patients.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        patientsGrid.innerHTML = sortedPatients.map(patient => {
            const patientAppointments = appointments.filter(apt => apt.patientId === patient.id);
            const lastAppointment = patientAppointments
                .filter(apt => apt.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
            const totalVisits = patientAppointments.filter(apt => 
                apt.status === 'completed'
            ).length;
            
            return `
                <div class="patient-card">
                    <div class="patient-card-header">
                        <div class="patient-code">${patient.patientCode || 'N/A'}</div>
                        <div class="patient-avatar">
                            ${this.getPatientInitials(patient.name)}
                        </div>
                        <div class="patient-name">${patient.name || 'مريض'}</div>
                        <div class="patient-age">${this.calculateAge(patient.birthDate)} سنة</div>
                    </div>
                    
                    <div class="patient-card-body">
                        <div class="patient-info">
                            <div class="info-item">
                                <i class="fas fa-id-card"></i>
                                <span class="label">الهوية:</span>
                                <span class="value">${patient.nationalId || 'غير مسجل'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <span class="label">الهاتف:</span>
                                <span class="value">${patient.phone || 'غير مسجل'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-tint"></i>
                                <span class="label">فصيلة الدم:</span>
                                <span class="value">${patient.bloodType || 'غير معروفة'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span class="label">المدينة:</span>
                                <span class="value">${patient.city || 'غير مسجل'}</span>
                            </div>
                        </div>
                        
                        <div class="patient-stats">
                            <div class="stat-item">
                                <span class="stat-value">${totalVisits}</span>
                                <span class="stat-label">زيارات</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${patientAppointments.length}</span>
                                <span class="stat-label">مواعيد</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${this.getPatientStatus(patient)}</span>
                                <span class="stat-label">الحالة</span>
                            </div>
                        </div>
                        
                        <div class="patient-card-actions">
                            <button class="btn btn-primary btn-sm" onclick="dashboard.viewPatientDetails(${patient.id})">
                                <i class="fas fa-eye"></i>
                                عرض
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="dashboard.editPatient(${patient.id})">
                                <i class="fas fa-edit"></i>
                                تعديل
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="dashboard.showPatientHistory(${patient.id})">
                                <i class="fas fa-history"></i>
                                السجل
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // عرض المرضى في الجدول
    renderPatientsTable(patients, appointments) {
        const tableBody = document.getElementById('patientsTableBody');
        if (!tableBody) return;
        
        if (patients.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-user-times"></i>
                        <p>لا توجد بيانات مرضى</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // ترتيب المرضى من الأحدث إلى الأقدم
        const sortedPatients = patients.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        tableBody.innerHTML = sortedPatients.map(patient => {
            const patientAppointments = appointments.filter(apt => apt.patientId === patient.id);
            const lastAppointment = patientAppointments
                .filter(apt => apt.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
            const totalVisits = patientAppointments.filter(apt => 
                apt.status === 'completed'
            ).length;
            
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="patient-checkbox" value="${patient.id}">
                    </td>
                    <td>
                        <strong>${patient.patientCode || 'N/A'}</strong>
                    </td>
                    <td>
                        <div class="patient-mini-card">
                            <div class="mini-avatar">
                                ${this.getPatientInitials(patient.name)}
                            </div>
                            <div class="mini-info">
                                <div class="mini-name">${patient.name || 'مريض'}</div>
                                <div class="mini-contact">${patient.email || 'لا يوجد بريد'}</div>
                            </div>
                        </div>
                    </td>
                    <td>${this.calculateAge(patient.birthDate)}</td>
                    <td>${patient.phone || 'غير مسجل'}</td>
                    <td>
                        <span class="blood-type ${patient.bloodType ? 'has-blood-type' : 'no-blood-type'}">
                            ${patient.bloodType || 'غير معروفة'}
                        </span>
                    </td>
                    <td>
                        ${lastAppointment ? this.formatDate(lastAppointment.date) : 'لا توجد زيارات'}
                    </td>
                    <td>
                        <span class="visits-count ${totalVisits > 0 ? 'has-visits' : 'no-visits'}">
                            ${totalVisits}
                        </span>
                    </td>
                    <td>
                        <span class="status-indicator status-${patient.isActive !== false ? 'active' : 'inactive'}">
                            ${patient.isActive !== false ? 'نشط' : 'غير نشط'}
                        </span>
                    </td>
                    <td>
                        <div class="patient-actions">
                            <button class="action-btn-sm btn-view" onclick="dashboard.viewPatientDetails(${patient.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-sm btn-edit" onclick="dashboard.editPatient(${patient.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn-sm btn-history" onclick="dashboard.showPatientHistory(${patient.id})" title="السجل الطبي">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="action-btn-sm btn-delete" onclick="dashboard.deletePatient(${patient.id})" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // تحديث الترقيم
        this.updatePatientsPagination(patients.length);
    }

    // تحديث ترقيم الصفحات للمرضى
    updatePatientsPagination(totalItems) {
        const pagination = document.getElementById('patientsPagination');
        if (!pagination) return;
        
        const itemsPerPage = 10;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        let paginationHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="page-btn ${i === 1 ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        pagination.innerHTML = paginationHTML;
        
        // تحديث معلومات الصفحة
        document.getElementById('totalPatientsCount').textContent = totalItems.toLocaleString();
        document.getElementById('currentPatientsPageSize').textContent = Math.min(itemsPerPage, totalItems);
        
        // إضافة أحداث النقر لأزرار الصفحات
        pagination.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pagination.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // هنا يمكن إضافة منطق تحميل الصفحة
            });
        });
    }

    // دوال مساعدة للمرضى
    getPatientInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    }

    calculateAge(birthDate) {
        if (!birthDate) return 'غير معروف';
        
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    getPatientStatus(patient) {
        return patient.isActive !== false ? 'نشط' : 'غير نشط';
    }

    // عرض تفاصيل المريض
    async viewPatientDetails(patientId) {
        try {
            const patient = await storeDB.get('patients', patientId);
            if (!patient) {
                this.showError('المريض غير موجود');
                return;
            }
            
            // تحميل السجل الطبي الكامل
            const medicalHistory = await storeDB.getPatientMedicalHistory(patientId);
            this.showPatientDetailsModal(patient, medicalHistory);
            
        } catch (error) {
            console.error('خطأ في عرض تفاصيل المريض:', error);
            this.showError('فشل في تحميل بيانات المريض');
        }
    }

    // عرض نافذة تفاصيل المريض
    showPatientDetailsModal(patient, medicalHistory) {
        // يمكن استخدام SweetAlert أو إنشاء نافذة مخصصة
        const modalHTML = `
            <div class="patient-details-modal">
                <div class="patient-header">
                    <div class="patient-avatar-large">
                        ${this.getPatientInitials(patient.name)}
                    </div>
                    <div class="patient-info-main">
                        <h3>${patient.name || 'مريض'}</h3>
                        <p>كود المريض: ${patient.patientCode || 'N/A'}</p>
                        <p>العمر: ${this.calculateAge(patient.birthDate)} سنة</p>
                    </div>
                </div>
                
                <div class="patient-details-grid">
                    <div class="detail-section">
                        <h4>المعلومات الشخصية</h4>
                        <div class="detail-item">
                            <span class="label">الهوية الوطنية:</span>
                            <span class="value">${patient.nationalId || 'غير مسجل'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">الجنس:</span>
                            <span class="value">${patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">فصيلة الدم:</span>
                            <span class="value">${patient.bloodType || 'غير معروفة'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>معلومات الاتصال</h4>
                        <div class="detail-item">
                            <span class="label">الهاتف:</span>
                            <span class="value">${patient.phone || 'غير مسجل'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">البريد الإلكتروني:</span>
                            <span class="value">${patient.email || 'غير مسجل'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">العنوان:</span>
                            <span class="value">${patient.address || 'غير مسجل'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="medical-summary">
                    <h4>ملخص طبي</h4>
                    <div class="summary-stats">
                        <div class="summary-stat">
                            <span class="number">${medicalHistory.appointments.length}</span>
                            <span class="label">موعد</span>
                        </div>
                        <div class="summary-stat">
                            <span class="number">${medicalHistory.prescriptions.length}</span>
                            <span class="label">وصفة</span>
                        </div>
                        <div class="summary-stat">
                            <span class="number">${medicalHistory.labResults.length}</span>
                            <span class="label">تحليل</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // استخدام SweetAlert أو إنشاء نافذة مخصصة
        this.showCustomModal('تفاصيل المريض', modalHTML, 'large');
    }

    // تحرير مريض
    async editPatient(patientId) {
        try {
            const patient = await storeDB.get('patients', patientId);
            if (!patient) {
                this.showError('المريض غير موجود');
                return;
            }
            
            this.showEditPatientModal(patient);
            
        } catch (error) {
            console.error('خطأ في تحرير المريض:', error);
            this.showError('فشل في تحرير المريض');
        }
    }

    // عرض السجل الطبي للمريض
    async showPatientHistory(patientId) {
        try {
            const medicalHistory = await storeDB.getPatientMedicalHistory(patientId);
            this.showPatientHistoryModal(medicalHistory);
            
        } catch (error) {
            console.error('خطأ في عرض السجل الطبي:', error);
            this.showError('فشل في تحميل السجل الطبي');
        }
    }

    // حذف مريض
    async deletePatient(patientId) {
        if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المريض؟ سيتم حذف جميع البيانات المرتبطة به.')) {
            return;
        }
        
        try {
            await storeDB.delete('patients', patientId, this.currentUser.id);
            this.showSuccess('تم حذف المريض بنجاح');
            this.loadPatientsData();
            
        } catch (error) {
            console.error('خطأ في حذف المريض:', error);
            this.showError('فشل في حذف المريض');
        }
    }

    // عرض نافذة إضافة مريض
    showAddPatientModal() {
        const modal = document.getElementById('addPatientModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderPatientForm();
    }

    // عرض نافذة تحرير مريض
    showEditPatientModal(patient) {
        const modal = document.getElementById('addPatientModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderPatientForm(patient);
    }

    // عرض نموذج المريض
    async renderPatientForm(patient = null) {
        const modalBody = document.querySelector('#addPatientModal .modal-body');
        if (!modalBody) return;
        
        const isEdit = !!patient;
        
        const formHTML = `
            <form id="patientForm" class="patient-form">
                <div class="form-section">
                    <div class="form-section-title">المعلومات الأساسية</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientName">الاسم الكامل *</label>
                            <input type="text" id="patientName" value="${isEdit ? patient.name : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="patientNationalId">الرقم الوطني</label>
                            <input type="text" id="patientNationalId" value="${isEdit ? patient.nationalId || '' : ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientBirthDate">تاريخ الميلاد</label>
                            <input type="date" id="patientBirthDate" value="${isEdit && patient.birthDate ? patient.birthDate.split('T')[0] : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="patientGender">الجنس</label>
                            <select id="patientGender">
                                <option value="">اختر الجنس</option>
                                <option value="male" ${isEdit && patient.gender === 'male' ? 'selected' : ''}>ذكر</option>
                                <option value="female" ${isEdit && patient.gender === 'female' ? 'selected' : ''}>أنثى</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">معلومات الاتصال</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientPhone">رقم الهاتف *</label>
                            <input type="tel" id="patientPhone" value="${isEdit ? patient.phone || '' : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="patientEmail">البريد الإلكتروني</label>
                            <input type="email" id="patientEmail" value="${isEdit ? patient.email || '' : ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientAddress">العنوان</label>
                            <input type="text" id="patientAddress" value="${isEdit ? patient.address || '' : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="patientCity">المدينة</label>
                            <input type="text" id="patientCity" value="${isEdit ? patient.city || '' : ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">المعلومات الطبية</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientBloodType">فصيلة الدم</label>
                            <select id="patientBloodType">
                                <option value="">اختر فصيلة الدم</option>
                                <option value="A+" ${isEdit && patient.bloodType === 'A+' ? 'selected' : ''}>A+</option>
                                <option value="A-" ${isEdit && patient.bloodType === 'A-' ? 'selected' : ''}>A-</option>
                                <option value="B+" ${isEdit && patient.bloodType === 'B+' ? 'selected' : ''}>B+</option>
                                <option value="B-" ${isEdit && patient.bloodType === 'B-' ? 'selected' : ''}>B-</option>
                                <option value="AB+" ${isEdit && patient.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
                                <option value="AB-" ${isEdit && patient.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
                                <option value="O+" ${isEdit && patient.bloodType === 'O+' ? 'selected' : ''}>O+</option>
                                <option value="O-" ${isEdit && patient.bloodType === 'O-' ? 'selected' : ''}>O-</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="patientAllergies">الحساسيات</label>
                            <input type="text" id="patientAllergies" value="${isEdit ? patient.allergies || '' : ''}" placeholder="مثل: البنسلين، المكسرات...">
                        </div>
                    </div>
                    
                    <div class="form-group form-group-full">
                        <label for="patientMedicalHistory">السجل الطبي</label>
                        <textarea id="patientMedicalHistory" rows="3" placeholder="أمراض مزمنة، عمليات سابقة...">${isEdit ? patient.medicalHistory || '' : ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">إعدادات إضافية</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientStatus">حالة المريض</label>
                            <select id="patientStatus">
                                <option value="active" ${isEdit && patient.isActive !== false ? 'selected' : ''}>نشط</option>
                                <option value="inactive" ${isEdit && patient.isActive === false ? 'selected' : ''}>غير نشط</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="patientCategory">التصنيف</label>
                            <select id="patientCategory">
                                <option value="general" ${isEdit && patient.category === 'general' ? 'selected' : ''}>عام</option>
                                <option value="children" ${isEdit && patient.category === 'children' ? 'selected' : ''}>أطفال</option>
                                <option value="adults" ${isEdit && patient.category === 'adults' ? 'selected' : ''}>كبار</option>
                                <option value="chronic" ${isEdit && patient.category === 'chronic' ? 'selected' : ''}>مرضى مزمنين</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="dashboard.closePatientModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'تحديث المريض' : 'إضافة المريض'}
                    </button>
                </div>
            </form>
        `;
        
        modalBody.innerHTML = formHTML;
        
        // إضافة مستمع الحدث للنموذج
        const form = document.getElementById('patientForm');
        form.addEventListener('submit', (e) => this.handlePatientSubmit(e, isEdit, patient?.id));
    }

    // معالجة تقديم نموذج المريض
    async handlePatientSubmit(event, isEdit = false, patientId = null) {
        event.preventDefault();
        
        try {
            const formData = {
                name: document.getElementById('patientName').value,
                nationalId: document.getElementById('patientNationalId').value,
                birthDate: document.getElementById('patientBirthDate').value,
                gender: document.getElementById('patientGender').value,
                phone: document.getElementById('patientPhone').value,
                email: document.getElementById('patientEmail').value,
                address: document.getElementById('patientAddress').value,
                city: document.getElementById('patientCity').value,
                bloodType: document.getElementById('patientBloodType').value,
                allergies: document.getElementById('patientAllergies').value,
                medicalHistory: document.getElementById('patientMedicalHistory').value,
                isActive: document.getElementById('patientStatus').value === 'active',
                category: document.getElementById('patientCategory').value,
                updatedAt: new Date().toISOString()
            };
            
            if (!formData.name || !formData.phone) {
                this.showError('يرجى ملء جميع الحقول المطلوبة');
                return;
            }
            
            if (isEdit) {
                // تحديث المريض الموجود
                await storeDB.updatePatient(patientId, formData, this.currentUser.id);
                this.showSuccess('تم تحديث المريض بنجاح');
            } else {
                // إضافة مريض جديد
                formData.createdAt = new Date().toISOString();
                await storeDB.addPatient(formData, this.currentUser.id);
                this.showSuccess('تم إضافة المريض بنجاح');
            }
            
            this.closePatientModal();
            this.loadPatientsData();
            
        } catch (error) {
            console.error('خطأ في حفظ المريض:', error);
            this.showError(error.message || 'فشل في حفظ المريض');
        }
    }

    // إغلاق نافذة المريض
    closePatientModal() {
        const modal = document.getElementById('addPatientModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // دوال إضافية للعرض
    showCustomModal(title, content, size = 'medium') {
        // تنفيذ نافذة مخصصة أو استخدام SweetAlert
        const modal = document.createElement('div');
        modal.className = `modal show`;
        modal.innerHTML = `
            <div class="modal-content ${size}">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ... باقي الدوال الحالية ...
}

// جعل الكائن متاحاً globally للاستخدام في event handlers
window.dashboard = new Dashboard();

class Dashboard {
    // ... الكود الحالي ...

    // تحميل بيانات السجلات الطبية
    async loadMedicalRecordsData() {
        try {
            console.log('جاري تحميل بيانات السجلات الطبية...');
            
            // تحميل جميع السجلات الطبية
            const medicalRecords = await storeDB.getAll('medicalRecords');
            const patients = await storeDB.getAll('patients');
            const users = await storeDB.getAll('users');
            const appointments = await storeDB.getAll('appointments');
            
            // تحديث الإحصائيات
            this.updateMedicalRecordsStats(medicalRecords);
            
            // تحديث العروض
            this.renderMedicalRecordsCards(medicalRecords, patients, users, appointments);
            this.renderMedicalRecordsTable(medicalRecords, patients, users, appointments);
            
            // تحديث الفلاتر
            this.updateDoctorsFilter(users);
            
            console.log('تم تحميل بيانات السجلات الطبية بنجاح');
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات السجلات الطبية:', error);
            this.showError('فشل في تحميل بيانات السجلات الطبية');
        }
    }

    // تحديث إحصائيات السجلات الطبية
    updateMedicalRecordsStats(medicalRecords) {
        const today = new Date().toISOString().split('T')[0];
        
        const totalRecords = medicalRecords.length;
        const recordsToday = medicalRecords.filter(record => 
            record.date && record.date.startsWith(today)
        ).length;
        
        const followUpRecords = medicalRecords.filter(record => 
            record.status === 'followup'
        ).length;
        
        const criticalRecords = medicalRecords.filter(record => 
            record.severity === 'critical'
        ).length;

        document.getElementById('totalMedicalRecords').textContent = totalRecords.toLocaleString();
        document.getElementById('recordsToday').textContent = recordsToday.toLocaleString();
        document.getElementById('followUpRecords').textContent = followUpRecords.toLocaleString();
        document.getElementById('criticalRecords').textContent = criticalRecords.toLocaleString();
    }

    // عرض السجلات الطبية في البطاقات
    renderMedicalRecordsCards(medicalRecords, patients, users, appointments) {
        const recordsGrid = document.getElementById('medicalRecordsGrid');
        if (!recordsGrid) return;
        
        if (medicalRecords.length === 0) {
            recordsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-file-medical-alt"></i>
                    <p>لا توجد سجلات طبية</p>
                    <button class="btn btn-primary" onclick="dashboard.showAddMedicalRecordModal()">
                        <i class="fas fa-plus"></i>
                        إضافة أول سجل طبي
                    </button>
                </div>
            `;
            return;
        }
        
        // ترتيب السجلات من الأحدث إلى الأقدم
        const sortedRecords = medicalRecords.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        recordsGrid.innerHTML = sortedRecords.map(record => {
            const patient = patients.find(p => p.id === record.patientId);
            const doctor = users.find(u => u.id === record.doctorId);
            const appointment = appointments.find(a => a.id === record.appointmentId);
            
            return `
                <div class="medical-record-card ${record.severity || 'low'}">
                    <div class="record-card-header">
                        <div class="record-patient-info">
                            <div class="record-patient-avatar">
                                ${this.getPatientInitials(patient?.name)}
                            </div>
                            <div class="record-patient-details">
                                <h4>${patient?.name || 'مريض'}</h4>
                                <div class="patient-meta">
                                    ${this.calculateAge(patient?.birthDate)} سنة • ${patient?.bloodType || 'فصيلة غير معروفة'}
                                </div>
                            </div>
                        </div>
                        <div class="record-meta">
                            <span class="record-type-badge badge-${record.type || 'consultation'}">
                                ${this.getRecordTypeText(record.type)}
                            </span>
                            <span>${this.formatDate(record.date)}</span>
                        </div>
                    </div>
                    
                    <div class="record-card-body">
                        ${record.diagnosis ? `
                            <div class="record-diagnosis">
                                <div class="diagnosis-title">
                                    <i class="fas fa-diagnoses"></i>
                                    التشخيص
                                </div>
                                <div class="diagnosis-text">
                                    ${record.diagnosis}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${record.treatment && record.treatment.length > 0 ? `
                            <div class="record-treatment">
                                <div class="treatment-title">
                                    <i class="fas fa-pills"></i>
                                    العلاج
                                </div>
                                <ul class="treatment-list">
                                    ${record.treatment.slice(0, 3).map(med => `
                                        <li class="treatment-item">
                                            <span class="medication-name">${med.name}</span>
                                            <span class="medication-dosage">${med.dosage}</span>
                                        </li>
                                    `).join('')}
                                    ${record.treatment.length > 3 ? `
                                        <li class="treatment-item">
                                            <span class="text-muted">+ ${record.treatment.length - 3} دواء إضافي</span>
                                        </li>
                                    ` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${record.vitals ? `
                            <div class="record-vitals">
                                ${record.vitals.temperature ? `
                                    <div class="vital-item">
                                        <span class="vital-value">${record.vitals.temperature}°</span>
                                        <span class="vital-label">الحرارة</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.bloodPressure ? `
                                    <div class="vital-item">
                                        <span class="vital-value">${record.vitals.bloodPressure}</span>
                                        <span class="vital-label">الضغط</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.heartRate ? `
                                    <div class="vital-item">
                                        <span class="vital-value">${record.vitals.heartRate}</span>
                                        <span class="vital-label">النبض</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="record-card-footer">
                        <div class="record-status">
                            <span class="status-indicator status-${record.status || 'active'}"></span>
                            <span>${this.getRecordStatusText(record.status)}</span>
                            ${record.severity ? `
                                <span class="severity-badge severity-${record.severity}">
                                    ${this.getSeverityText(record.severity)}
                                </span>
                            ` : ''}
                        </div>
                        <div class="record-actions">
                            <button class="action-btn-sm btn-view" onclick="dashboard.viewMedicalRecordDetails(${record.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-sm btn-edit" onclick="dashboard.editMedicalRecord(${record.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn-sm btn-history" onclick="dashboard.printMedicalRecord(${record.id})" title="طباعة">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // عرض السجلات الطبية في الجدول
    renderMedicalRecordsTable(medicalRecords, patients, users, appointments) {
        const tableBody = document.getElementById('medicalRecordsTableBody');
        if (!tableBody) return;
        
        if (medicalRecords.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-file-medical-alt"></i>
                        <p>لا توجد سجلات طبية</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // ترتيب السجلات من الأحدث إلى الأقدم
        const sortedRecords = medicalRecords.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        tableBody.innerHTML = sortedRecords.map(record => {
            const patient = patients.find(p => p.id === record.patientId);
            const doctor = users.find(u => u.id === record.doctorId);
            
            return `
                <tr class="${record.severity || 'low'}">
                    <td>
                        <input type="checkbox" class="record-checkbox" value="${record.id}">
                    </td>
                    <td>
                        <strong>MR-${record.id.toString().padStart(6, '0')}</strong>
                    </td>
                    <td>
                        <div class="patient-mini-card">
                            <div class="mini-avatar">
                                ${this.getPatientInitials(patient?.name)}
                            </div>
                            <div class="mini-info">
                                <div class="mini-name">${patient?.name || 'مريض'}</div>
                                <div class="mini-contact">${this.calculateAge(patient?.birthDate)} سنة</div>
                            </div>
                        </div>
                    </td>
                    <td>${this.formatDate(record.date)}</td>
                    <td>
                        <span class="record-type-badge badge-${record.type || 'consultation'}">
                            ${this.getRecordTypeText(record.type)}
                        </span>
                    </td>
                    <td>
                        <div class="diagnosis-preview">
                            ${record.diagnosis ? 
                                record.diagnosis.substring(0, 50) + (record.diagnosis.length > 50 ? '...' : '') 
                                : 'لا يوجد تشخيص'
                            }
                        </div>
                    </td>
                    <td>${doctor ? `د. ${doctor.fullName}` : 'طبيب'}</td>
                    <td>
                        <span class="status-indicator status-${record.status || 'active'}"></span>
                        ${this.getRecordStatusText(record.status)}
                    </td>
                    <td>
                        ${record.severity ? `
                            <span class="severity-badge severity-${record.severity}">
                                ${this.getSeverityText(record.severity)}
                            </span>
                        ` : '--'}
                    </td>
                    <td>
                        <div class="patient-actions">
                            <button class="action-btn-sm btn-view" onclick="dashboard.viewMedicalRecordDetails(${record.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-sm btn-edit" onclick="dashboard.editMedicalRecord(${record.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn-sm btn-print" onclick="dashboard.printMedicalRecord(${record.id})" title="طباعة">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="action-btn-sm btn-delete" onclick="dashboard.deleteMedicalRecord(${record.id})" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // تحديث الترقيم
        this.updateMedicalRecordsPagination(medicalRecords.length);
    }

    // دوال مساعدة للسجلات الطبية
    getRecordTypeText(type) {
        const typeMap = {
            'consultation': 'كشف',
            'followup': 'متابعة',
            'emergency': 'طوارئ',
            'surgery': 'عملية',
            'lab': 'مختبر',
            'radiology': 'أشعة'
        };
        return typeMap[type] || type || 'كشف';
    }

    getRecordStatusText(status) {
        const statusMap = {
            'active': 'نشط',
            'resolved': 'منتهي',
            'critical': 'حرج',
            'followup': 'متابعة'
        };
        return statusMap[status] || status || 'نشط';
    }

    getSeverityText(severity) {
        const severityMap = {
            'low': 'منخفض',
            'medium': 'متوسط',
            'high': 'عالي',
            'critical': 'حرج'
        };
        return severityMap[severity] || severity || 'منخفض';
    }

    // عرض تفاصيل السجل الطبي
    async viewMedicalRecordDetails(recordId) {
        try {
            const record = await storeDB.get('medicalRecords', recordId);
            if (!record) {
                this.showError('السجل الطبي غير موجود');
                return;
            }
            
            const patient = await storeDB.get('patients', record.patientId);
            const doctor = await storeDB.get('users', record.doctorId);
            const appointment = record.appointmentId ? await storeDB.get('appointments', record.appointmentId) : null;
            
            this.showMedicalRecordDetailsModal(record, patient, doctor, appointment);
            
        } catch (error) {
            console.error('خطأ في عرض تفاصيل السجل الطبي:', error);
            this.showError('فشل في تحميل بيانات السجل الطبي');
        }
    }

    // عرض نافذة تفاصيل السجل الطبي
    showMedicalRecordDetailsModal(record, patient, doctor, appointment) {
        const modalHTML = `
            <div class="record-details-container">
                <div class="record-details-header">
                    <div class="record-details-title">
                        <div class="record-main-info">
                            <h2>السجل الطبي - ${patient?.name || 'مريض'}</h2>
                            <div class="record-meta-info">
                                <div class="meta-item">
                                    <i class="fas fa-calendar"></i>
                                    ${this.formatDate(record.date)}
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-user-md"></i>
                                    ${doctor ? `د. ${doctor.fullName}` : 'طبيب'}
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-stethoscope"></i>
                                    ${this.getRecordTypeText(record.type)}
                                </div>
                                ${record.severity ? `
                                    <div class="meta-item">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span class="severity-badge severity-${record.severity}">
                                            ${this.getSeverityText(record.severity)}
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="record-actions-bar">
                            <button class="btn btn-outline" onclick="dashboard.printMedicalRecord(${record.id})">
                                <i class="fas fa-print"></i>
                                طباعة
                            </button>
                            <button class="btn btn-primary" onclick="dashboard.editMedicalRecord(${record.id})">
                                <i class="fas fa-edit"></i>
                                تعديل
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="record-details-body">
                    ${record.diagnosis ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-diagnoses"></i>
                                التشخيص
                            </div>
                            <div class="diagnosis-text">
                                ${record.diagnosis}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${record.symptoms ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-notes-medical"></i>
                                الأعراض
                            </div>
                            <div class="detail-value">
                                ${record.symptoms}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${record.treatment && record.treatment.length > 0 ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-pills"></i>
                                العلاج الموصوف
                            </div>
                            <div class="treatment-list">
                                ${record.treatment.map((med, index) => `
                                    <div class="treatment-item">
                                        <div class="medication-info">
                                            <strong>${med.name}</strong>
                                            <div class="medication-details">
                                                الجرعة: ${med.dosage} 
                                                ${med.frequency ? `• التكرار: ${med.frequency}` : ''}
                                                ${med.duration ? `• المدة: ${med.duration}` : ''}
                                            </div>
                                            ${med.instructions ? `
                                                <div class="medication-instructions">
                                                    تعليمات: ${med.instructions}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${record.vitals ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-heartbeat"></i>
                                العلامات الحيوية
                            </div>
                            <div class="details-grid">
                                ${record.vitals.temperature ? `
                                    <div class="detail-item">
                                        <span class="detail-label">درجة الحرارة</span>
                                        <span class="detail-value">${record.vitals.temperature} °م</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.bloodPressure ? `
                                    <div class="detail-item">
                                        <span class="detail-label">ضغط الدم</span>
                                        <span class="detail-value">${record.vitals.bloodPressure}</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.heartRate ? `
                                    <div class="detail-item">
                                        <span class="detail-label">معدل النبض</span>
                                        <span class="detail-value">${record.vitals.heartRate} /دقيقة</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.respiratoryRate ? `
                                    <div class="detail-item">
                                        <span class="detail-label">معدل التنفس</span>
                                        <span class="detail-value">${record.vitals.respiratoryRate} /دقيقة</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.oxygenSaturation ? `
                                    <div class="detail-item">
                                        <span class="detail-label">تشبع الأكسجين</span>
                                        <span class="detail-value">${record.vitals.oxygenSaturation}%</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.weight ? `
                                    <div class="detail-item">
                                        <span class="detail-label">الوزن</span>
                                        <span class="detail-value">${record.vitals.weight} كجم</span>
                                    </div>
                                ` : ''}
                                ${record.vitals.height ? `
                                    <div class="detail-item">
                                        <span class="detail-label">الطول</span>
                                        <span class="detail-value">${record.vitals.height} سم</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${record.notes ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-sticky-note"></i>
                                ملاحظات إضافية
                            </div>
                            <div class="detail-value">
                                ${record.notes}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${record.followUp ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-calendar-check"></i>
                                متابعة
                            </div>
                            <div class="detail-value">
                                <strong>موعد المتابعة:</strong> ${this.formatDate(record.followUp.date)}<br>
                                <strong>التوصيات:</strong> ${record.followUp.recommendations}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        this.showCustomModal('تفاصيل السجل الطبي', modalHTML, 'large');
    }

    // تحرير سجل طبي
    async editMedicalRecord(recordId) {
        try {
            const record = await storeDB.get('medicalRecords', recordId);
            if (!record) {
                this.showError('السجل الطبي غير موجود');
                return;
            }
            
            this.showEditMedicalRecordModal(record);
            
        } catch (error) {
            console.error('خطأ في تحرير السجل الطبي:', error);
            this.showError('فشل في تحرير السجل الطبي');
        }
    }

    // طباعة السجل الطبي
    async printMedicalRecord(recordId) {
        try {
            const record = await storeDB.get('medicalRecords', recordId);
            if (!record) {
                this.showError('السجل الطبي غير موجود');
                return;
            }
            
            // تنفيذ منطق الطباعة
            this.showPrintPreview(record);
            
        } catch (error) {
            console.error('خطأ في طباعة السجل الطبي:', error);
            this.showError('فشل في طباعة السجل الطبي');
        }
    }

    // حذف سجل طبي
    async deleteMedicalRecord(recordId) {
        if (!confirm('هل أنت متأكد من رغبتك في حذف هذا السجل الطبي؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }
        
        try {
            await storeDB.delete('medicalRecords', recordId, this.currentUser.id);
            this.showSuccess('تم حذف السجل الطبي بنجاح');
            this.loadMedicalRecordsData();
            
        } catch (error) {
            console.error('خطأ في حذف السجل الطبي:', error);
            this.showError('فشل في حذف السجل الطبي');
        }
    }

    // عرض نافذة إضافة سجل طبي
    showAddMedicalRecordModal() {
        const modal = document.getElementById('addMedicalRecordModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderMedicalRecordForm();
    }

    // عرض نافذة تحرير سجل طبي
    showEditMedicalRecordModal(record) {
        const modal = document.getElementById('addMedicalRecordModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderMedicalRecordForm(record);
    }

    // عرض نموذج السجل الطبي
    async renderMedicalRecordForm(record = null) {
        const modalBody = document.querySelector('#addMedicalRecordModal .modal-body');
        if (!modalBody) return;
        
        const isEdit = !!record;
        const patients = await storeDB.getAll('patients');
        const users = await storeDB.getAll('users');
        const doctors = users.filter(user => user.role === 'doctor' && user.isActive);
        const appointments = await storeDB.getAll('appointments');
        
        const formHTML = `
            <form id="medicalRecordForm" class="medical-record-form">
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-user-injured"></i>
                        معلومات المريض والموعد
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recordPatient">المريض *</label>
                            <select id="recordPatient" required>
                                <option value="">اختر المريض</option>
                                ${patients.map(patient => `
                                    <option value="${patient.id}" ${isEdit && record.patientId === patient.id ? 'selected' : ''}>
                                        ${patient.name} - ${patient.phone || 'لا يوجد هاتف'}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="recordDoctor">الطبيب *</label>
                            <select id="recordDoctor" required>
                                <option value="">اختر الطبيب</option>
                                ${doctors.map(doctor => `
                                    <option value="${doctor.id}" ${isEdit && record.doctorId === doctor.id ? 'selected' : ''}>
                                        د. ${doctor.fullName || doctor.username}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recordDate">تاريخ السجل *</label>
                            <input type="datetime-local" id="recordDate" value="${isEdit ? record.date.replace('T', ' ').substring(0, 16) : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="recordType">نوع السجل</label>
                            <select id="recordType">
                                <option value="consultation" ${isEdit && record.type === 'consultation' ? 'selected' : ''}>كشف</option>
                                <option value="followup" ${isEdit && record.type === 'followup' ? 'selected' : ''}>متابعة</option>
                                <option value="emergency" ${isEdit && record.type === 'emergency' ? 'selected' : ''}>طوارئ</option>
                                <option value="surgery" ${isEdit && record.type === 'surgery' ? 'selected' : ''}>عملية</option>
                                <option value="lab" ${isEdit && record.type === 'lab' ? 'selected' : ''}>مختبر</option>
                                <option value="radiology" ${isEdit && record.type === 'radiology' ? 'selected' : ''}>أشعة</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-diagnoses"></i>
                        التشخيص والأعراض
                    </div>
                    <div class="form-group form-group-full">
                        <label for="recordSymptoms">الأعراض والشكوى</label>
                        <textarea id="recordSymptoms" rows="3" placeholder="وصف الأعراض والشكوى الرئيسية...">${isEdit ? record.symptoms || '' : ''}</textarea>
                    </div>
                    
                    <div class="form-group form-group-full">
                        <label for="recordDiagnosis">التشخيص</label>
                        <textarea id="recordDiagnosis" rows="3" placeholder="التشخيص الطبي...">${isEdit ? record.diagnosis || '' : ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-heartbeat"></i>
                        العلامات الحيوية
                    </div>
                    <div class="vitals-grid">
                        <div class="vital-input-group">
                            <label>درجة الحرارة (°م)</label>
                            <div class="vital-input">
                                <input type="number" id="vitalTemperature" step="0.1" value="${isEdit && record.vitals ? record.vitals.temperature || '' : ''}">
                                <span class="vital-unit">°م</span>
                            </div>
                        </div>
                        
                        <div class="vital-input-group">
                            <label>ضغط الدم</label>
                            <div class="vital-input">
                                <input type="text" id="vitalBloodPressure" placeholder="120/80" value="${isEdit && record.vitals ? record.vitals.bloodPressure || '' : ''}">
                            </div>
                        </div>
                        
                        <div class="vital-input-group">
                            <label>معدل النبض</label>
                            <div class="vital-input">
                                <input type="number" id="vitalHeartRate" value="${isEdit && record.vitals ? record.vitals.heartRate || '' : ''}">
                                <span class="vital-unit">/د</span>
                            </div>
                        </div>
                        
                        <div class="vital-input-group">
                            <label>معدل التنفس</label>
                            <div class="vital-input">
                                <input type="number" id="vitalRespiratoryRate" value="${isEdit && record.vitals ? record.vitals.respiratoryRate || '' : ''}">
                                <span class="vital-unit">/د</span>
                            </div>
                        </div>
                        
                        <div class="vital-input-group">
                            <label>تشبع الأكسجين</label>
                            <div class="vital-input">
                                <input type="number" id="vitalOxygenSaturation" min="0" max="100" value="${isEdit && record.vitals ? record.vitals.oxygenSaturation || '' : ''}">
                                <span class="vital-unit">%</span>
                            </div>
                        </div>
                        
                        <div class="vital-input-group">
                            <label>الوزن (كجم)</label>
                            <div class="vital-input">
                                <input type="number" id="vitalWeight" step="0.1" value="${isEdit && record.vitals ? record.vitals.weight || '' : ''}">
                                <span class="vital-unit">كجم</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-pills"></i>
                        العلاج الموصوف
                    </div>
                    <div id="medicationsContainer">
                        ${isEdit && record.treatment ? record.treatment.map((med, index) => `
                            <div class="medication-item" data-index="${index}">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>اسم الدواء</label>
                                        <input type="text" name="medicationName" value="${med.name}" placeholder="اسم الدواء">
                                    </div>
                                    <div class="form-group">
                                        <label>الجرعة</label>
                                        <input type="text" name="medicationDosage" value="${med.dosage}" placeholder="الجرعة">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>التكرار</label>
                                        <input type="text" name="medicationFrequency" value="${med.frequency || ''}" placeholder="التكرار (مثل: 3 مرات يومياً)">
                                    </div>
                                    <div class="form-group">
                                        <label>المدة</label>
                                        <input type="text" name="medicationDuration" value="${med.duration || ''}" placeholder="المدة (مثل: 7 أيام)">
                                    </div>
                                </div>
                                <div class="form-group form-group-full">
                                    <label>تعليمات</label>
                                    <input type="text" name="medicationInstructions" value="${med.instructions || ''}" placeholder="تعليمات خاصة">
                                </div>
                                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.medication-item').remove()">
                                    <i class="fas fa-trash"></i> حذف
                                </button>
                            </div>
                        `).join('') : ''}
                    </div>
                    <button type="button" class="btn btn-outline" id="addMedicationBtn">
                        <i class="fas fa-plus"></i> إضافة دواء
                    </button>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-sticky-note"></i>
                        معلومات إضافية
                    </div>
                    <div class="form-group form-group-full">
                        <label for="recordNotes">ملاحظات إضافية</label>
                        <textarea id="recordNotes" rows="3" placeholder="ملاحظات إضافية...">${isEdit ? record.notes || '' : ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recordStatus">حالة السجل</label>
                            <select id="recordStatus">
                                <option value="active" ${isEdit && record.status === 'active' ? 'selected' : ''}>نشط</option>
                                <option value="resolved" ${isEdit && record.status === 'resolved' ? 'selected' : ''}>منتهي</option>
                                <option value="critical" ${isEdit && record.status === 'critical' ? 'selected' : ''}>حرج</option>
                                <option value="followup" ${isEdit && record.status === 'followup' ? 'selected' : ''}>متابعة</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="recordSeverity">مستوى الخطورة</label>
                            <select id="recordSeverity">
                                <option value="low" ${isEdit && record.severity === 'low' ? 'selected' : ''}>منخفض</option>
                                <option value="medium" ${isEdit && record.severity === 'medium' ? 'selected' : ''}>متوسط</option>
                                <option value="high" ${isEdit && record.severity === 'high' ? 'selected' : ''}>عالي</option>
                                <option value="critical" ${isEdit && record.severity === 'critical' ? 'selected' : ''}>حرج</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="dashboard.closeMedicalRecordModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'تحديث السجل' : 'إضافة السجل'}
                    </button>
                </div>
            </form>
        `;
        
        modalBody.innerHTML = formHTML;
        
        // إضافة مستمع الحدث للنموذج
        const form = document.getElementById('medicalRecordForm');
        form.addEventListener('submit', (e) => this.handleMedicalRecordSubmit(e, isEdit, record?.id));
        
        // إضافة مستمع لزر إضافة الدواء
        document.getElementById('addMedicationBtn').addEventListener('click', () => {
            this.addMedicationField();
        });
    }

    // إضافة حقل دواء جديد
    addMedicationField() {
        const container = document.getElementById('medicationsContainer');
        const index = container.children.length;
        
        const medicationHTML = `
            <div class="medication-item" data-index="${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>اسم الدواء</label>
                        <input type="text" name="medicationName" placeholder="اسم الدواء" required>
                    </div>
                    <div class="form-group">
                        <label>الجرعة</label>
                        <input type="text" name="medicationDosage" placeholder="الجرعة" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>التكرار</label>
                        <input type="text" name="medicationFrequency" placeholder="التكرار (مثل: 3 مرات يومياً)">
                    </div>
                    <div class="form-group">
                        <label>المدة</label>
                        <input type="text" name="medicationDuration" placeholder="المدة (مثل: 7 أيام)">
                    </div>
                </div>
                <div class="form-group form-group-full">
                    <label>تعليمات</label>
                    <input type="text" name="medicationInstructions" placeholder="تعليمات خاصة">
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.medication-item').remove()">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', medicationHTML);
    }

    // معالجة تقديم نموذج السجل الطبي
    async handleMedicalRecordSubmit(event, isEdit = false, recordId = null) {
        event.preventDefault();
        
        try {
            // جمع بيانات الأدوية
            const medications = [];
            const medicationItems = document.querySelectorAll('.medication-item');
            medicationItems.forEach(item => {
                const name = item.querySelector('[name="medicationName"]').value;
                const dosage = item.querySelector('[name="medicationDosage"]').value;
                const frequency = item.querySelector('[name="medicationFrequency"]').value;
                const duration = item.querySelector('[name="medicationDuration"]').value;
                const instructions = item.querySelector('[name="medicationInstructions"]').value;
                
                if (name && dosage) {
                    medications.push({
                        name,
                        dosage,
                        frequency,
                        duration,
                        instructions
                    });
                }
            });
            
            // جمع البيانات الأساسية
            const formData = {
                patientId: parseInt(document.getElementById('recordPatient').value),
                doctorId: parseInt(document.getElementById('recordDoctor').value),
                date: document.getElementById('recordDate').value.replace(' ', 'T') + ':00',
                type: document.getElementById('recordType').value,
                symptoms: document.getElementById('recordSymptoms').value,
                diagnosis: document.getElementById('recordDiagnosis').value,
                treatment: medications,
                notes: document.getElementById('recordNotes').value,
                status: document.getElementById('recordStatus').value,
                severity: document.getElementById('recordSeverity').value,
                updatedAt: new Date().toISOString()
            };
            
            // جمع العلامات الحيوية
            const vitals = {};
            const temperature = document.getElementById('vitalTemperature').value;
            const bloodPressure = document.getElementById('vitalBloodPressure').value;
            const heartRate = document.getElementById('vitalHeartRate').value;
            const respiratoryRate = document.getElementById('vitalRespiratoryRate').value;
            const oxygenSaturation = document.getElementById('vitalOxygenSaturation').value;
            const weight = document.getElementById('vitalWeight').value;
            
            if (temperature) vitals.temperature = parseFloat(temperature);
            if (bloodPressure) vitals.bloodPressure = bloodPressure;
            if (heartRate) vitals.heartRate = parseInt(heartRate);
            if (respiratoryRate) vitals.respiratoryRate = parseInt(respiratoryRate);
            if (oxygenSaturation) vitals.oxygenSaturation = parseInt(oxygenSaturation);
            if (weight) vitals.weight = parseFloat(weight);
            
            if (Object.keys(vitals).length > 0) {
                formData.vitals = vitals;
            }
            
            if (!formData.patientId || !formData.doctorId || !formData.date) {
                this.showError('يرجى ملء جميع الحقول المطلوبة');
                return;
            }
            
            if (isEdit) {
                // تحديث السجل الموجود
                await storeDB.update('medicalRecords', recordId, formData, this.currentUser.id);
                this.showSuccess('تم تحديث السجل الطبي بنجاح');
            } else {
                // إضافة سجل جديد
                formData.createdAt = new Date().toISOString();
                await storeDB.add('medicalRecords', formData, this.currentUser.id);
                this.showSuccess('تم إضافة السجل الطبي بنجاح');
            }
            
            this.closeMedicalRecordModal();
            this.loadMedicalRecordsData();
            
        } catch (error) {
            console.error('خطأ في حفظ السجل الطبي:', error);
            this.showError('فشل في حفظ السجل الطبي');
        }
    }

    // إغلاق نافذة السجل الطبي
    closeMedicalRecordModal() {
        const modal = document.getElementById('addMedicalRecordModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // معاينة الطباعة
    showPrintPreview(record) {
        // تنفيذ نافذة معاينة الطباعة
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <title>السجل الطبي - ${record.id}</title>
                <style>
                    body { font-family: 'Tajawal', sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .section { margin-bottom: 20px; }
                    .section-title { background: #f5f5f5; padding: 10px; font-weight: bold; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>السجل الطبي</h1>
                    <p>رقم السجل: MR-${record.id.toString().padStart(6, '0')}</p>
                </div>
                <div class="section">
                    <div class="section-title">معلومات المريض</div>
                    <p>سيتم عرض معلومات المريض هنا...</p>
                </div>
                <div class="section">
                    <div class="section-title">التشخيص</div>
                    <p>${record.diagnosis || 'لا يوجد تشخيص'}</p>
                </div>
                <script>
                    window.print();
                    setTimeout(() => window.close(), 1000);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // ... باقي الدوال الحالية ...
}

// جعل الكائن متاحاً globally للاستخدام في event handlers
window.dashboard = new Dashboard();


class Dashboard {
    // ... الكود الحالي ...

    // تحميل بيانات الوصفات الطبية
    async loadPrescriptionsData() {
        try {
            console.log('جاري تحميل بيانات الوصفات الطبية...');
            
            // تحميل جميع الوصفات
            const prescriptions = await storeDB.getAll('prescriptions');
            const prescriptionItems = await storeDB.getAll('prescriptionItems');
            const medications = await storeDB.getAll('medications');
            const patients = await storeDB.getAll('patients');
            const users = await storeDB.getAll('users');
            const appointments = await storeDB.getAll('appointments');
            
            // تحديث الإحصائيات
            this.updatePrescriptionsStats(prescriptions);
            
            // تحديث العروض
            this.renderPrescriptionsCards(prescriptions, prescriptionItems, medications, patients, users, appointments);
            this.renderPrescriptionsTable(prescriptions, prescriptionItems, medications, patients, users, appointments);
            
            // تحديث الفلاتر
            this.updateDoctorsFilter(users);
            
            console.log('تم تحميل بيانات الوصفات الطبية بنجاح');
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات الوصفات الطبية:', error);
            this.showError('فشل في تحميل بيانات الوصفات الطبية');
        }
    }

    // تحديث إحصائيات الوصفات الطبية
    updatePrescriptionsStats(prescriptions) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        
        const totalPrescriptions = prescriptions.length;
        const prescriptionsToday = prescriptions.filter(pres => 
            pres.date && pres.date.startsWith(today)
        ).length;
        
        const activePrescriptions = prescriptions.filter(pres => 
            pres.status === 'active'
        ).length;
        
        const expiringPrescriptions = prescriptions.filter(pres => {
            if (!pres.expiryDate) return false;
            const expiryDate = new Date(pres.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
        }).length;

        document.getElementById('totalPrescriptions').textContent = totalPrescriptions.toLocaleString();
        document.getElementById('prescriptionsToday').textContent = prescriptionsToday.toLocaleString();
        document.getElementById('activePrescriptions').textContent = activePrescriptions.toLocaleString();
        document.getElementById('expiringPrescriptions').textContent = expiringPrescriptions.toLocaleString();
    }

    // عرض الوصفات في البطاقات
    renderPrescriptionsCards(prescriptions, prescriptionItems, medications, patients, users, appointments) {
        const prescriptionsGrid = document.getElementById('prescriptionsGrid');
        if (!prescriptionsGrid) return;
        
        if (prescriptions.length === 0) {
            prescriptionsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-prescription-bottle-alt"></i>
                    <p>لا توجد وصفات طبية</p>
                    <button class="btn btn-primary" onclick="dashboard.showAddPrescriptionModal()">
                        <i class="fas fa-plus"></i>
                        إضافة أول وصفة طبية
                    </button>
                </div>
            `;
            return;
        }
        
        // ترتيب الوصفات من الأحدث إلى الأقدم
        const sortedPrescriptions = prescriptions.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        prescriptionsGrid.innerHTML = sortedPrescriptions.map(prescription => {
            const patient = patients.find(p => p.id === prescription.patientId);
            const doctor = users.find(u => u.id === prescription.doctorId);
            const appointment = appointments.find(a => a.id === prescription.appointmentId);
            
            // الحصول على أدوية الوصفة
            const items = prescriptionItems.filter(item => item.prescriptionId === prescription.id);
            const prescriptionMedications = items.map(item => {
                const medication = medications.find(m => m.id === item.medicationId);
                return {
                    ...item,
                    medication: medication || { name: 'دواء غير معروف', category: 'غير معروف' }
                };
            });
            
            const isExpiring = this.isPrescriptionExpiring(prescription);
            const isExpired = this.isPrescriptionExpired(prescription);
            
            return `
                <div class="prescription-card ${prescription.type || 'regular'} ${isExpired ? 'expired' : isExpiring ? 'expiring' : ''}">
                    <div class="prescription-header">
                        <div class="prescription-patient-info">
                            <div class="prescription-patient-avatar">
                                ${this.getPatientInitials(patient?.name)}
                            </div>
                            <div class="prescription-patient-details">
                                <h4>${patient?.name || 'مريض'}</h4>
                                <div class="patient-meta">
                                    ${this.calculateAge(patient?.birthDate)} سنة • ${patient?.bloodType || 'فصيلة غير معروفة'}
                                </div>
                            </div>
                        </div>
                        <div class="prescription-meta">
                            <span class="prescription-number">#${prescription.prescriptionNumber || prescription.id}</span>
                            <span class="prescription-type-badge badge-${prescription.type || 'regular'}">
                                ${this.getPrescriptionTypeText(prescription.type)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="prescription-body">
                        ${prescriptionMedications.length > 0 ? `
                            <div class="medications-list">
                                ${prescriptionMedications.slice(0, 2).map(item => `
                                    <div class="medication-item">
                                        <div class="medication-header">
                                            <span class="medication-name">${item.medication.name}</span>
                                            <span class="medication-category">${item.medication.category || 'عام'}</span>
                                        </div>
                                        <div class="medication-details">
                                            <div class="medication-detail">
                                                <span class="detail-label">الجرعة</span>
                                                <span class="detail-value">${item.dosage || 'غير محدد'}</span>
                                            </div>
                                            <div class="medication-detail">
                                                <span class="detail-label">التكرار</span>
                                                <span class="detail-value">${item.frequency || 'غير محدد'}</span>
                                            </div>
                                            <div class="medication-detail">
                                                <span class="detail-label">المدة</span>
                                                <span class="detail-value">${item.duration || 'غير محدد'}</span>
                                            </div>
                                            <div class="medication-detail">
                                                <span class="detail-label">الكمية</span>
                                                <span class="detail-value">${item.quantity || 'غير محدد'}</span>
                                            </div>
                                        </div>
                                        ${item.instructions ? `
                                            <div class="medication-instructions">
                                                ${item.instructions}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                                ${prescriptionMedications.length > 2 ? `
                                    <div class="medication-item text-center">
                                        <span class="text-muted">+ ${prescriptionMedications.length - 2} دواء إضافي</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : '<p class="text-muted text-center">لا توجد أدوية في هذه الوصفة</p>'}
                        
                        <div class="prescription-duration">
                            <div class="duration-item">
                                <span class="duration-value">${this.formatDate(prescription.date)}</span>
                                <span class="duration-label">تاريخ الوصفة</span>
                            </div>
                            <div class="duration-item">
                                <span class="duration-value">${prescription.duration || 'غير محدد'}</span>
                                <span class="duration-label">مدة العلاج</span>
                            </div>
                            ${prescription.expiryDate ? `
                                <div class="duration-item">
                                    <span class="duration-value ${isExpired ? 'text-danger' : isExpiring ? 'text-warning' : ''}">
                                        ${this.formatDate(prescription.expiryDate)}
                                    </span>
                                    <span class="duration-label">انتهاء الصلاحية</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${prescription.notes ? `
                            <div class="prescription-notes">
                                <i class="fas fa-sticky-note"></i>
                                ${prescription.notes}
                            </div>
                        ` : ''}
                        
                        ${prescription.type === 'controlled' ? `
                            <div class="controlled-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                وصفة مضبوطة - تتطلب توثيق خاص
                            </div>
                        ` : ''}
                        
                        ${prescription.type === 'narcotic' ? `
                            <div class="narcotic-warning">
                                <i class="fas fa-skull-crossbones"></i>
                                وصفة مخدرة - استخدام مضبوط
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="prescription-footer">
                        <div class="prescription-status">
                            <span class="status-indicator status-${prescription.status || 'active'}"></span>
                            <span>${this.getPrescriptionStatusText(prescription.status)}</span>
                            ${isExpiring ? `
                                <span class="expiry-warning warning-high">
                                    تنتهي قريباً
                                </span>
                            ` : isExpired ? `
                                <span class="expiry-warning warning-high">
                                    منتهية
                                </span>
                            ` : ''}
                        </div>
                        <div class="prescription-actions">
                            <button class="action-btn-sm btn-view" onclick="dashboard.viewPrescriptionDetails(${prescription.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-sm btn-print" onclick="dashboard.printPrescription(${prescription.id})" title="طباعة">
                                <i class="fas fa-print"></i>
                            </button>
                            ${prescription.status === 'active' ? `
                                <button class="action-btn-sm btn-complete" onclick="dashboard.updatePrescriptionStatus(${prescription.id}, 'completed')" title="إكمال">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            <button class="action-btn-sm btn-refill" onclick="dashboard.refillPrescription(${prescription.id})" title="إعادة صرف">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // عرض الوصفات في الجدول
    renderPrescriptionsTable(prescriptions, prescriptionItems, medications, patients, users, appointments) {
        const tableBody = document.getElementById('prescriptionsTableBody');
        if (!tableBody) return;
        
        if (prescriptions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-prescription-bottle-alt"></i>
                        <p>لا توجد وصفات طبية</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // ترتيب الوصفات من الأحدث إلى الأقدم
        const sortedPrescriptions = prescriptions.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        tableBody.innerHTML = sortedPrescriptions.map(prescription => {
            const patient = patients.find(p => p.id === prescription.patientId);
            const doctor = users.find(u => u.id === prescription.doctorId);
            
            // الحصول على أدوية الوصفة
            const items = prescriptionItems.filter(item => item.prescriptionId === prescription.id);
            const prescriptionMedications = items.map(item => {
                const medication = medications.find(m => m.id === item.medicationId);
                return medication ? medication.name : 'دواء غير معروف';
            });
            
            const isExpiring = this.isPrescriptionExpiring(prescription);
            const isExpired = this.isPrescriptionExpired(prescription);
            
            return `
                <tr class="${prescription.type || 'regular'} ${isExpired ? 'expired' : isExpiring ? 'expiring' : ''}">
                    <td>
                        <input type="checkbox" class="prescription-checkbox" value="${prescription.id}">
                    </td>
                    <td>
                        <strong>${prescription.prescriptionNumber || `RX-${prescription.id.toString().padStart(6, '0')}`}</strong>
                    </td>
                    <td>
                        <div class="patient-mini-card">
                            <div class="mini-avatar">
                                ${this.getPatientInitials(patient?.name)}
                            </div>
                            <div class="mini-info">
                                <div class="mini-name">${patient?.name || 'مريض'}</div>
                                <div class="mini-contact">${this.calculateAge(patient?.birthDate)} سنة</div>
                            </div>
                        </div>
                    </td>
                    <td>${this.formatDate(prescription.date)}</td>
                    <td>
                        <div class="medications-preview">
                            ${prescriptionMedications.slice(0, 2).map(name => `
                                <span class="medication-tag">${name}</span>
                            `).join('')}
                            ${prescriptionMedications.length > 2 ? `
                                <span class="medication-tag more">+${prescriptionMedications.length - 2}</span>
                            ` : ''}
                        </div>
                    </td>
                    <td>${prescription.duration || 'غير محدد'}</td>
                    <td>
                        <span class="status-indicator status-${prescription.status || 'active'}"></span>
                        ${this.getPrescriptionStatusText(prescription.status)}
                    </td>
                    <td>${doctor ? `د. ${doctor.fullName}` : 'طبيب'}</td>
                    <td>
                        ${prescription.expiryDate ? `
                            <span class="${isExpired ? 'text-danger' : isExpiring ? 'text-warning' : 'text-success'}">
                                ${this.formatDate(prescription.expiryDate)}
                            </span>
                        ` : '--'}
                    </td>
                    <td>
                        <div class="patient-actions">
                            <button class="action-btn-sm btn-view" onclick="dashboard.viewPrescriptionDetails(${prescription.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-sm btn-print" onclick="dashboard.printPrescription(${prescription.id})" title="طباعة">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="action-btn-sm btn-refill" onclick="dashboard.refillPrescription(${prescription.id})" title="إعادة صرف">
                                <i class="fas fa-redo"></i>
                            </button>
                            <button class="action-btn-sm btn-delete" onclick="dashboard.deletePrescription(${prescription.id})" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // تحديث الترقيم
        this.updatePrescriptionsPagination(prescriptions.length);
    }

    // دوال مساعدة للوصفات الطبية
    getPrescriptionTypeText(type) {
        const typeMap = {
            'regular': 'عادية',
            'controlled': 'مضبوطة',
            'narcotic': 'مخدرة',
            'antibiotic': 'مضاد حيوي'
        };
        return typeMap[type] || type || 'عادية';
    }

    getPrescriptionStatusText(status) {
        const statusMap = {
            'active': 'نشطة',
            'completed': 'مكتملة',
            'expired': 'منتهية',
            'cancelled': 'ملغاة'
        };
        return statusMap[status] || status || 'نشطة';
    }

    isPrescriptionExpiring(prescription) {
        if (!prescription.expiryDate) return false;
        const expiryDate = new Date(prescription.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    }

    isPrescriptionExpired(prescription) {
        if (!prescription.expiryDate) return false;
        const expiryDate = new Date(prescription.expiryDate);
        const now = new Date();
        return expiryDate < now;
    }

    // عرض تفاصيل الوصفة الطبية
    async viewPrescriptionDetails(prescriptionId) {
        try {
            const prescription = await storeDB.get('prescriptions', prescriptionId);
            if (!prescription) {
                this.showError('الوصفة الطبية غير موجودة');
                return;
            }
            
            const patient = await storeDB.get('patients', prescription.patientId);
            const doctor = await storeDB.get('users', prescription.doctorId);
            const appointment = prescription.appointmentId ? await storeDB.get('appointments', prescription.appointmentId) : null;
            
            // الحصول على أدوية الوصفة
            const prescriptionItems = await storeDB.getAllByIndex('prescriptionItems', 'prescriptionId', prescriptionId);
            const medications = await Promise.all(
                prescriptionItems.map(async item => {
                    const medication = await storeDB.get('medications', item.medicationId);
                    return {
                        ...item,
                        medication: medication || { name: 'دواء غير معروف', category: 'غير معروف' }
                    };
                })
            );
            
            this.showPrescriptionDetailsModal(prescription, patient, doctor, appointment, medications);
            
        } catch (error) {
            console.error('خطأ في عرض تفاصيل الوصفة الطبية:', error);
            this.showError('فشل في تحميل بيانات الوصفة الطبية');
        }
    }

    // عرض نافذة تفاصيل الوصفة الطبية
    showPrescriptionDetailsModal(prescription, patient, doctor, appointment, medications) {
        const isExpiring = this.isPrescriptionExpiring(prescription);
        const isExpired = this.isPrescriptionExpired(prescription);
        
        const modalHTML = `
            <div class="prescription-details-container">
                <div class="prescription-details-header">
                    <div class="prescription-details-title">
                        <div class="prescription-main-info">
                            <h2>الوصفة الطبية - ${patient?.name || 'مريض'}</h2>
                            <div class="prescription-meta-info">
                                <div class="meta-item">
                                    <i class="fas fa-hashtag"></i>
                                    ${prescription.prescriptionNumber || `RX-${prescription.id.toString().padStart(6, '0')}`}
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-calendar"></i>
                                    ${this.formatDate(prescription.date)}
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-user-md"></i>
                                    ${doctor ? `د. ${doctor.fullName}` : 'طبيب'}
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-prescription"></i>
                                    ${this.getPrescriptionTypeText(prescription.type)}
                                </div>
                                ${prescription.expiryDate ? `
                                    <div class="meta-item ${isExpired ? 'text-danger' : isExpiring ? 'text-warning' : 'text-success'}">
                                        <i class="fas fa-clock"></i>
                                        ${this.formatDate(prescription.expiryDate)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="prescription-actions-bar">
                            <button class="btn btn-outline" onclick="dashboard.printPrescription(${prescription.id})">
                                <i class="fas fa-print"></i>
                                طباعة
                            </button>
                            <button class="btn btn-primary" onclick="dashboard.refillPrescription(${prescription.id})">
                                <i class="fas fa-redo"></i>
                                إعادة صرف
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="prescription-details-body">
                    <div class="prescription-medications-section">
                        <div class="details-section-title">
                            <i class="fas fa-pills"></i>
                            الأدوية الموصوفة
                        </div>
                        ${medications.length > 0 ? medications.map(item => `
                            <div class="medication-detail-card">
                                <div class="medication-detail-header">
                                    <div class="medication-detail-name">${item.medication.name}</div>
                                    <span class="medication-detail-category">${item.medication.category || 'عام'}</span>
                                </div>
                                <div class="medication-detail-grid">
                                    <div class="medication-detail-item">
                                        <span class="medication-detail-label">الجرعة</span>
                                        <span class="medication-detail-value">${item.dosage || 'غير محدد'}</span>
                                    </div>
                                    <div class="medication-detail-item">
                                        <span class="medication-detail-label">التكرار</span>
                                        <span class="medication-detail-value">${item.frequency || 'غير محدد'}</span>
                                    </div>
                                    <div class="medication-detail-item">
                                        <span class="medication-detail-label">المدة</span>
                                        <span class="medication-detail-value">${item.duration || 'غير محدد'}</span>
                                    </div>
                                    <div class="medication-detail-item">
                                        <span class="medication-detail-label">الكمية</span>
                                        <span class="medication-detail-value">${item.quantity || 'غير محدد'}</span>
                                    </div>
                                    ${item.startDate ? `
                                        <div class="medication-detail-item">
                                            <span class="medication-detail-label">تاريخ البدء</span>
                                            <span class="medication-detail-value">${this.formatDate(item.startDate)}</span>
                                        </div>
                                    ` : ''}
                                    ${item.endDate ? `
                                        <div class="medication-detail-item">
                                            <span class="medication-detail-label">تاريخ الانتهاء</span>
                                            <span class="medication-detail-value">${this.formatDate(item.endDate)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                                ${item.instructions ? `
                                    <div class="medication-instructions">
                                        <strong>تعليمات الاستخدام:</strong> ${item.instructions}
                                    </div>
                                ` : ''}
                                ${item.medication.warnings ? `
                                    <div class="medication-warnings">
                                        <div class="warning-title">تحذيرات:</div>
                                        ${item.medication.warnings}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('') : '<p class="text-muted text-center">لا توجد أدوية في هذه الوصفة</p>'}
                    </div>
                    
                    ${prescription.notes ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-sticky-note"></i>
                                ملاحظات الطبيب
                            </div>
                            <div class="detail-value">
                                ${prescription.notes}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${prescription.type === 'controlled' || prescription.type === 'narcotic' ? `
                        <div class="details-section">
                            <div class="details-section-title">
                                <i class="fas fa-exclamation-triangle"></i>
                                تنبيهات خاصة
                            </div>
                            <div class="detail-value">
                                ${prescription.type === 'controlled' ? `
                                    <div class="controlled-warning">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        هذه وصفة مضبوطة وتخضع للوائح وزارة الصحة. يرجى التأكد من الهوية والتسجيل.
                                    </div>
                                ` : ''}
                                ${prescription.type === 'narcotic' ? `
                                    <div class="narcotic-warning">
                                        <i class="fas fa-skull-crossbones"></i>
                                        هذه وصفة مخدرة وتخضع لرقابة صارمة. يمنع إعادة الصرف بدون موافقة الطبيب.
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="doctor-signature">
                        <div class="signature-line"></div>
                        <div class="signature-name">${doctor ? `د. ${doctor.fullName}` : 'التوقيع'}</div>
                        <div class="signature-title">طبيب معالج</div>
                    </div>
                </div>
            </div>
        `;
        
        this.showCustomModal('تفاصيل الوصفة الطبية', modalHTML, 'large');
    }

    // طباعة الوصفة الطبية
    async printPrescription(prescriptionId) {
        try {
            const prescription = await storeDB.get('prescriptions', prescriptionId);
            if (!prescription) {
                this.showError('الوصفة الطبية غير موجودة');
                return;
            }
            
            this.showPrintPreview(prescription);
            
        } catch (error) {
            console.error('خطأ في طباعة الوصفة الطبية:', error);
            this.showError('فشل في طباعة الوصفة الطبية');
        }
    }

    // إعادة صرف الوصفة
    async refillPrescription(prescriptionId) {
        try {
            const prescription = await storeDB.get('prescriptions', prescriptionId);
            if (!prescription) {
                this.showError('الوصفة الطبية غير موجودة');
                return;
            }
            
            if (prescription.refillsRemaining <= 0) {
                this.showError('لا توجد مرات إعادة صرف متبقية لهذه الوصفة');
                return;
            }
            
            if (this.isPrescriptionExpired(prescription)) {
                this.showError('لا يمكن إعادة صرف وصفة منتهية الصلاحية');
                return;
            }
            
            // إنشاء وصفة جديدة بناءً على الوصفة الأصلية
            const newPrescription = {
                ...prescription,
                id: undefined,
                prescriptionNumber: `RX-${Date.now()}`,
                date: new Date().toISOString(),
                refillsRemaining: prescription.refillsRemaining - 1,
                parentPrescriptionId: prescriptionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await storeDB.add('prescriptions', newPrescription, this.currentUser.id);
            this.showSuccess('تم إعادة صرف الوصفة بنجاح');
            this.loadPrescriptionsData();
            
        } catch (error) {
            console.error('خطأ في إعادة صرف الوصفة:', error);
            this.showError('فشل في إعادة صرف الوصفة');
        }
    }

    // تحديث حالة الوصفة
    async updatePrescriptionStatus(prescriptionId, newStatus) {
        try {
            const prescription = await storeDB.get('prescriptions', prescriptionId);
            if (!prescription) {
                this.showError('الوصفة الطبية غير موجودة');
                return;
            }
            
            await storeDB.update('prescriptions', prescriptionId, {
                ...prescription,
                status: newStatus,
                updatedAt: new Date().toISOString()
            }, this.currentUser.id);
            
            this.showSuccess(`تم تحديث حالة الوصفة إلى "${this.getPrescriptionStatusText(newStatus)}"`);
            this.loadPrescriptionsData();
            
        } catch (error) {
            console.error('خطأ في تحديث حالة الوصفة:', error);
            this.showError('فشل في تحديث حالة الوصفة');
        }
    }

    // حذف وصفة طبية
    async deletePrescription(prescriptionId) {
        if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الوصفة الطبية؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }
        
        try {
            await storeDB.delete('prescriptions', prescriptionId, this.currentUser.id);
            this.showSuccess('تم حذف الوصفة الطبية بنجاح');
            this.loadPrescriptionsData();
            
        } catch (error) {
            console.error('خطأ في حذف الوصفة الطبية:', error);
            this.showError('فشل في حذف الوصفة الطبية');
        }
    }

    // عرض نافذة إضافة وصفة طبية
    showAddPrescriptionModal() {
        const modal = document.getElementById('addPrescriptionModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderPrescriptionForm();
    }

    // عرض نافذة الوصفة السريعة
    showQuickPrescriptionModal() {
        // تنفيذ وصفة سريعة مع قوالب مسبقة
        this.showCustomModal('وصفة سريعة', `
            <div class="prescription-templates">
                <h4>اختر قالباً سريعاً</h4>
                <div class="templates-grid">
                    <div class="template-card" onclick="dashboard.useTemplate('cold')">
                        <div class="template-name">نزلات البرد</div>
                        <div class="template-medications">مسكنات، مضادات حيوية، مقشعات</div>
                    </div>
                    <div class="template-card" onclick="dashboard.useTemplate('pain')">
                        <div class="template-name">آلام عامة</div>
                        <div class="template-medications">مسكنات، مرخيات عضلية</div>
                    </div>
                    <div class="template-card" onclick="dashboard.useTemplate('allergy')">
                        <div class="template-name">حساسية</div>
                        <div class="template-medications">مضادات هستامين، كورتيزون</div>
                    </div>
                    <div class="template-card" onclick="dashboard.useTemplate('antibiotic')">
                        <div class="template-name">مضاد حيوي</div>
                        <div class="template-medications">أموكسيسيلين، ازيثرومايسين</div>
                    </div>
                </div>
            </div>
        `, 'medium');
    }

    // استخدام قالب وصفة
    async useTemplate(templateName) {
        // تنفيذ استخدام القوالب المسبقة
        const templates = {
            'cold': [
                { name: 'باراسيتامول', dosage: '500mg', frequency: '3 مرات يومياً', duration: '5 أيام' },
                { name: 'أموكسيسيلين', dosage: '500mg', frequency: '3 مرات يومياً', duration: '7 أيام' },
                { name: 'شراب الكحة', dosage: '10ml', frequency: '3 مرات يومياً', duration: '5 أيام' }
            ],
            'pain': [
                { name: 'ايبوبروفين', dosage: '400mg', frequency: '3 مرات يومياً', duration: '5 أيام' },
                { name: 'مرخي عضلي', dosage: '10mg', frequency: 'مرتين يومياً', duration: '7 أيام' }
            ]
        };
        
        // هنا يمكن تحميل القالب وعرض نموذج الوصفة
        this.showAddPrescriptionModal();
        // سيتم تحميل الأدوية تلقائياً في النموذج
    }

    // ... باقي الدوال الحالية ...
}

// جعل الكائن متاحاً globally للاستخدام في event handlers
window.dashboard = new Dashboard();


