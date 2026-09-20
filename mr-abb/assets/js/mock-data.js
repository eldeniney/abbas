/**
 * Mr. Abb — demo data and scripted scenarios for mock mode.
 * Nothing here is real. It exists so the full experience can be
 * validated before the backend exists.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb;

	function iso(dayOffset, hour, minute) {
		var d = new Date(); d.setDate(d.getDate() + (dayOffset || 0)); d.setHours(hour || 9, minute || 0, 0, 0); return d.toISOString();
	}
	function L(en, ar) { return { en: en, ar: ar || en }; }

	var connections = [
		{ id: 'google-calendar', name: 'Google Calendar', description: L('Read and create events, plan your day.', 'قراءة وإنشاء المواعيد وتخطيط يومك.'), status: 'connected', icon: 'G', category: 'google', lastSync: iso(0, 7, 45) },
		{ id: 'gmail', name: 'Gmail', description: L('Summaries, drafts and sending with approval.', 'ملخصات ومسودات وإرسال بعد الموافقة.'), status: 'not_connected', icon: 'M', category: 'google' },
		{ id: 'google-drive', name: 'Google Drive', description: L('Find and read documents.', 'البحث في المستندات وقراءتها.'), status: 'connected', icon: 'D', category: 'google', lastSync: iso(0, 7, 45) },
		{ id: 'google-tasks', name: 'Google Tasks', description: L('Your task list, kept in sync.', 'قائمة مهامك متزامنة دائماً.'), status: 'connected', icon: 'T', category: 'google', lastSync: iso(0, 7, 45) },
		{ id: 'whatsapp', name: 'WhatsApp', description: L('Send messages, always with your approval.', 'إرسال رسائل بموافقتك دائماً.'), status: 'connected', icon: 'W', category: 'messaging', lastSync: iso(0, 8, 10) },
		{ id: 'operines', name: 'Operines', description: L('Operational data and queries.', 'بيانات التشغيل والاستعلامات.'), status: 'connected', icon: 'O', category: 'business', lastSync: iso(-1, 18, 0) },
		{ id: 'crm', name: 'CRM', description: L('Customers, opportunities, pipeline.', 'العملاء والفرص وقيمة المبيعات.'), status: 'connected', icon: 'C', category: 'business', lastSync: iso(0, 8, 0) },
		{ id: 'odoo', name: 'Odoo', description: L('ERP records and reports.', 'سجلات وتقارير ERP.'), status: 'not_connected', icon: 'Od', category: 'business' },
		{ id: 'power-platform', name: 'Microsoft Power Platform', description: L('Flows and apps.', 'التدفقات والتطبيقات.'), status: 'not_connected', icon: 'PP', category: 'microsoft' },
		{ id: 'power-bi', name: 'Power BI', description: L('Dashboards and KPIs by voice.', 'لوحات المعلومات والمؤشرات بالصوت.'), status: 'connected', icon: 'BI', category: 'microsoft', lastSync: iso(0, 6, 0) },
		{ id: 'n8n', name: 'n8n', description: L('Run workflows on demand.', 'تشغيل سير العمل عند الطلب.'), status: 'connected', icon: 'n8', category: 'automation', lastSync: iso(0, 8, 30) },
		{ id: 'uipath', name: 'UiPath', description: L('Trigger RPA processes.', 'تشغيل عمليات RPA.'), status: 'connected', icon: 'Ui', category: 'automation', lastSync: iso(-2, 12, 0) },
		{ id: 'web', name: 'Web Research', description: L('Search and summarise the web.', 'البحث في الويب وتلخيصه.'), status: 'connected', icon: '⌕', category: 'tools', lastSync: iso(0, 8, 30) }
	];

	var schedule = [
		{ time: '09:00', title: L('Prime Team Meeting', 'اجتماع فريق Prime'), location: L('Boardroom', 'قاعة الاجتماعات'), duration: '45m' },
		{ time: '11:30', title: L('Rastore Project', 'مشروع Rastore'), location: 'Teams', duration: '30m' },
		{ time: '15:00', title: L('Customer Meeting — Al Futtaim', 'اجتماع عميل — الفطيم'), location: L('Dubai office', 'مكتب دبي'), duration: '1h' }
	];

	var tasks = [
		{ id: 't1', title: L('Send proposal to Al Futtaim', 'إرسال العرض للفطيم'), time: '10:00', date: iso(0), source: 'crm', priority: 'high', status: 'done' },
		{ id: 't2', title: L('Call Ahmed Hassan', 'الاتصال بأحمد حسن'), time: '12:00', date: iso(0), source: 'manual', priority: 'high', status: 'open' },
		{ id: 't3', title: L('Review pipeline before Sunday', 'مراجعة الفرص قبل الأحد'), time: '16:30', date: iso(0), source: 'ai', priority: 'medium', status: 'open' },
		{ id: 't4', title: L('Approve Q4 budget draft', 'اعتماد مسودة ميزانية الربع الرابع'), time: '17:00', date: iso(0), source: 'google', priority: 'medium', status: 'open' },
		{ id: 't5', title: L('Prepare Prime demo deck', 'تجهيز عرض Prime'), time: '09:30', date: iso(1), source: 'manual', priority: 'high', status: 'open' },
		{ id: 't6', title: L('Follow up: Rastore contract', 'متابعة عقد Rastore'), time: '14:00', date: iso(2), source: 'automation', priority: 'low', status: 'open' },
		{ id: 't7', title: L('Weekly sales summary', 'ملخص المبيعات الأسبوعي'), time: '08:00', date: iso(-1), source: 'automation', priority: 'low', status: 'done' },
		{ id: 't8', title: L('Book flights to Riyadh', 'حجز طيران الرياض'), time: '13:00', date: iso(-1), source: 'manual', priority: 'medium', status: 'done' }
	];

	var automations = [
		{ id: 'a1', name: L('Morning Briefing', 'الملخص الصباحي'), schedule: L('Every weekday — 7:45 AM', 'كل يوم عمل — 7:45 ص'), enabled: true, lastRun: iso(0, 7, 45), lastStatus: 'completed', description: L('Calendar, priority tasks and pipeline in one spoken summary.', 'المواعيد والمهام والفرص في ملخص صوتي واحد.') },
		{ id: 'a2', name: L('Sales Pipeline Summary', 'ملخص فرص المبيعات'), schedule: L('Every Sunday — 8:00 AM', 'كل أحد — 8:00 ص'), enabled: true, lastRun: iso(-3, 8, 0), lastStatus: 'completed', description: L('Opportunities closing this month, at risk and stalled.', 'الفرص التي ستُغلق هذا الشهر والمتعثرة.') },
		{ id: 'a3', name: L('Competitor Monitoring', 'متابعة المنافسين'), schedule: L('Daily', 'يومياً'), enabled: true, lastRun: iso(0, 6, 0), lastStatus: 'completed', description: L('Web research on competitor announcements.', 'بحث على الويب عن أخبار المنافسين.') },
		{ id: 'a4', name: L('Email Follow-up Check', 'متابعة الإيميلات'), schedule: L('Weekdays — 4:00 PM', 'أيام العمل — 4:00 م'), enabled: false, lastRun: iso(-1, 16, 0), lastStatus: 'failed', description: L('Finds threads waiting on you for more than two days.', 'يرصد المحادثات المنتظرة ردك لأكثر من يومين.') }
	];

	var history = [
		{ id: 'h1', title: L('Morning Planning', 'تخطيط الصباح'), startedAt: iso(0, 9, 10), durationMin: 6, actions: 7, approvals: 1 },
		{ id: 'h2', title: L('Sales Pipeline Review', 'مراجعة فرص المبيعات'), startedAt: iso(-1, 18, 22), durationMin: 11, actions: 4, approvals: 0 },
		{ id: 'h3', title: L('Email Catch-up', 'متابعة الإيميلات'), startedAt: iso(-1, 13, 5), durationMin: 4, actions: 3, approvals: 2 },
		{ id: 'h4', title: L('Rastore Contract Research', 'بحث عقد Rastore'), startedAt: iso(-3, 10, 40), durationMin: 9, actions: 5, approvals: 0 }
	];

	var activity = [
		{ title: L('Checked calendar', 'تم فحص التقويم'), meta: '09:10', tone: 'success' },
		{ title: L('Created task: Call Ahmed Hassan', 'تم إنشاء مهمة: الاتصال بأحمد حسن'), meta: '09:11', tone: 'success' },
		{ title: L('Email to Ahmed Hassan — awaiting approval', 'إيميل لأحمد حسن — بانتظار الموافقة'), meta: '09:12', tone: 'warning' },
		{ title: L('Pipeline summary generated', 'تم إنشاء ملخص الفرص'), meta: L('Yesterday 18:24', 'إمبارح 18:24'), tone: 'success' }
	];

	var emails = [
		{ from: 'Ahmed Hassan', subject: L('Project Update — Rastore phase 2', 'تحديث المشروع — Rastore المرحلة 2'), snippet: L('Can we confirm the timeline by Thursday?', 'هل يمكن تأكيد الجدول الزمني قبل الخميس؟'), time: '08:12' },
		{ from: 'Sara Khalil', subject: L('Q4 Budget draft for approval', 'مسودة ميزانية الربع الرابع للاعتماد'), snippet: L('Attached the revised numbers.', 'مرفق الأرقام المعدلة.'), time: '07:50' },
		{ from: 'Al Futtaim Procurement', subject: L('RFQ clarification', 'استفسار بخصوص عرض السعر'), snippet: L('Two questions on delivery terms.', 'سؤالان بخصوص شروط التسليم.'), time: L('Yesterday', 'إمبارح') }
	];

	var crm = {
		count: 12, pipeline: 'AED 185,000', attention: 4,
		opportunities: [
			{ name: L('Al Futtaim — Fleet upgrade', 'الفطيم — ترقية الأسطول'), customer: 'Al Futtaim', value: 'AED 62,000', risk: 'high' },
			{ name: L('Rastore — Phase 2', 'Rastore — المرحلة 2'), customer: 'Rastore', value: 'AED 48,000', risk: 'medium' },
			{ name: L('Prime — Annual renewal', 'Prime — التجديد السنوي'), customer: 'Prime', value: 'AED 35,500', risk: 'low' },
			{ name: L('Nahda Group — Pilot', 'مجموعة النهضة — تجربة'), customer: 'Nahda Group', value: 'AED 21,000', risk: 'high' }
		]
	};

	/* ------------------------------------------------------------ Scenarios
	 * Each scenario is an array of steps. Strings may be {en, ar} objects.
	 */
	var scenarios = {
		day_brief: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 900 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'cal', tool: 'calendar.search', title: L('Checking Calendar', 'بفحص التقويم'), status: 'running' }, { type: 'wait', ms: 1100 },
			{ type: 'tool', id: 'cal', status: 'completed', subtitle: L('3 meetings today', '3 اجتماعات النهارده') },
			{ type: 'tool', id: 'tasks', tool: 'tasks.list', title: L('Checking Tasks', 'بفحص المهام'), status: 'running' }, { type: 'wait', ms: 900 },
			{ type: 'tool', id: 'tasks', status: 'completed', subtitle: L('4 priorities', '4 أولويات') },
			{ type: 'tool', id: 'crm', tool: 'crm.listOpportunities', title: L('Analyzing Opportunities', 'بحلل الفرص'), status: 'running' }, { type: 'wait', ms: 1200 },
			{ type: 'tool', id: 'crm', status: 'completed', subtitle: L('2 need attention', '2 محتاجين انتباه') },
			{ type: 'result', tool: 'calendar.search', title: L('3 meetings', '3 اجتماعات'), data: { label: L('Today', 'النهارده'), events: schedule } },
			{ type: 'result', tool: 'tasks.list', title: L("Today's priorities", 'أولويات النهارده'), data: { tasks: tasks.slice(0, 4) } },
			{ type: 'result', tool: 'crm.listOpportunities', data: crm },
			{ type: 'agent', text: L('Good morning Abbas. You have 3 meetings, 4 priority tasks and 2 sales opportunities that need attention. Your first meeting is the Prime team at 9:00.', 'صباح الخير يا عباس. عندك 3 اجتماعات، 4 مهام مهمة، وفرصتين مبيعات محتاجين انتباه. أول اجتماع مع فريق Prime الساعة 9.'), speakMs: 5200 },
			{ type: 'state', state: 'idle' }
		],
		priorities: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 700 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'tasks', tool: 'tasks.list', title: L('Checking Tasks', 'بفحص المهام'), status: 'running' }, { type: 'wait', ms: 1000 },
			{ type: 'tool', id: 'tasks', status: 'completed' },
			{ type: 'result', tool: 'tasks.list', title: L("Today's priorities", 'أولويات النهارده'), data: { tasks: tasks.filter(function (x) { return x.priority !== 'low'; }).slice(0, 4) } },
			{ type: 'agent', text: L('Two things matter most today: call Ahmed Hassan before noon, and review the pipeline before Sunday. The proposal to Al Futtaim already went out.', 'أهم حاجتين النهارده: اتصل بأحمد حسن قبل الضهر، وراجع الفرص قبل الأحد. عرض الفطيم اتبعت خلاص.'), speakMs: 4600 },
			{ type: 'state', state: 'idle' }
		],
		emails: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 800 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'mail', tool: 'email.search', title: L('Reading important emails', 'بقرأ الإيميلات المهمة'), status: 'running' }, { type: 'wait', ms: 1400 },
			{ type: 'tool', id: 'mail', status: 'completed', subtitle: L('3 need a reply', '3 محتاجين رد') },
			{ type: 'result', tool: 'email.search', title: L('Needs your reply', 'محتاجين ردك'), data: { label: L('Important', 'مهم'), messages: emails }, wide: true },
			{ type: 'agent', text: L('Three emails need you. Ahmed wants the Rastore timeline confirmed by Thursday, Sara sent the Q4 budget for approval, and Al Futtaim has two questions on delivery terms. Want me to draft replies?', 'في 3 إيميلات محتاجينك. أحمد عايز تأكيد جدول Rastore قبل الخميس، سارة بعتت ميزانية الربع الرابع للاعتماد، والفطيم عندهم سؤالين عن التسليم. أجهزلك ردود؟'), speakMs: 6000 },
			{ type: 'state', state: 'idle' }
		],
		pipeline: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 700 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'crm', tool: 'crm.listOpportunities', title: L('Checking CRM', 'بفحص CRM'), status: 'running' }, { type: 'wait', ms: 1300 },
			{ type: 'tool', id: 'crm', status: 'completed', subtitle: L('12 opportunities', '12 فرصة') },
			{ type: 'tool', id: 'bi', tool: 'powerbi.query', title: L('Pulling revenue trend', 'بجيب اتجاه الإيرادات'), status: 'running' }, { type: 'wait', ms: 1100 },
			{ type: 'tool', id: 'bi', status: 'completed' },
			{ type: 'result', tool: 'crm.listOpportunities', data: crm },
			{ type: 'result', tool: 'powerbi.query', title: L('Revenue by month', 'الإيرادات بالشهر'), data: { label: 'Power BI', metrics: [{ value: 'AED 412k', label: L('Quarter to date', 'الربع حتى الآن') }, { value: '+12%', label: L('vs last quarter', 'مقارنة بالربع السابق'), tone: 'success' }], series: [{ label: L('July', 'يوليو'), value: 128, display: '128k' }, { label: L('August', 'أغسطس'), value: 141, display: '141k' }, { label: L('September', 'سبتمبر'), value: 143, display: '143k' }] } },
			{ type: 'agent', text: L('Twelve opportunities are closing this month, worth 185 thousand dirhams. Four need attention. Al Futtaim and Nahda Group are the ones at risk.', 'في 12 فرصة هتقفل الشهر ده بقيمة 185 ألف درهم. أربعة محتاجين انتباه. الفطيم ومجموعة النهضة هما اللي في خطر.'), speakMs: 5200 },
			{ type: 'state', state: 'idle' }
		],
		create_meeting: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 900 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'cal', tool: 'calendar.search', title: L('Finding a free slot', 'بدور على وقت فاضي'), status: 'running' }, { type: 'wait', ms: 1000 },
			{ type: 'tool', id: 'cal', status: 'completed', subtitle: L('Tomorrow 10:00 is free', 'بكرة 10:00 فاضي') },
			{ type: 'tool', id: 'create', tool: 'calendar.create', title: L('Creating meeting', 'بعمل الاجتماع'), status: 'running' }, { type: 'wait', ms: 900 },
			{ type: 'tool', id: 'create', status: 'completed' },
			{ type: 'result', tool: 'calendar.create', title: L('Meeting created', 'تم إنشاء الاجتماع'), data: { label: L('Tomorrow', 'بكرة'), created: true, events: [{ time: '10:00', title: L('Meeting (set by voice)', 'اجتماع (بالصوت)'), location: 'Teams', duration: '30m' }] } },
			{ type: 'agent', text: L('Done. Tomorrow at 10:00, 30 minutes, on Teams. Want me to invite anyone?', 'تم. بكرة الساعة 10، نص ساعة، على Teams. أضيف حد؟'), speakMs: 3400 },
			{ type: 'state', state: 'idle' }
		],
		send_email: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 900 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'draft', tool: 'email.draft', title: L('Drafting email', 'بكتب الإيميل'), status: 'running' }, { type: 'wait', ms: 1400 },
			{ type: 'tool', id: 'draft', status: 'completed' },
			{ type: 'tool', id: 'send', tool: 'email.send', title: L('Send email', 'إرسال الإيميل'), status: 'requires_approval' },
			{ type: 'agent', text: L("I've prepared the email to Ahmed Hassan. Shall I send it?", 'جهزت الإيميل لأحمد حسن. أبعته؟'), speakMs: 2600 },
			{
				type: 'approval', id: 'apr-email', tool: 'email.send', title: L('Send email to Ahmed Hassan', 'إرسال إيميل لأحمد حسن'),
				details: { 'To': 'ahmed.hassan@rastore.com', 'Subject': L('Project Update', 'تحديث المشروع') },
				preview: L('Hi Ahmed,\n\nQuick update on Rastore phase 2: the timeline is confirmed for Thursday. I will share the revised plan before our 11:30 call.\n\nBest,\nAbbas', 'أهلاً أحمد،\n\nتحديث سريع بخصوص Rastore المرحلة 2: الجدول الزمني مؤكد يوم الخميس. هشارك الخطة المعدلة قبل مكالمتنا 11:30.\n\nتحياتي،\nعباس'),
				onApprove: [
					{ type: 'state', state: 'executing' },
					{ type: 'tool', id: 'send', status: 'running', title: L('Sending email', 'ببعت الإيميل') }, { type: 'wait', ms: 1200 },
					{ type: 'tool', id: 'send', status: 'completed', subtitle: L('Delivered', 'تم التسليم') },
					{ type: 'result', tool: 'email.send', data: { status: 'sent', to: 'ahmed.hassan@rastore.com', subject: L('Project Update', 'تحديث المشروع') } },
					{ type: 'agent', text: L('Sent. I added a reminder to follow up on Thursday.', 'اتبعت. وضفت تذكير للمتابعة يوم الخميس.'), speakMs: 2800 },
					{ type: 'state', state: 'idle' }
				],
				onReject: [
					{ type: 'tool', id: 'send', status: 'failed', subtitle: L('Cancelled by you', 'اتلغى منك') },
					{ type: 'agent', text: L('Cancelled. The draft is saved in Gmail if you want it later.', 'اتلغى. المسودة محفوظة في Gmail لو احتجتها.'), speakMs: 2600 },
					{ type: 'state', state: 'idle' }
				]
			}
		],
		whatsapp: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 800 },
			{ type: 'tool', id: 'wa', tool: 'whatsapp.send', title: L('Send WhatsApp message', 'إرسال رسالة واتساب'), status: 'requires_approval' },
			{ type: 'agent', text: L('Here is the message for Ahmed. Send it?', 'دي الرسالة لأحمد. أبعتها؟'), speakMs: 2200 },
			{
				type: 'approval', id: 'apr-wa', tool: 'whatsapp.send', title: L('Send WhatsApp to Ahmed Hassan', 'إرسال واتساب لأحمد حسن'),
				details: { 'To': '+971 50 000 0000' },
				preview: L('Hi Ahmed, running 10 minutes late for our 11:30. Starting the call at 11:40 — thanks!', 'أهلاً أحمد، هتأخر 10 دقايق على 11:30. هنبدأ 11:40، شكراً!'),
				onApprove: [
					{ type: 'tool', id: 'wa', status: 'running' }, { type: 'wait', ms: 900 }, { type: 'tool', id: 'wa', status: 'completed' },
					{ type: 'result', tool: 'whatsapp.send', data: { status: 'sent', to: 'Ahmed Hassan', message: L('Hi Ahmed, running 10 minutes late for our 11:30. Starting the call at 11:40 — thanks!', 'أهلاً أحمد، هتأخر 10 دقايق على 11:30. هنبدأ 11:40، شكراً!') } },
					{ type: 'agent', text: L('Sent.', 'اتبعتت.'), speakMs: 1200 }, { type: 'state', state: 'idle' }
				],
				onReject: [{ type: 'tool', id: 'wa', status: 'failed', subtitle: L('Cancelled', 'اتلغى') }, { type: 'agent', text: L('Okay, not sending it.', 'تمام، مش هبعتها.'), speakMs: 1600 }, { type: 'state', state: 'idle' }]
			}
		],
		workflow: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 700 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'n8n', tool: 'n8n.executeWorkflow', title: L('Running onboarding workflow', 'بشغل سير عمل التهيئة'), status: 'running' }, { type: 'wait', ms: 2200 },
			{ type: 'tool', id: 'n8n', status: 'completed', subtitle: L('4 steps', '4 خطوات') },
			{ type: 'result', tool: 'n8n.executeWorkflow', title: L('Client onboarding', 'تهيئة عميل جديد'), data: { label: 'n8n', status: 'completed', steps: [{ title: L('Create CRM record', 'إنشاء سجل CRM'), meta: '0.8s', status: 'completed' }, { title: L('Create Drive folder', 'إنشاء مجلد Drive'), meta: '1.1s', status: 'completed' }, { title: L('Send welcome email', 'إرسال إيميل ترحيبي'), meta: L('queued for approval', 'بانتظار الموافقة'), status: 'queued' }, { title: L('Schedule kickoff', 'جدولة اجتماع البداية'), meta: '0.4s', status: 'completed' }] } },
			{ type: 'agent', text: L('The onboarding workflow ran. Three steps completed; the welcome email is waiting for your approval.', 'سير عمل التهيئة اشتغل. 3 خطوات خلصت، والإيميل الترحيبي مستني موافقتك.'), speakMs: 3800 },
			{ type: 'state', state: 'idle' }
		],
		research: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 800 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'web', tool: 'web.search', title: L('Researching the web', 'ببحث على الويب'), status: 'running' }, { type: 'wait', ms: 2000 },
			{ type: 'tool', id: 'web', status: 'completed', subtitle: L('3 sources', '3 مصادر') },
			{ type: 'result', tool: 'web.search', title: L('Competitor announcements this week', 'إعلانات المنافسين هذا الأسبوع'), data: { summary: L('Two competitors announced UAE pricing changes this week. One launched a bundled fleet offer aimed at mid-size logistics companies; the other extended a promotion to the end of the quarter.', 'منافسان أعلنا تغييرات في الأسعار بالإمارات هذا الأسبوع. أحدهما أطلق عرضاً مجمعاً للأساطيل يستهدف شركات اللوجستيات المتوسطة، والآخر مدّ عرضاً ترويجياً حتى نهاية الربع.'), sources: [{ title: 'Fleet bundle launch — press release', domain: 'example.com' }, { title: 'Promotion extended to Q4', domain: 'example.org' }, { title: 'Industry roundup', domain: 'example.net' }] } },
			{ type: 'agent', text: L('Two competitors moved on pricing this week. I put the summary and sources on screen.', 'منافسين اتنين غيروا الأسعار الأسبوع ده. حطيت الملخص والمصادر على الشاشة.'), speakMs: 3400 },
			{ type: 'state', state: 'idle' }
		],
		error: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 700 },
			{ type: 'state', state: 'executing' },
			{ type: 'tool', id: 'odoo', tool: 'odoo.query', title: L('Checking Odoo', 'بفحص Odoo'), status: 'running' }, { type: 'wait', ms: 1500 },
			{ type: 'tool', id: 'odoo', status: 'failed', subtitle: L('Odoo is not connected', 'Odoo غير متصل') },
			{ type: 'error', message: L('Something went wrong while checking Odoo.', 'حصلت مشكلة أثناء فحص Odoo.'), hint: L('Odoo is not connected yet. Connect it from the Connections page.', 'Odoo لسه مش متوصل. اربطه من صفحة الاتصالات.'), details: { code: 'connection_missing', service: 'odoo', http: 503 }, retryable: true },
			{ type: 'agent', text: L("I couldn't reach Odoo. It isn't connected yet.", 'مش قادر أوصل لـ Odoo. لسه مش متوصل.'), speakMs: 2400 },
			{ type: 'state', state: 'error' }
		],
		fallback: [
			{ type: 'state', state: 'thinking' }, { type: 'wait', ms: 800 },
			{ type: 'agent', text: L("In demo mode I can show you your day, priorities, emails, pipeline, create a meeting, send an email or run a workflow. Try: \"What do I have today?\"", 'في الوضع التجريبي أقدر أوريك يومك، أولوياتك، إيميلاتك، الفرص، أعمل اجتماع، أبعت إيميل أو أشغل سير عمل. جرب: "عندي إيه النهارده؟"'), speakMs: 5200 },
			{ type: 'state', state: 'idle' }
		]
	};

	var intents = [
		{ id: 'send_email', re: /(send|write|reply|follow.?up|ابعت|ارسل|أرسل|رد على).*(email|mail|ahmed|إيميل|ايميل|أحمد)|(email|إيميل|ايميل).*(ahmed|أحمد)/i },
		{ id: 'whatsapp', re: /whats?app|واتس/i },
		{ id: 'error', re: /odoo|error|fail|أودو|غلط|مشكلة/i },
		{ id: 'create_meeting', re: /(create|schedule|book|set up|اعمل|أعمل|احجز|ضيف|أضف).*(meeting|call|اجتماع|ميتنج|مكالمة)|meeting tomorrow|اجتماع بكرة/i },
		{ id: 'workflow', re: /workflow|onboarding|process|automation|run the|شغل|سير/i },
		{ id: 'research', re: /research|search|competitor|news|ابحث|دور|منافس|أخبار/i },
		{ id: 'emails', re: /email|mail|inbox|إيميل|ايميل|بريد/i },
		{ id: 'pipeline', re: /closing|pipeline|opportunit|crm|sales|deal|revenue|الفرص|هتقفل|مبيعات|صفقات/i },
		{ id: 'priorities', re: /priorit|task|to.?do|أهم|مهام|مهمة|أخلص/i },
		{ id: 'day_brief', re: /today|tomorrow|schedule|calendar|meetings?|day|morning|النهارده|بكرة|مواعيد|عندي|جدول|يوم|الصبح/i }
	];
	function detectIntent(text) {
		for (var i = 0; i < intents.length; i++) { if (intents[i].re.test(text)) { return intents[i].id; } }
		return 'fallback';
	}

	var demoUtterances = [
		L('What do I have today?', 'عندي إيه النهارده؟'),
		L('Show my priorities.', 'إيه أهم الحاجات اللي محتاج أخلصها؟'),
		L("What's closing this month?", 'وريني الفرص اللي هتقفل الشهر ده.'),
		L('Send Ahmed an email about the project update.', 'ابعت لأحمد إيميل عن تحديث المشروع.'),
		L('Summarize my emails.', 'لخصلي الإيميلات المهمة.'),
		L('Create a meeting tomorrow.', 'اعمل اجتماع بكرة.'),
		L('Run the onboarding workflow.', 'شغل سير عمل التهيئة.'),
		L('Check Odoo for the invoice.', 'شوف الفاتورة في Odoo.')
	];

	var sessionDetail = {
		h1: {
			messages: [
				{ role: 'user', text: L('What do I have today?', 'عندي إيه النهارده؟'), time: '09:10' },
				{ role: 'agent', text: L('Good morning Abbas. You have 3 meetings, 4 priority tasks and 2 sales opportunities that need attention.', 'صباح الخير يا عباس. عندك 3 اجتماعات، 4 مهام مهمة، وفرصتين محتاجين انتباه.'), time: '09:10' },
				{ role: 'user', text: L('Send Ahmed the project update.', 'ابعت لأحمد تحديث المشروع.'), time: '09:12' },
				{ role: 'agent', text: L("I've prepared the email. Shall I send it?", 'جهزت الإيميل. أبعته؟'), time: '09:12' }
			],
			tools: [{ tool: 'calendar.search', title: L('Checking Calendar', 'فحص التقويم'), status: 'completed' }, { tool: 'tasks.list', title: L('Checking Tasks', 'فحص المهام'), status: 'completed' }, { tool: 'crm.listOpportunities', title: L('Analyzing Opportunities', 'تحليل الفرص'), status: 'completed' }, { tool: 'email.draft', title: L('Drafting email', 'كتابة الإيميل'), status: 'completed' }, { tool: 'email.send', title: L('Send email', 'إرسال الإيميل'), status: 'completed' }],
			approvals: [{ title: L('Send email to Ahmed Hassan', 'إرسال إيميل لأحمد حسن'), status: 'approved' }]
		}
	};

	MrAbb.mock = {
		data: { connections: connections, schedule: schedule, tasks: tasks, automations: automations, history: history, activity: activity, emails: emails, crm: crm, sessionDetail: sessionDetail },
		scenarios: scenarios,
		detectIntent: detectIntent,
		demoUtterances: demoUtterances,
		/** Resolve {en, ar} objects (deeply) for the current language. */
		localize: function localize(value, lang) {
			lang = lang || MrAbb.i18n.language;
			if (value == null) { return value; }
			if (Array.isArray(value)) { return value.map(function (v) { return localize(v, lang); }); }
			if (typeof value === 'object') {
				if (typeof value.en === 'string' && Object.keys(value).every(function (k) { return k === 'en' || k === 'ar'; })) { return value[lang] || value.en; }
				var out = {}; Object.keys(value).forEach(function (k) { out[k] = localize(value[k], lang); }); return out;
			}
			return value;
		}
	};
})(window);
