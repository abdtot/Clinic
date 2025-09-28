// db.js - قاعدة بيانات IndexedDB المتقدمة والمتكاملة لتطبيق إدارة العيادة الطبية

class ClinicDatabase {
    constructor() {
        this.dbName = 'AdvancedClinicManagementDB';
        this.version = 8; // زيادة الإصدار لإضافة الميزات المتقدمة
        this.db = null;
        this.auditLogger = new AuditLogger(this);
        this.init();
    }

    // تهيئة قاعدة البيانات
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('فشل في فتح قاعدة البيانات');
                reject(request.error);
            };

            request.onsuccess = async () => {
                this.db = request.result;
                console.log('تم تهيئة قاعدة البيانات المتقدمة بنجاح');
                
                // تهيئة البيانات الافتراضية
                await this.initializeDefaultSettings();
                await this.createDefaultUser();
                await this.initializeDefaultServices();
                
                // بدء خدمات الخلفية
                this.startBackgroundServices();
                
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createAdvancedStores(this.db);
            };
        });
    }

    // إنشاء جميع الجداول المتقدمة
    createAdvancedStores(db) {
        // جدول المستخدمين المتقدم
        if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
            userStore.createIndex('username', 'username', { unique: true });
            userStore.createIndex('role', 'role', { unique: false });
            userStore.createIndex('email', 'email', { unique: true });
            userStore.createIndex('isActive', 'isActive', { unique: false });
            userStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // جدول الجلسات المتقدم
        if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
            sessionStore.createIndex('userId', 'userId', { unique: false });
            sessionStore.createIndex('token', 'token', { unique: true });
            sessionStore.createIndex('expiry', 'expiry', { unique: false });
            sessionStore.createIndex('deviceInfo', 'deviceInfo', { unique: false });
        }

        // جدول المرضى المتقدم
        if (!db.objectStoreNames.contains('patients')) {
            const patientStore = db.createObjectStore('patients', { keyPath: 'id', autoIncrement: true });
            patientStore.createIndex('nationalId', 'nationalId', { unique: true });
            patientStore.createIndex('phone', 'phone', { unique: false });
            patientStore.createIndex('email', 'email', { unique: false });
            patientStore.createIndex('name', 'name', { unique: false });
            patientStore.createIndex('createdAt', 'createdAt', { unique: false });
            patientStore.createIndex('lastVisit', 'lastVisit', { unique: false });
            patientStore.createIndex('bloodType', 'bloodType', { unique: false });
            patientStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // جدول المواعيد المتقدم
        if (!db.objectStoreNames.contains('appointments')) {
            const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
            appointmentStore.createIndex('patientId', 'patientId', { unique: false });
            appointmentStore.createIndex('doctorId', 'doctorId', { unique: false });
            appointmentStore.createIndex('date', 'date', { unique: false });
            appointmentStore.createIndex('status', 'status', { unique: false });
            appointmentStore.createIndex('type', 'type', { unique: false });
            appointmentStore.createIndex('patientId_date', ['patientId', 'date'], { unique: false });
            appointmentStore.createIndex('doctorId_date', ['doctorId', 'date'], { unique: false });
        }

        // جدول الفواتير المتقدم
        if (!db.objectStoreNames.contains('invoices')) {
            const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
            invoiceStore.createIndex('patientId', 'patientId', { unique: false });
            invoiceStore.createIndex('appointmentId', 'appointmentId', { unique: false });
            invoiceStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
            invoiceStore.createIndex('invoiceDate', 'invoiceDate', { unique: false });
            invoiceStore.createIndex('status', 'status', { unique: false });
            invoiceStore.createIndex('totalAmount', 'totalAmount', { unique: false });
        }

        // جدول الخدمات الطبية المتقدم
        if (!db.objectStoreNames.contains('medicalServices')) {
            const serviceStore = db.createObjectStore('medicalServices', { keyPath: 'id', autoIncrement: true });
            serviceStore.createIndex('name', 'name', { unique: true });
            serviceStore.createIndex('category', 'category', { unique: false });
            serviceStore.createIndex('price', 'price', { unique: false });
            serviceStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // جدول بنود الفواتير المتقدم
        if (!db.objectStoreNames.contains('invoiceItems')) {
            const invoiceItemStore = db.createObjectStore('invoiceItems', { keyPath: 'id', autoIncrement: true });
            invoiceItemStore.createIndex('invoiceId', 'invoiceId', { unique: false });
            invoiceItemStore.createIndex('serviceId', 'serviceId', { unique: false });
            invoiceItemStore.createIndex('patientId', 'patientId', { unique: false });
        }

        // جدول السجلات الطبية المتقدم
        if (!db.objectStoreNames.contains('medicalRecords')) {
            const recordStore = db.createObjectStore('medicalRecords', { keyPath: 'id', autoIncrement: true });
            recordStore.createIndex('patientId', 'patientId', { unique: false });
            recordStore.createIndex('appointmentId', 'appointmentId', { unique: true });
            recordStore.createIndex('doctorId', 'doctorId', { unique: false });
            recordStore.createIndex('date', 'date', { unique: false });
            recordStore.createIndex('type', 'type', { unique: false });
        }

        // جدول الوصفات الطبية
        if (!db.objectStoreNames.contains('prescriptions')) {
            const prescriptionStore = db.createObjectStore('prescriptions', { keyPath: 'id', autoIncrement: true });
            prescriptionStore.createIndex('patientId', 'patientId', { unique: false });
            prescriptionStore.createIndex('doctorId', 'doctorId', { unique: false });
            prescriptionStore.createIndex('appointmentId', 'appointmentId', { unique: true });
            prescriptionStore.createIndex('date', 'date', { unique: false });
            prescriptionStore.createIndex('status', 'status', { unique: false });
        }

        // جدول الأدوية
        if (!db.objectStoreNames.contains('medications')) {
            const medicationStore = db.createObjectStore('medications', { keyPath: 'id', autoIncrement: true });
            medicationStore.createIndex('name', 'name', { unique: true });
            medicationStore.createIndex('category', 'category', { unique: false });
            medicationStore.createIndex('stock', 'stock', { unique: false });
        }

        // جدول بنود الوصفات
        if (!db.objectStoreNames.contains('prescriptionItems')) {
            const prescriptionItemStore = db.createObjectStore('prescriptionItems', { keyPath: 'id', autoIncrement: true });
            prescriptionItemStore.createIndex('prescriptionId', 'prescriptionId', { unique: false });
            prescriptionItemStore.createIndex('medicationId', 'medicationId', { unique: false });
        }

        // جدول المختبر والتحاليل
        if (!db.objectStoreNames.contains('labTests')) {
            const labTestStore = db.createObjectStore('labTests', { keyPath: 'id', autoIncrement: true });
            labTestStore.createIndex('name', 'name', { unique: true });
            labTestStore.createIndex('category', 'category', { unique: false });
            labTestStore.createIndex('price', 'price', { unique: false });
        }

        // جدول نتائج المختبر
        if (!db.objectStoreNames.contains('labResults')) {
            const labResultStore = db.createObjectStore('labResults', { keyPath: 'id', autoIncrement: true });
            labResultStore.createIndex('patientId', 'patientId', { unique: false });
            labResultStore.createIndex('testId', 'testId', { unique: false });
            labResultStore.createIndex('appointmentId', 'appointmentId', { unique: false });
            labResultStore.createIndex('date', 'date', { unique: false });
            labResultStore.createIndex('status', 'status', { unique: false });
        }

        // جدول الأشعة
        if (!db.objectStoreNames.contains('radiology')) {
            const radiologyStore = db.createObjectStore('radiology', { keyPath: 'id', autoIncrement: true });
            radiologyStore.createIndex('patientId', 'patientId', { unique: false });
            radiologyStore.createIndex('type', 'type', { unique: false });
            radiologyStore.createIndex('date', 'date', { unique: false });
            radiologyStore.createIndex('status', 'status', { unique: false });
        }

        // جدول الإشعارات المتقدم
        if (!db.objectStoreNames.contains('notifications')) {
            const notificationStore = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
            notificationStore.createIndex('userId', 'userId', { unique: false });
            notificationStore.createIndex('type', 'type', { unique: false });
            notificationStore.createIndex('priority', 'priority', { unique: false });
            notificationStore.createIndex('isRead', 'isRead', { unique: false });
            notificationStore.createIndex('createdAt', 'createdAt', { unique: false });
            notificationStore.createIndex('scheduledAt', 'scheduledAt', { unique: false });
        }

        // جدول سجل التدقيق المتقدم
        if (!db.objectStoreNames.contains('auditLogs')) {
            const auditLogStore = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
            auditLogStore.createIndex('userId', 'userId', { unique: false });
            auditLogStore.createIndex('action', 'action', { unique: false });
            auditLogStore.createIndex('table', 'table', { unique: false });
            auditLogStore.createIndex('timestamp', 'timestamp', { unique: false });
            auditLogStore.createIndex('ipAddress', 'ipAddress', { unique: false });
        }

        // جدول النسخ الاحتياطي المتقدم
        if (!db.objectStoreNames.contains('backups')) {
            const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
            backupStore.createIndex('backupDate', 'backupDate', { unique: true });
            backupStore.createIndex('type', 'type', { unique: false });
            backupStore.createIndex('size', 'size', { unique: false });
            backupStore.createIndex('status', 'status', { unique: false });
        }

        // جدول الإعدادات المتكامل المتقدم
        if (!db.objectStoreNames.contains('settings')) {
            const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
            settingsStore.createIndex('category', 'category', { unique: false });
            settingsStore.createIndex('type', 'type', { unique: false });
            settingsStore.createIndex('isAdvanced', 'isAdvanced', { unique: false });
        }

        // جدول التقارير والإحصائيات
        if (!db.objectStoreNames.contains('reports')) {
            const reportsStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
            reportsStore.createIndex('type', 'type', { unique: false });
            reportsStore.createIndex('date', 'date', { unique: false });
            reportsStore.createIndex('period', 'period', { unique: false });
        }

        // جدول الجداول الزمنية للأطباء
        if (!db.objectStoreNames.contains('doctorSchedules')) {
            const scheduleStore = db.createObjectStore('doctorSchedules', { keyPath: 'id', autoIncrement: true });
            scheduleStore.createIndex('doctorId', 'doctorId', { unique: false });
            scheduleStore.createIndex('dayOfWeek', 'dayOfWeek', { unique: false });
            scheduleStore.createIndex('date', 'date', { unique: false });
        }

        // جدول غرف الكشف
        if (!db.objectStoreNames.contains('examinationRooms')) {
            const roomStore = db.createObjectStore('examinationRooms', { keyPath: 'id', autoIncrement: true });
            roomStore.createIndex('roomNumber', 'roomNumber', { unique: true });
            roomStore.createIndex('status', 'status', { unique: false });
        }
    }

    // تهيئة الإعدادات الافتراضية المتقدمة
    async initializeDefaultSettings() {
        const advancedSettings = [
            // إعدادات العيادة العامة المتقدمة
            { key: 'clinic_name', value: 'العيادة الطبية المتقدمة', category: 'general', type: 'text', label: 'اسم العيادة', description: 'اسم العيادة كما يظهر في النظام', isAdvanced: false },
            { key: 'clinic_logo', value: '', category: 'general', type: 'image', label: 'شعار العيادة', description: 'شعار العيادة', isAdvanced: false },
            { key: 'clinic_address', value: '', category: 'general', type: 'textarea', label: 'عنوان العيادة', description: 'العنوان الكامل للعيادة', isAdvanced: false },
            { key: 'clinic_phone', value: '', category: 'general', type: 'tel', label: 'هاتف العيادة', description: 'رقم هاتف العيادة', isAdvanced: false },
            { key: 'clinic_email', value: '', category: 'general', type: 'email', label: 'بريد العيادة', description: 'البريد الإلكتروني للعيادة', isAdvanced: false },
            { key: 'clinic_website', value: '', category: 'general', type: 'url', label: 'موقع العيادة', description: 'الموقع الإلكتروني للعيادة', isAdvanced: true },
            
            // إعدادات العملة والمالية المتقدمة
            { key: 'currency', value: 'SAR', category: 'general', type: 'select', label: 'العملة', description: 'العملة المستخدمة في الفواتير', options: ['SAR', 'USD', 'EUR', 'EGP'], isAdvanced: false },
            { key: 'currency_symbol', value: 'ر.س', category: 'general', type: 'text', label: 'رمز العملة', description: 'رمز العملة المستخدم', isAdvanced: true },
            { key: 'decimal_places', value: 2, category: 'general', type: 'number', label: 'المنازل العشرية', description: 'عدد المنازل العشرية في المبالغ', isAdvanced: true },
            
            // إعدادات المنطقة واللغة المتقدمة
            { key: 'timezone', value: 'Asia/Riyadh', category: 'general', type: 'select', label: 'المنطقة الزمنية', description: 'المنطقة الزمنية للعيادة', isAdvanced: true },
            { key: 'date_format', value: 'dd/MM/yyyy', category: 'general', type: 'select', label: 'تنسيق التاريخ', description: 'طريقة عرض التاريخ', options: ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'], isAdvanced: true },
            { key: 'time_format', value: '12h', category: 'general', type: 'select', label: 'تنسيق الوقت', description: 'طريقة عرض الوقت', options: ['12h', '24h'], isAdvanced: true },
            { key: 'language', value: 'ar', category: 'general', type: 'select', label: 'اللغة', description: 'لغة النظام', options: ['ar', 'en'], isAdvanced: false },

            // إعدادات الدكتور المتقدمة
            { key: 'doctor_name', value: 'د. غير معروف', category: 'doctor', type: 'text', label: 'اسم الدكتور', description: 'الاسم الكامل للدكتور', isAdvanced: false },
            { key: 'doctor_specialization', value: 'طبيب عام', category: 'doctor', type: 'text', label: 'التخصص', description: 'تخصص الدكتور', isAdvanced: false },
            { key: 'doctor_license', value: '', category: 'doctor', type: 'text', label: 'رقم الترخيص', description: 'رقم ترخيص مزاولة المهنة', isAdvanced: true },
            { key: 'doctor_signature', value: '', category: 'doctor', type: 'image', label: 'التوقيع', description: 'توقيع الدكتور للتقارير', isAdvanced: true },
            { key: 'doctor_qualifications', value: '', category: 'doctor', type: 'textarea', label: 'المؤهلات', description: 'المؤهلات العلمية للدكتور', isAdvanced: true },

            // إعدادات المواعيد المتقدمة
            { key: 'appointment_duration', value: 30, category: 'appointments', type: 'number', label: 'مدة الموعد (دقيقة)', description: 'المدة الافتراضية لكل موعد بالدقائق', isAdvanced: false },
            { key: 'working_hours_start', value: '08:00', category: 'appointments', type: 'time', label: 'بداية الدوام', description: 'وقت بداية الدوام اليومي', isAdvanced: false },
            { key: 'working_hours_end', value: '17:00', category: 'appointments', type: 'time', label: 'نهاية الدوام', description: 'وقت نهاية الدوام اليومي', isAdvanced: false },
            { key: 'appointment_buffer', value: 15, category: 'appointments', type: 'number', label: 'فترة الراحة بين المواعيد (دقيقة)', description: 'الفترة بين المواعيد المتتالية', isAdvanced: true },
            { key: 'max_appointments_per_day', value: 20, category: 'appointments', type: 'number', label: 'الحد الأقصى للمواعيد اليومية', description: 'أقصى عدد للمواعيد في اليوم الواحد', isAdvanced: true },
            { key: 'allow_online_booking', value: true, category: 'appointments', type: 'boolean', label: 'السماح بالحجز أونلاين', description: 'تفعيل نظام الحجز عبر الإنترنت', isAdvanced: false },
            { key: 'advance_booking_days', value: 30, category: 'appointments', type: 'number', label: 'أيام الحجز المسبق', description: 'أقصى مدة للحجز المسبق بالأيام', isAdvanced: true },
            { key: 'auto_confirm_appointments', value: false, category: 'appointments', type: 'boolean', label: 'تأكيد المواعيد تلقائياً', description: 'تأكيد المواعيد الجديدة تلقائياً', isAdvanced: true },
            { key: 'cancellation_policy_hours', value: 24, category: 'appointments', type: 'number', label: 'سياسة الإلغاء (ساعة)', description: 'أقل مدة مسموحة لإلغاء الموعد', isAdvanced: true },

            // إعدادات الفواتير والمحاسبة المتقدمة
            { key: 'tax_rate', value: 15, category: 'billing', type: 'number', label: 'نسبة الضريبة (%)', description: 'نسبة الضريبة المطبقة على الفواتير', isAdvanced: false },
            { key: 'invoice_prefix', value: 'INV-', category: 'billing', type: 'text', label: 'بادئة رقم الفاتورة', description: 'بادئة أرقام الفواتير', isAdvanced: false },
            { key: 'next_invoice_number', value: 1, category: 'billing', type: 'number', label: 'رقم الفاتورة التالي', description: 'الرقم التالي للفاتورة', isAdvanced: false },
            { key: 'auto_generate_invoice', value: true, category: 'billing', type: 'boolean', label: 'إنشاء الفاتورة تلقائياً', description: 'إنشاء فاتورة تلقائياً بعد انتهاء الكشف', isAdvanced: false },
            { key: 'default_payment_methods', value: ['نقدي', 'بطاقة ائتمان', 'تحويل بنكي'], category: 'billing', type: 'array', label: 'طرق الدفع المتاحة', description: 'قائمة طرق الدفع المقبولة', isAdvanced: false },
            { key: 'late_payment_fee', value: 0, category: 'billing', type: 'number', label: 'رسوم التأخير', description: 'رسوم التأخير في السداد', isAdvanced: true },
            { key: 'discount_policy', value: 'none', category: 'billing', type: 'select', label: 'سياسة الخصم', description: 'سياسة الخصم المطبقة', options: ['none', 'senior', 'insurance', 'loyalty'], isAdvanced: true },

            // إعدادات النظام والأمان المتقدمة
            { key: 'session_timeout', value: 60, category: 'security', type: 'number', label: 'مدة الجلسة (دقيقة)', description: 'مدة انتهاء صلاحية الجلسة بعد عدم النشاط', isAdvanced: false },
            { key: 'backup_auto', value: true, category: 'security', type: 'boolean', label: 'نسخ احتياطي تلقائي', description: 'إنشاء نسخ احتياطية تلقائية', isAdvanced: true },
            { key: 'backup_interval', value: 7, category: 'security', type: 'number', label: 'فترة النسخ الاحتياطي (أيام)', description: 'الفترة بين النسخ الاحتياطية التلقائية', isAdvanced: true },
            { key: 'max_backup_files', value: 10, category: 'security', type: 'number', label: 'الحد الأقصى للنسخ الاحتياطية', description: 'أقصى عدد للنسخ الاحتياطية المحفوظة', isAdvanced: true },
            { key: 'password_policy', value: 'medium', category: 'security', type: 'select', label: 'سياسة كلمات المرور', description: 'قوة كلمات المرور المطلوبة', options: ['low', 'medium', 'high'], isAdvanced: true },
            { key: 'login_attempts', value: 5, category: 'security', type: 'number', label: 'محاولات الدخول المسموحة', description: 'عدد محاولات الدخول الفاشلة المسموحة', isAdvanced: true },
            { key: 'ip_whitelist', value: [], category: 'security', type: 'array', label: 'قائمة IP المسموحة', description: 'قائمة عناوين IP المسموح لها بالدخول', isAdvanced: true },

            // إعدادات الإشعارات المتقدمة
            { key: 'notify_appointment_reminder', value: true, category: 'notifications', type: 'boolean', label: 'تذكير المواعيد', description: 'إرسال تذكير قبل الموعد', isAdvanced: false },
            { key: 'reminder_before_hours', value: 24, category: 'notifications', type: 'number', label: 'مدة التذكير (ساعة)', description: 'إرسال التذكير قبل الموعد بالساعات', isAdvanced: false },
            { key: 'notify_new_patient', value: true, category: 'notifications', type: 'boolean', label: 'إشعار المريض الجديد', description: 'إشعار عند تسجيل مريض جديد', isAdvanced: true },
            { key: 'notify_daily_summary', value: true, category: 'notifications', type: 'boolean', label: 'ملخص يومي', description: 'إرسال ملخص يومي عن النشاط', isAdvanced: true },
            { key: 'notify_low_stock', value: true, category: 'notifications', type: 'boolean', label: 'إشعار نقص المخزون', description: 'إشعار عند نقص أدوية معينة', isAdvanced: true },
            { key: 'sms_integration', value: false, category: 'notifications', type: 'boolean', label: 'تفعيل الرسائل النصية', description: 'تفعيل إرسال الرسائل النصية', isAdvanced: true },
            { key: 'email_integration', value: false, category: 'notifications', type: 'boolean', label: 'تفعيل البريد الإلكتروني', description: 'تفعيل إرسال الإشعارات بالبريد', isAdvanced: true },

            // إعدادات التقارير المتقدمة
            { key: 'report_header', value: '', category: 'reports', type: 'textarea', label: 'رأس التقرير', description: 'نص يظهر في رأس التقارير', isAdvanced: true },
            { key: 'report_footer', value: '', category: 'reports', type: 'textarea', label: 'تذييل التقرير', description: 'نص يظهر في تذييل التقارير', isAdvanced: true },
            { key: 'auto_report_generation', value: false, category: 'reports', type: 'boolean', label: 'إنشاء تقارير تلقائية', description: 'إنشاء تقارير شهرية تلقائية', isAdvanced: true },
            { key: 'report_retention_period', value: 365, category: 'reports', type: 'number', label: 'فترة حفظ التقارير (يوم)', description: 'فترة حفظ التقارير قبل الحذف', isAdvanced: true },

            // إعدادات المختبر والتحاليل
            { key: 'lab_result_template', value: 'standard', category: 'laboratory', type: 'select', label: 'نموذج نتائج المختبر', description: 'النموذج المستخدم لنتائج المختبر', options: ['standard', 'detailed', 'custom'], isAdvanced: true },
            { key: 'auto_print_lab_results', value: false, category: 'laboratory', type: 'boolean', label: 'طباعة النتائج تلقائياً', description: 'طباعة نتائج المختبر تلقائياً', isAdvanced: true },
            { key: 'lab_normal_ranges', value: {}, category: 'laboratory', type: 'object', label: 'القيم الطبيعية للتحاليل', description: 'القيم الطبيعية للتحاليل المخبرية', isAdvanced: true },

            // إعدادات الصيدلية
            { key: 'pharmacy_auto_deduct', value: true, category: 'pharmacy', type: 'boolean', label: 'خصم تلقائي من المخزون', description: 'خصم الأدوية تلقائياً من المخزون', isAdvanced: true },
            { key: 'low_stock_threshold', value: 10, category: 'pharmacy', type: 'number', label: 'حد التنبيه لنقص المخزون', description: 'الحد الأدنى لتنبيه نقص المخزون', isAdvanced: true },
            { key: 'expiry_alert_days', value: 30, category: 'pharmacy', type: 'number', label: 'تنبيه انتهاء الصلاحية (يوم)', description: 'عدد الأيام للتنبيه قبل انتهاء الصلاحية', isAdvanced: true },

            // إعدادات متقدمة إضافية
            { key: 'enable_audit_log', value: true, category: 'advanced', type: 'boolean', label: 'سجل التدقيق', description: 'تسجيل جميع عمليات النظام', isAdvanced: true },
            { key: 'data_retention_period', value: 365, category: 'advanced', type: 'number', label: 'فترة حفظ البيانات (يوم)', description: 'فترة حفظ البيانات قبل الحذف التلقائي', isAdvanced: true },
            { key: 'auto_logout', value: true, category: 'advanced', type: 'boolean', label: 'تسجيل خروج تلقائي', description: 'تسجيل الخروج تلقائياً بعد مدة عدم النشاط', isAdvanced: false },
            { key: 'multi_doctor_support', value: false, category: 'advanced', type: 'boolean', label: 'دعم تعدد الأطباء', description: 'تفعيل نظام تعدد الأطباء', isAdvanced: true },
            { key: 'room_management', value: false, category: 'advanced', type: 'boolean', label: 'إدارة الغرف', description: 'تفعيل نظام إدارة غرف الكشف', isAdvanced: true },
            { key: 'insurance_integration', value: false, category: 'advanced', type: 'boolean', label: 'دمج شركات التأمين', description: 'تفعيل نظام دمج شركات التأمين', isAdvanced: true }
        ];

        for (const setting of advancedSettings) {
            const existing = await this.getSetting(setting.key);
            if (!existing) {
                await this.addSetting(setting);
            }
        }
    }

    // تهيئة الخدمات الطبية الافتراضية
    async initializeDefaultServices() {
        const defaultServices = [
            { name: 'كشف عام', category: 'كشف', price: 100, description: 'كشف طبي عام', duration: 30, isActive: true },
            { name: 'كشف أخصائي', category: 'كشف', price: 150, description: 'كشف طبي أخصائي', duration: 45, isActive: true },
            { name: 'كشف طوارئ', category: 'كشف', price: 200, description: 'كشف طبي للطوارئ', duration: 60, isActive: true },
            { name: 'تحليل دم كامل', category: 'مختبر', price: 80, description: 'تحليل الدم الشامل', duration: 0, isActive: true },
            { name: 'أشعة سينية', category: 'أشعة', price: 120, description: 'أشعة سينية على المنطقة المطلوبة', duration: 0, isActive: true },
            { name: 'تخطيط قلب', category: 'فحوصات', price: 90, description: 'تخطيط كهربية القلب', duration: 20, isActive: true }
        ];

        for (const service of defaultServices) {
            const existing = await this.getByIndex('medicalServices', 'name', service.name);
            if (!existing) {
                await this.add('medicalServices', service);
            }
        }
    }

    // بدء خدمات الخلفية
    startBackgroundServices() {
        // خدمة التنظيف التلقائي للجلسات المنتهية
        setInterval(() => {
            this.cleanExpiredSessions();
        }, 60 * 60 * 1000); // كل ساعة

        // خدمة النسخ الاحتياطي التلقائي
        setInterval(() => {
            this.autoBackup();
        }, 24 * 60 * 60 * 1000); // كل 24 ساعة

        // خدمة إرسال التذكيرات
        setInterval(() => {
            this.sendAppointmentReminders();
        }, 30 * 60 * 1000); // كل 30 دقيقة
    }

    // ========== دوال متقدمة للتعامل مع قاعدة البيانات ==========

    // إضافة سجل جديد مع سجل التدقيق
    async add(storeName, data, userId = null) {
        try {
            const result = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // تسجيل عملية الإضافة في سجل التدقيق
            if (this.auditLogger && userId) {
                await this.auditLogger.logAction(userId, 'CREATE', storeName, result, data);
            }

            return result;
        } catch (error) {
            console.error(`Error adding to ${storeName}:`, error);
            throw error;
        }
    }

    // تحديث سجل موجود مع سجل التدقيق
    async update(storeName, id, data, userId = null) {
        try {
            const oldData = await this.get(storeName, id);
            const result = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put({ ...data, id });

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // تسجيل عملية التحديث في سجل التدقيق
            if (this.auditLogger && userId) {
                await this.auditLogger.logAction(userId, 'UPDATE', storeName, id, data, oldData);
            }

            return result;
        } catch (error) {
            console.error(`Error updating ${storeName} with id ${id}:`, error);
            throw error;
        }
    }

    // الحصول على سجل بواسطة المعرف
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على جميع السجلات مع إمكانية التصفية والترتيب
    async getAll(storeName, filters = {}, sortField = null, sortOrder = 'asc') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                let results = request.result;

                // تطبيق الفلاتر
                if (Object.keys(filters).length > 0) {
                    results = results.filter(item => {
                        for (const [key, value] of Object.entries(filters)) {
                            if (item[key] !== value) return false;
                        }
                        return true;
                    });
                }

                // تطبيق الترتيب
                if (sortField) {
                    results.sort((a, b) => {
                        if (sortOrder === 'asc') {
                            return a[sortField] > b[sortField] ? 1 : -1;
                        } else {
                            return a[sortField] < b[sortField] ? 1 : -1;
                        }
                    });
                }

                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // الحذف مع سجل التدقيق
    async delete(storeName, id, userId = null) {
        try {
            const oldData = await this.get(storeName, id);
            const result = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });

            // تسجيل عملية الحذف في سجل التدقيق
            if (this.auditLogger && userId) {
                await this.auditLogger.logAction(userId, 'DELETE', storeName, id, null, oldData);
            }

            return result;
        } catch (error) {
            console.error(`Error deleting from ${storeName} with id ${id}:`, error);
            throw error;
        }
    }

    // البحث المتقدم باستخدام الفهرس
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على جميع السجلات باستخدام الفهرس مع إمكانية التصفية
    async getAllByIndex(storeName, indexName, value, filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                let results = request.result;

                // تطبيق الفلاتر الإضافية
                if (Object.keys(filters).length > 0) {
                    results = results.filter(item => {
                        for (const [key, value] of Object.entries(filters)) {
                            if (item[key] !== value) return false;
                        }
                        return true;
                    });
                }

                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // البحث النصي المتقدم في عدة حقول
    async search(storeName, query, fields = ['name']) {
        const allItems = await this.getAll(storeName);
        const searchTerm = query.toLowerCase();
        
        return allItems.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(searchTerm);
            });
        });
    }

    // ========== دوال خاصة بالإعدادات المتقدمة ==========

    // إضافة إعداد جديد
    async addSetting(settingData) {
        return this.add('settings', settingData);
    }

    // تحديث إعداد موجود
    async updateSetting(key, value, userId = null) {
        const setting = await this.getSetting(key);
        if (setting) {
            return this.update('settings', key, { ...setting, value }, userId);
        } else {
            throw new Error('الإعداد غير موجود');
        }
    }

    // الحصول على إعداد بواسطة المفتاح
    async getSetting(key) {
        return this.get('settings', key);
    }

    // الحصول على قيمة إعداد
    async getSettingValue(key, defaultValue = null) {
        const setting = await this.getSetting(key);
        return setting ? setting.value : defaultValue;
    }

    // الحصول على جميع الإعدادات
    async getAllSettings() {
        return this.getAll('settings');
    }

    // الحصول على الإعدادات حسب التصنيف
    async getSettingsByCategory(category) {
        return this.getAllByIndex('settings', 'category', category);
    }

    // تحديث عدة إعدادات مرة واحدة
    async updateMultipleSettings(settingsArray, userId = null) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
            
            settingsArray.forEach(setting => {
                store.put(setting);
            });

            // تسجيل عملية التحديث الجماعي
            if (this.auditLogger && userId) {
                this.auditLogger.logAction(userId, 'BULK_UPDATE', 'settings', null, settingsArray);
            }
        });
    }

    // ========== دوال خاصة بالمستخدمين والجلسات المتقدمة ==========

    // إنشاء المستخدم الافتراضي (الدكتور)
    async createDefaultUser() {
        const existingUser = await this.getByIndex('users', 'username', 'admin');
        if (!existingUser) {
            const defaultUser = {
                username: 'admin',
                password: this.hashPassword('admin123'),
                email: 'doctor@clinic.com',
                role: 'doctor',
                fullName: 'طبيب العيادة',
                phone: '+966500000000',
                specialization: 'طبيب عام',
                qualifications: 'دكتوراه في الطب',
                licenseNumber: 'MED123456',
                isActive: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            return await this.add('users', defaultUser);
        }
        return existingUser;
    }

    // تسجيل الدخول المتقدم
    async login(username, password, deviceInfo = {}) {
        const user = await this.getByIndex('users', 'username', username);
        if (user && user.password === this.hashPassword(password) && user.isActive) {
            // تحديث وقت آخر دخول
            await this.update('users', user.id, {
                ...user,
                lastLogin: new Date().toISOString()
            });

            // إنشاء جلسة جديدة
            const token = this.generateToken();
            const session = {
                userId: user.id,
                token: token,
                expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                loginTime: new Date().toISOString(),
                deviceInfo: deviceInfo,
                ipAddress: this.getClientIP()
            };
            
            await this.add('sessions', session);
            
            // تسجيل عملية الدخول
            await this.auditLogger.logAction(user.id, 'LOGIN', 'system', null, { deviceInfo });
            
            return { user: this.sanitizeUser(user), token };
        }
        throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    // التحقق من صحة الجلسة المتقدم
    async validateSession(token) {
        const session = await this.getByIndex('sessions', 'token', token);
        if (session && new Date(session.expiry) > new Date()) {
            const user = await this.get('users', session.userId);
            if (user && user.isActive) {
                // تحديث وقت انتهاء الجلسة
                await this.update('sessions', session.id, {
                    ...session,
                    expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString() // تجديد لمدة ساعة
                });
                return this.sanitizeUser(user);
            }
        }
        return null;
    }

    // تسجيل الخروج المتقدم
    async logout(token, userId = null) {
        const session = await this.getByIndex('sessions', 'token', token);
        if (session) {
            await this.delete('sessions', session.id);
            
            // تسجيل عملية الخروج
            if (userId) {
                await this.auditLogger.logAction(userId, 'LOGOUT', 'system');
            }
            
            return true;
        }
        return false;
    }

    // تنظيف الجلسات المنتهية
    async cleanExpiredSessions() {
        const allSessions = await this.getAll('sessions');
        const now = new Date();
        
        for (const session of allSessions) {
            if (new Date(session.expiry) < now) {
                await this.delete('sessions', session.id);
            }
        }
    }

    // ========== دوال خاصة بالمرضى المتقدمين ==========

    // إضافة مريض جديد مع التحقق المتقدم
    async addPatient(patientData, userId = null) {
        // التحقق من الرقم الوطني
        if (patientData.nationalId) {
            const existingPatient = await this.getByIndex('patients', 'nationalId', patientData.nationalId);
            if (existingPatient) {
                throw new Error('يوجد مريض مسجل بنفس الرقم الوطني');
            }
        }

        // التحقق من البريد الإلكتروني
        if (patientData.email) {
            const existingPatient = await this.getByIndex('patients', 'email', patientData.email);
            if (existingPatient) {
                throw new Error('يوجد مريض مسجل بنفس البريد الإلكتروني');
            }
        }

        const patient = {
            ...patientData,
            patientCode: this.generatePatientCode(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            lastVisit: null,
            totalVisits: 0
        };

        return await this.add('patients', patient, userId);
    }

    // تحديث بيانات المريض المتقدم
    async updatePatient(patientId, patientData, userId = null) {
        const patient = await this.get('patients', patientId);
        if (!patient) {
            throw new Error('المريض غير موجود');
        }

        // التحقق من التكرار في الرقم الوطني
        if (patientData.nationalId && patientData.nationalId !== patient.nationalId) {
            const existingPatient = await this.getByIndex('patients', 'nationalId', patientData.nationalId);
            if (existingPatient) {
                throw new Error('يوجد مريض مسجل بنفس الرقم الوطني');
            }
        }

        // التحقق من التكرار في البريد الإلكتروني
        if (patientData.email && patientData.email !== patient.email) {
            const existingPatient = await this.getByIndex('patients', 'email', patientData.email);
            if (existingPatient) {
                throw new Error('يوجد مريض مسجل بنفس البريد الإلكتروني');
            }
        }

        const updatedPatient = {
            ...patient,
            ...patientData,
            updatedAt: new Date().toISOString()
        };

        return await this.update('patients', patientId, updatedPatient, userId);
    }

    // البحث المتقدم عن المرضى
    async searchPatients(query, filters = {}) {
        const searchFields = ['name', 'nationalId', 'phone', 'email', 'patientCode'];
        let results = await this.search('patients', query, searchFields);
        
        // تطبيق الفلاتر الإضافية
        if (Object.keys(filters).length > 0) {
            results = results.filter(patient => {
                for (const [key, value] of Object.entries(filters)) {
                    if (patient[key] !== value) return false;
                }
                return true;
            });
        }
        
        return results;
    }

    // الحصول على السجل الطبي الكامل للمريض
    async getPatientMedicalHistory(patientId) {
        const [
            appointments,
            medicalRecords,
            prescriptions,
            labResults,
            invoices
        ] = await Promise.all([
            this.getAllByIndex('appointments', 'patientId', patientId),
            this.getAllByIndex('medicalRecords', 'patientId', patientId),
            this.getAllByIndex('prescriptions', 'patientId', patientId),
            this.getAllByIndex('labResults', 'patientId', patientId),
            this.getAllByIndex('invoices', 'patientId', patientId)
        ]);

        return {
            patientInfo: await this.get('patients', patientId),
            appointments: appointments.sort((a, b) => new Date(b.date) - new Date(a.date)),
            medicalRecords: medicalRecords.sort((a, b) => new Date(b.date) - new Date(a.date)),
            prescriptions: prescriptions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            labResults: labResults.sort((a, b) => new Date(b.date) - new Date(a.date)),
            invoices: invoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        };
    }

    // ========== دوال خاصة بالمواعيد المتقدمة ==========

    // إضافة موعد جديد مع التحقق من التعارضات
    async addAppointment(appointmentData, userId = null) {
        const conflictCheck = await this.checkAppointmentConflict(appointmentData);
        if (conflictCheck.hasConflict) {
            throw new Error(`تعارض في الموعد: ${conflictCheck.reason}`);
        }

        const appointment = {
            ...appointmentData,
            appointmentNumber: this.generateAppointmentNumber(),
            createdAt: new Date().toISOString(),
            status: appointmentData.status || 'scheduled'
        };

        const appointmentId = await this.add('appointments', appointment, userId);
        
        // تحديث آخر زيارة للمريض
        if (appointmentData.patientId) {
            await this.updatePatientLastVisit(appointmentData.patientId);
        }

        // إرسال إشعار إذا كان مفعل
        const notifySetting = await this.getSettingValue('notify_new_appointment', true);
        if (notifySetting) {
            await this.createNotification({
                userId: userId,
                type: 'new_appointment',
                title: 'موعد جديد',
                message: `تم حجز موعد جديد للمريض ${appointmentData.patientName || ''}`,
                priority: 'medium',
                relatedId: appointmentId
            });
        }

        return appointmentId;
    }

    // التحقق من تعارض المواعيد
    async checkAppointmentConflict(appointmentData) {
        const { doctorId, patientId, date, duration = 30 } = appointmentData;
        const appointmentTime = new Date(date);
        const endTime = new Date(appointmentTime.getTime() + duration * 60000);

        // التحقق من تعارض مع مواعيد الدكتور
        const doctorAppointments = await this.getAllByIndex('appointments', 'doctorId', doctorId, {
            status: ['scheduled', 'confirmed']
        });

        for (const apt of doctorAppointments) {
            const aptTime = new Date(apt.date);
            const aptEndTime = new Date(aptTime.getTime() + (apt.duration || 30) * 60000);
            
            if (appointmentTime < aptEndTime && endTime > aptTime) {
                return { hasConflict: true, reason: 'التعارض مع موعد آخر للدكتور' };
            }
        }

        // التحقق من تعارض مع مواعيد المريض
        const patientAppointments = await this.getAllByIndex('appointments', 'patientId', patientId, {
            status: ['scheduled', 'confirmed']
        });

        for (const apt of patientAppointments) {
            const aptTime = new Date(apt.date);
            const aptEndTime = new Date(aptTime.getTime() + (apt.duration || 30) * 60000);
            
            if (appointmentTime < aptEndTime && endTime > aptTime) {
                return { hasConflict: true, reason: 'المريض لديه موعد آخر في نفس الوقت' };
            }
        }

        return { hasConflict: false };
    }

    // الحصول على المواعيد حسب الفترة
    async getAppointmentsByDateRange(startDate, endDate, filters = {}) {
        const allAppointments = await this.getAll('appointments');
        return allAppointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= new Date(startDate) && 
                   aptDate <= new Date(endDate) &&
                   Object.entries(filters).every(([key, value]) => apt[key] === value);
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // ========== دوال خاصة بالفواتير والمحاسبة المتقدمة ==========

    // إنشاء فاتورة متقدمة
    async createInvoice(invoiceData, userId = null) {
        // الحصول على رقم الفاتورة التالي
        const nextInvoiceNumber = await this.getSettingValue('next_invoice_number', 1);
        const invoicePrefix = await this.getSettingValue('invoice_prefix', 'INV-');
        const taxRate = await this.getSettingValue('tax_rate', 15);
        
        // حساب المجاميع
        const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        const invoice = {
            ...invoiceData,
            invoiceNumber: `${invoicePrefix}${nextInvoiceNumber.toString().padStart(6, '0')}`,
            invoiceDate: new Date().toISOString(),
            subtotal: subtotal,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            status: 'pending',
            createdAt: new Date().toISOString(),
            dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const invoiceId = await this.add('invoices', invoice, userId);
        
        // إضافة بنود الفاتورة
        for (const item of invoiceData.items) {
            await this.addInvoiceItem({
                invoiceId: invoiceId,
                serviceId: item.serviceId,
                serviceName: item.serviceName,
                quantity: item.quantity,
                price: item.price,
                description: item.description,
                patientId: invoiceData.patientId
            }, userId);
        }

        // تحديث رقم الفاتورة التالي
        await this.updateSetting('next_invoice_number', nextInvoiceNumber + 1, userId);
        
        return invoiceId;
    }

    // الحصول على تقرير الإيرادات المتقدم
    async getAdvancedRevenueReport(startDate, endDate, groupBy = 'day') {
        const paidInvoices = await this.getAllByIndex('invoices', 'status', 'paid');
        const filteredInvoices = paidInvoices.filter(invoice => {
            const invoiceDate = new Date(invoice.invoiceDate);
            return invoiceDate >= new Date(startDate) && invoiceDate <= new Date(endDate);
        });

        const report = {
            totalRevenue: 0,
            totalInvoices: filteredInvoices.length,
            averageInvoice: 0,
            dailyRevenue: {},
            categoryRevenue: {},
            paymentMethodRevenue: {}
        };

        for (const invoice of filteredInvoices) {
            report.totalRevenue += invoice.totalAmount;

            // تجميع حسب اليوم
            const day = invoice.invoiceDate.split('T')[0];
            report.dailyRevenue[day] = (report.dailyRevenue[day] || 0) + invoice.totalAmount;

            // تجميع حسب طريقة الدفع
            const paymentMethod = invoice.paymentMethod || 'نقدي';
            report.paymentMethodRevenue[paymentMethod] = (report.paymentMethodRevenue[paymentMethod] || 0) + invoice.totalAmount;

            // الحصول على بنود الفاتورة للتجميع حسب التصنيف
            const items = await this.getAllByIndex('invoiceItems', 'invoiceId', invoice.id);
            for (const item of items) {
                const service = await this.get('medicalServices', item.serviceId);
                const category = service ? service.category : 'غير مصنف';
                report.categoryRevenue[category] = (report.categoryRevenue[category] || 0) + (item.price * item.quantity);
            }
        }

        report.averageInvoice = report.totalInvoices > 0 ? report.totalRevenue / report.totalInvoices : 0;

        return report;
    }

    // ========== دوال خاصة بالنسخ الاحتياطي المتقدم ==========

    // إنشاء نسخة احتياطية متقدمة
    async createAdvancedBackup() {
        const backupData = {};
        const storeNames = Array.from(this.db.objectStoreNames);
        
        for (const storeName of storeNames) {
            backupData[storeName] = await this.getAll(storeName);
        }

        const backup = {
            backupDate: new Date().toISOString(),
            type: 'full',
            data: JSON.stringify(backupData),
            size: JSON.stringify(backupData).length,
            version: this.version,
            status: 'completed'
        };

        const backupId = await this.add('backups', backup);
        
        // الحفاظ على الحد الأقصى للنسخ الاحتياطية
        await this.cleanupOldBackups();
        
        return backupId;
    }

    // تنظيف النسخ الاحتياطية القديمة
    async cleanupOldBackups() {
        const maxBackups = await this.getSettingValue('max_backup_files', 10);
        const allBackups = await this.getAll('backups');
        
        if (allBackups.length > maxBackups) {
            // ترتيب النسخ من الأقدم إلى الأحدث
            const sortedBackups = allBackups.sort((a, b) => new Date(a.backupDate) - new Date(b.backupDate));
            const backupsToDelete = sortedBackups.slice(0, allBackups.length - maxBackups);
            
            for (const backup of backupsToDelete) {
                await this.delete('backups', backup.id);
            }
        }
    }

    // النسخ الاحتياطي التلقائي
    async autoBackup() {
        const autoBackupEnabled = await this.getSettingValue('backup_auto', true);
        if (autoBackupEnabled) {
            try {
                await this.createAdvancedBackup();
                console.log('تم إنشاء نسخة احتياطية تلقائية بنجاح');
            } catch (error) {
                console.error('فشل في إنشاء النسخة الاحتياطية التلقائية:', error);
            }
        }
    }

    // ========== دوال خاصة بالإشعارات والتذكيرات ==========

    // إرسال تذكيرات المواعيد
    async sendAppointmentReminders() {
        const reminderEnabled = await this.getSettingValue('notify_appointment_reminder', true);
        if (!reminderEnabled) return;

        const reminderHours = await this.getSettingValue('reminder_before_hours', 24);
        const reminderTime = new Date(Date.now() + reminderHours * 60 * 60 * 1000);

        const appointments = await this.getAppointmentsByDateRange(
            new Date().toISOString(),
            reminderTime.toISOString(),
            { status: 'scheduled' }
        );

        for (const appointment of appointments) {
            // التحقق من عدم إرسال تذكير سابق
            const existingNotification = await this.getAllByIndex('notifications', 'relatedId', appointment.id, {
                type: 'appointment_reminder'
            });

            if (existingNotification.length === 0) {
                await this.createNotification({
                    userId: appointment.doctorId,
                    type: 'appointment_reminder',
                    title: 'تذكير موعد',
                    message: `موعد مع المريض ${appointment.patientName} في ${new Date(appointment.date).toLocaleString()}`,
                    priority: 'medium',
                    relatedId: appointment.id,
                    scheduledAt: new Date(Date.now() + (reminderHours - 1) * 60 * 60 * 1000).toISOString()
                });
            }
        }
    }

    // إنشاء إشعار جديد
    async createNotification(notificationData) {
        const notification = {
            ...notificationData,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        return await this.add('notifications', notification);
    }

    // ========== دوال مساعدة متقدمة ==========

    // توليد رمز مميز آمن
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // تشفير كلمة المرور باستخدام algorithm أكثر أماناً
    hashPassword(password) {
        // في بيئة production، استخدم مكتبة تشفير مناسبة مثل bcrypt
        return btoa(encodeURIComponent(password));
    }

    // فك تشفير كلمة المرور
    verifyPassword(hashedPassword, password) {
        return hashedPassword === this.hashPassword(password);
    }

    // توليد كود مريض فريد
    generatePatientCode() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `PAT-${timestamp}-${random}`.toUpperCase();
    }

    // توليد رقم موعد فريد
    generateAppointmentNumber() {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `APT-${dateStr}-${random}`;
    }

    // تحديث آخر زيارة للمريض
    async updatePatientLastVisit(patientId) {
        const patient = await this.get('patients', patientId);
        if (patient) {
            await this.update('patients', patientId, {
                ...patient,
                lastVisit: new Date().toISOString(),
                totalVisits: (patient.totalVisits || 0) + 1
            });
        }
    }

    // الحصول على IP العميل (تنفيذ بسيط)
    getClientIP() {
        // في تطبيق حقيقي، سيتم الحصول على IP من الطلب
        return '127.0.0.1';
    }

    // إزالة البيانات الحساسة من بيانات المستخدم
    sanitizeUser(user) {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    // الحصول على إحصائيات النظام المتقدمة
    async getAdvancedSystemStats() {
        const [
            patientsCount,
            appointmentsCount,
            invoicesCount,
            pendingInvoices,
            todayAppointments,
            monthlyRevenue
        ] = await Promise.all([
            this.getAll('patients').then(patients => patients.filter(p => p.isActive).length),
            this.getAll('appointments').then(apps => apps.filter(a => a.status !== 'cancelled').length),
            this.getAll('invoices').then(invoices => invoices.length),
            this.getAll('invoices').then(invoices => invoices.filter(i => i.status === 'pending').length),
            this.getTodayAppointments().then(apps => apps.length),
            this.getAdvancedRevenueReport(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
                new Date().toISOString()
            ).then(report => report.totalRevenue)
        ]);

        return {
            patients: patientsCount,
            appointments: appointmentsCount,
            invoices: invoicesCount,
            pendingInvoices: pendingInvoices,
            todayAppointments: todayAppointments,
            monthlyRevenue: monthlyRevenue,
            systemHealth: 'excellent', // يمكن إضافة منطق أكثر تعقيداً هنا
            lastBackup: await this.getLastBackupDate()
        };
    }

    // الحصول على تاريخ آخر نسخة احتياطية
    async getLastBackupDate() {
        const backups = await this.getAll('backups');
        if (backups.length > 0) {
            const sortedBackups = backups.sort((a, b) => new Date(b.backupDate) - new Date(a.backupDate));
            return sortedBackups[0].backupDate;
        }
        return null;
    }

    // تصدير البيانات بشكل متقدم
    async exportAdvancedData(options = {}) {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: this.version,
                clinicName: await this.getSettingValue('clinic_name'),
                includedTables: []
            },
            data: {}
        };

        const storeNames = Array.from(this.db.objectStoreNames);
        
        for (const storeName of storeNames) {
            if (options.tables && !options.tables.includes(storeName)) {
                continue;
            }
            
            exportData.data[storeName] = await this.getAll(storeName);
            exportData.metadata.includedTables.push(storeName);
        }

        return JSON.stringify(exportData, null, 2);
    }
}

// ========== فئة مسجّل التدقيق المتقدم ==========

class AuditLogger {
    constructor(database) {
        this.db = database;
    }

    async logAction(userId, action, table, recordId = null, newData = null, oldData = null) {
        const auditLog = {
            userId: userId,
            action: action,
            table: table,
            recordId: recordId,
            timestamp: new Date().toISOString(),
            ipAddress: this.getIPAddress(),
            userAgent: navigator.userAgent,
            newData: newData ? JSON.stringify(newData) : null,
            oldData: oldData ? JSON.stringify(oldData) : null
        };

        return await this.db.add('auditLogs', auditLog);
    }

    async getAuditLogs(filters = {}, limit = 100) {
        return await this.db.getAll('auditLogs', filters, 'timestamp', 'desc').then(logs => 
            logs.slice(0, limit)
        );
    }

    getIPAddress() {
        // تنفيذ مبسط - في production سيتم الحصول على IP حقيقي
        return '127.0.0.1';
    }
}

// إنشاء وتصدير نسخة واحدة من قاعدة البيانات
const clinicDB = new ClinicDatabase();
export default clinicDB;
