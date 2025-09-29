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
                case 'medical-records':
                    await this.loadMedicalRecordsData();
                    break;
                case 'invoices':
                    await this.loadInvoicesData();
                    break;
            }
        } catch (error) {
            console.error(`خطأ في تحميل بيانات ${sectionId}:`, error);
            this.showError(`فشل في تحميل بيانات ${this.getSectionTitle(sectionId)}`);
        }
    }

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
        
        // إضافة سجل طبي جديد
        document.getElementById('addMedicalRecordBtn')?.addEventListener('click', () => {
            this.showAddMedicalRecordModal();
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

    // إظهار نافذة إضافة سجل طبي
    showAddMedicalRecordModal() {
        const modal = document.getElementById('addMedicalRecordModal');
        if (!modal) return;
        
        modal.classList.add('show');
        this.renderMedicalRecordForm();
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

    // دوال عرض رسائل
    showError(message) {
        // تنفيذ عرض رسائل الخطأ
        console.error('خطأ:', message);
        // يمكن استخدام مكتبة مثل SweetAlert أو Toastify هنا
        alert(`❌ ${message}`);
    }

    showSuccess(message) {
        // يمكن استخدام مكتبة مثل Toastify أو SweetAlert
        alert(`✅ ${message}`);
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

    // دوال إغلاق النوافذ المنبثقة
    closeAppointmentModal() {
        const modal = document.getElementById('addAppointmentModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    closePatientModal() {
        const modal = document.getElementById('addPatientModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    closeMedicalRecordModal() {
        const modal = document.getElementById('addMedicalRecordModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // دوال إضافية سيتم تنفيذها لاحقاً
    renderAppointmentForm() {
        // تنفيذ نموذج إضافة الموعد
    }

    renderPatientForm() {
        // تنفيذ نموذج إضافة المريض
    }

    renderMedicalRecordForm() {
        // تنفيذ نموذج إضافة السجل الطبي
    }

    displaySearchResults(results, query) {
        // تنفيذ عرض نتائج البحث
        console.log('نتائج البحث:', results);
    }

    loadInvoicesData() {
        // تنفيذ تحميل بيانات الفواتير
        console.log('تحميل بيانات الفواتير...');
    }

    // دوال تفاعلية إضافية
    viewPatientDetails(patientId) {
        console.log('عرض تفاصيل المريض:', patientId);
    }

    editPatient(patientId) {
        console.log('تحرير المريض:', patientId);
    }

    showPatientHistory(patientId) {
        console.log('عرض سجل المريض:', patientId);
    }

    deletePatient(patientId) {
        console.log('حذف المريض:', patientId);
    }

    viewMedicalRecordDetails(recordId) {
        console.log('عرض تفاصيل السجل الطبي:', recordId);
    }

    editMedicalRecord(recordId) {
        console.log('تحرير السجل الطبي:', recordId);
    }

    printMedicalRecord(recordId) {
        console.log('طباعة السجل الطبي:', recordId);
    }

    deleteMedicalRecord(recordId) {
        console.log('حذف السجل الطبي:', recordId);
    }

    editAppointment(appointmentId) {
        console.log('تحرير الموعد:', appointmentId);
    }

    updateAppointmentStatus(appointmentId, status) {
        console.log('تحديث حالة الموعد:', appointmentId, status);
    }

    deleteAppointment(appointmentId) {
        console.log('حذف الموعد:', appointmentId);
    }

    showAppointmentDetails(appointment, patient, doctor) {
        console.log('عرض تفاصيل الموعد:', appointment);
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

    // تحديث ترقيم الصفحات للسجلات الطبية
    updateMedicalRecordsPagination(totalItems) {
        const pagination = document.getElementById('medicalRecordsPagination');
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
        document.getElementById('totalRecordsCount').textContent = totalItems.toLocaleString();
        document.getElementById('currentRecordsPageSize').textContent = Math.min(itemsPerPage, totalItems);
        
        // إضافة أحداث النقر لأزرار الصفحات
        pagination.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pagination.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // هنا يمكن إضافة منطق تحميل الصفحة
            });
        });
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
