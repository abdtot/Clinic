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
