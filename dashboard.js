import storeDB from './db.js';

// تهيئة لوحة التحكم
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        // تهيئة المكونات
        this.initSidebar();
        this.initHeader();
        this.initCharts();
        this.loadDashboardData();
        this.initEventListeners();
        
        // تحديث البيانات تلقائياً
        this.startAutoRefresh();
    }

    // تحديث معلومات المستخدم في الواجهة
    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser?.fullName || 'د. غير معروف';
        document.getElementById('userRole').textContent = this.currentUser?.role === 'doctor' ? 'طبيب' : 'مسؤول';
        document.getElementById('userNameSm').textContent = this.currentUser?.fullName || 'د. غير معروف';
        document.getElementById('clinicName').textContent = this.currentUser?.clinicName || 'العيادة الطبية';
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

    // ========== قسم المواعيد المحدث ==========

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

        // تحديث عناصر HTML - تأكد من وجود هذه العناصر في واجهتك
        const totalElement = document.getElementById('totalAppointments');
        const todayElement = document.getElementById('todayAppointmentsCount');
        const completedElement = document.getElementById('completedAppointments');
        const conflictElement = document.getElementById('conflictAppointments');

        if (totalElement) totalElement.textContent = totalAppointments.toLocaleString();
        if (todayElement) todayElement.textContent = todayAppointments.toLocaleString();
        if (completedElement) completedElement.textContent = completedAppointments.toLocaleString();
        if (conflictElement) conflictElement.textContent = conflictAppointments.toLocaleString();
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
        const totalCountElement = document.getElementById('totalAppointmentsCount');
        const currentPageSizeElement = document.getElementById('currentPageSize');
        
        if (totalCountElement) totalCountElement.textContent = totalItems.toLocaleString();
        if (currentPageSizeElement) currentPageSizeElement.textContent = Math.min(itemsPerPage, totalItems);
        
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
        const currentDateElement = document.getElementById('currentDate');
        const dayHeaderElement = document.getElementById('dayHeader');
        
        if (currentDateElement) currentDateElement.textContent = dateString;
        if (dayHeaderElement) dayHeaderElement.textContent = currentDate.toLocaleDateString('ar-SA', { weekday: 'long' });
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
            }, this.currentUser?.id);
            
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
            await storeDB.delete('appointments', appointmentId, this.currentUser?.id);
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
                await storeDB.update('appointments', appointmentId, formData, this.currentUser?.id);
                this.showSuccess('تم تحديث الموعد بنجاح');
            } else {
                // إضافة موعد جديد
                formData.createdAt = new Date().toISOString();
                await storeDB.addAppointment(formData, this.currentUser?.id);
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
            
            const appointmentsBadge = document.getElementById('appointmentsBadge');
            const patientsBadge = document.getElementById('patientsBadge');
            const invoicesBadge = document.getElementById('invoicesBadge');
            
            if (appointmentsBadge) appointmentsBadge.textContent = appointments.length;
            if (patientsBadge) patientsBadge.textContent = patients.length;
            if (invoicesBadge) invoicesBadge.textContent = invoices.length;
            
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
        
        if (!modal) return;
        
        modal.classList.add('show');
        
        if (cancelBtn) cancelBtn.onclick = () => modal.classList.remove('show');
        if (confirmBtn) confirmBtn.onclick = () => this.logout();
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

    // إظهار نافذة إضافة مريض
    showAddPatientModal() {
        const modal = document.getElementById('addPatientModal');
        if (!modal) return;
        
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
                }, this.currentUser?.id);
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
        alert(`❌ ${message}`);
    }

    // عرض رسالة نجاح
    showSuccess(message) {
        // يمكن استخدام مكتبة مثل Toastify أو SweetAlert
        console.log('نجاح:', message);
        alert(`✅ ${message}`);
    }

    // دوال مساعدة
    formatTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
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
        if (!name) return 'م';
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
    renderPatientForm() {
        // تنفيذ نموذج إضافة المريض
        console.log('عرض نموذج إضافة المريض');
    }
}

// تهيئة لوحة التحكم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
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
