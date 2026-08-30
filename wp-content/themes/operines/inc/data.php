<?php
/**
 * Structured content layer.
 *
 * Every repeating structure on the site (solutions, industries, use cases,
 * departments, integrations, FAQs, process) lives here as data, so copy can
 * be edited in one place and templates stay thin. All getters are filterable.
 *
 * IMPORTANT — content policy: nothing in this file may claim clients,
 * metrics, certifications or partnerships that have not been verified by the
 * site owner. Workflow examples and timings are illustrative and are labeled
 * as such in the templates that render them.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

/**
 * The six core solution areas. Slug doubles as the page slug under /solutions/.
 */
function operines_solutions(): array {
	$solutions = array(
		'ai-agents'                  => array(
			'no'        => '01',
			'title'     => 'AI Agents',
			'nav_desc'  => 'Digital coworkers for sales, service and operations',
			'outcome'   => 'Work gets handled the moment it appears — not when someone is free.',
			'problem'   => 'Leads wait. Customers repeat themselves. Internal questions interrupt the people who actually know the answer. Most of this work is repeatable — it just needs something watching, understanding and acting.',
			'body'      => 'Operines designs and deploys AI agents that take on defined roles inside your operation: qualifying leads, answering customers on WhatsApp and email, chasing follow-ups, screening candidates, preparing reports. Each agent is connected to your real systems, works within rules you approve, and escalates to a human whenever judgment is needed.',
			'workflow'  => array(
				'Customer writes on WhatsApp at 21:40',
				'Agent identifies the customer and the request',
				'Answer drafted from your approved knowledge',
				'CRM record updated with the conversation',
				'Complex case escalated to your team with full context',
			),
			'workflow_label' => 'A customer-service agent, in practice',
			'integrations'   => array( 'WhatsApp Business', 'Email', 'Salesforce', 'Zoho', 'Odoo', 'Custom CRM' ),
			'capabilities'   => array(
				array( 'Customer service agents', 'Answer, resolve and escalate across WhatsApp, email and web chat.' ),
				array( 'Sales & lead qualification agents', 'Engage new leads instantly, qualify them, and create CRM opportunities.' ),
				array( 'Follow-up agents', 'Chase quotes, renewals and unanswered conversations so nothing goes cold.' ),
				array( 'Voice agents', 'Handle routine inbound calls and route the rest with context.' ),
				array( 'Internal knowledge agents', 'Give your team instant answers from policies, documents and systems.' ),
				array( 'Operational agents', 'Watch queues, documents and inboxes, and trigger the right workflow.' ),
			),
			'faqs'      => array(
				array( 'Are AI agents just chatbots?', 'No. A chatbot answers questions. An Operines agent is connected to your systems and completes work: it updates the CRM, creates tasks, sends follow-ups and escalates to people when judgment is needed. The conversation is only the surface — the actions underneath are the point.' ),
				array( 'Do agents work in Arabic?', 'Yes. Agents can hold customer conversations in Arabic and English, and switch based on how the customer writes.' ),
				array( 'What stops an agent from doing something wrong?', 'Every agent operates inside rules you approve: what it may decide alone, what needs human approval, and what it must never do. Actions are logged, and approval gates sit in front of anything sensitive.' ),
			),
		),
		'business-process-automation' => array(
			'no'        => '02',
			'title'     => 'Business Process Automation',
			'nav_desc'  => 'Approvals, follow-ups and workflows that run themselves',
			'outcome'   => 'The steps between your teams stop depending on memory and copy-paste.',
			'problem'   => 'Most delay in a business is not the work itself — it is the handover: the approval sitting in an inbox, the record retyped into a second system, the report assembled by hand every week.',
			'body'      => 'We map how work actually moves through your company, then automate the repeatable path: approvals routed and escalated automatically, documents extracted and filed, notifications sent to the right person at the right moment, reports generated from live data. Exceptions still reach people — everything else just happens.',
			'workflow'  => array(
				'Supplier invoice arrives by email',
				'Data extracted and matched to the purchase order',
				'Routed to the right approver automatically',
				'Posted to the ERP on approval',
				'Payment status visible on the finance dashboard',
			),
			'workflow_label' => 'An approval flow, in practice',
			'integrations'   => array( 'Odoo', 'Power Automate', 'n8n', 'Make', 'Email', 'Databases' ),
			'capabilities'   => array(
				array( 'Approval workflows', 'Multi-step approvals with routing, reminders and escalation.' ),
				array( 'Document processing', 'Extract data from invoices, IDs and forms into your systems.' ),
				array( 'Lead routing & follow-up', 'Assign, notify and chase automatically, by your rules.' ),
				array( 'Onboarding flows', 'Customers and employees onboarded through consistent, tracked steps.' ),
				array( 'Notifications & alerts', 'The right person informed at the right threshold — not everyone, always.' ),
				array( 'Automated reporting', 'Recurring reports assembled from live data instead of Friday-afternoon spreadsheets.' ),
			),
			'faqs'      => array(
				array( 'Which processes should be automated first?', 'The ones that are frequent, rule-based and painful when delayed: approvals, follow-ups, data entry between systems, recurring reports. Our audit maps your processes and ranks them by effort saved against implementation cost.' ),
				array( 'Do we need to replace our current software?', 'No. Automation connects the systems you already run. Replacement is only on the table when a system genuinely blocks the operation.' ),
				array( 'What happens when a process hits an exception?', 'It goes to a person, with full context. Automation handles the repeatable path; people handle judgment.' ),
			),
		),
		'crm-sales-automation'        => array(
			'no'        => '03',
			'title'     => 'CRM & Sales Automation',
			'nav_desc'  => 'A pipeline that updates itself, on Salesforce, Zoho or Odoo',
			'outcome'   => 'Your CRM stops being a form your team fills in — and starts being how deals move.',
			'problem'   => 'CRMs fail for one reason: they depend on humans remembering to type into them. Records go stale, follow-ups slip, and the pipeline your management sees stops matching reality.',
			'body'      => 'Operines implements, customizes and automates CRM platforms — Salesforce, Zoho, SuiteCRM, Odoo or your own build. Leads enter automatically from every channel, records enrich themselves from conversations, follow-ups fire on schedule, and management sees a pipeline that reflects what is actually happening.',
			'workflow'  => array(
				'Lead arrives from website, portal or WhatsApp',
				'Contact created, deduplicated and enriched',
				'Qualified and scored against your criteria',
				'Assigned to the right salesperson with an SLA',
				'Follow-up sequence starts; stalled deals flagged',
			),
			'workflow_label' => 'A lead lifecycle, in practice',
			'integrations'   => array( 'Salesforce', 'Zoho', 'SuiteCRM', 'Odoo', 'WhatsApp Business', 'Webhooks' ),
			'capabilities'   => array(
				array( 'CRM implementation', 'Setup and customization shaped around your sales process, not a generic template.' ),
				array( 'Lead capture & routing', 'Every channel feeds one pipeline, deduplicated and assigned by rule.' ),
				array( 'Pipeline automation', 'Stage changes trigger the next action: tasks, documents, notifications.' ),
				array( 'Conversation logging', 'WhatsApp and email conversations attached to the record automatically.' ),
				array( 'Quotes & proposals', 'Generated from CRM data, tracked, and chased.' ),
				array( 'Sales dashboards', 'Conversion, velocity and activity visible without asking anyone.' ),
			),
			'faqs'      => array(
				array( 'Can you work with our existing CRM?', 'Yes. We build on Salesforce, Zoho, SuiteCRM and Odoo, and we integrate with custom CRMs through their APIs. Migration is an option, not a requirement.' ),
				array( 'How does AI fit into a CRM?', 'AI reads what structured fields miss: it qualifies leads from conversations, drafts follow-ups with context, flags deals going quiet, and keeps records enriched — so the CRM reflects reality without manual typing.' ),
			),
		),
		'erp-automation'              => array(
			'no'        => '04',
			'title'     => 'ERP Implementation & Automation',
			'nav_desc'  => 'Odoo-centred ERP that matches how you actually operate',
			'outcome'   => 'Finance, inventory and operations run on one system that talks to everything else.',
			'problem'   => 'An ERP that was configured once and never touched again slowly drifts away from the business. Teams route around it with spreadsheets, and the "system of record" stops recording.',
			'body'      => 'Operines implements and extends ERP systems — with deep expertise in Odoo, including Odoo Community — and then automates the flows around them: procurement approvals, invoice processing, inventory alerts, VAT-ready finance workflows, and integrations with the CRM, e-commerce and banking layers your business already uses.',
			'workflow'  => array(
				'Sales order confirmed in the CRM',
				'Order, delivery and invoice created in the ERP',
				'Stock checked; purchase suggested if below threshold',
				'Invoice sent and payment reconciled',
				'Management dashboard reflects it live',
			),
			'workflow_label' => 'Order-to-cash, in practice',
			'integrations'   => array( 'Odoo', 'Databases', 'REST APIs', 'Power BI', 'E-commerce', 'Banks & payment providers' ),
			'capabilities'   => array(
				array( 'Odoo implementation', 'Community or Enterprise, configured around your processes.' ),
				array( 'Finance automation', 'Invoicing, reconciliation and UAE VAT-conscious workflows.' ),
				array( 'Inventory & procurement', 'Reorder rules, approvals and supplier flows that run themselves.' ),
				array( 'HR workflows', 'Leave, expenses, onboarding and document tracking.' ),
				array( 'ERP integrations', 'The ERP connected to CRM, e-commerce, logistics and BI — not an island.' ),
				array( 'Custom modules', 'Where your operation genuinely differs, we build for it.' ),
			),
			'faqs'      => array(
				array( 'Do you only work with Odoo?', 'Odoo is where our implementation depth is, including Odoo Community for cost-conscious deployments. We also integrate and automate around ERPs you already run.' ),
				array( 'Can our ERP handle UAE VAT workflows?', 'We configure finance flows with UAE VAT requirements in mind — tax settings, invoice formats and reporting outputs. Your accountant or tax advisor remains the authority; we make the system do the work.' ),
			),
		),
		'data-analytics-bi'           => array(
			'no'        => '05',
			'title'     => 'Data Analytics & BI',
			'nav_desc'  => 'Executive dashboards fed by live data, not Friday spreadsheets',
			'outcome'   => 'Management sees the business as it is — not as it was when someone last updated the sheet.',
			'problem'   => 'The numbers exist. They are just spread across the CRM, the ERP, the bank, and a dozen spreadsheets — and assembling them costs someone hours every week.',
			'body'      => 'Operines builds the data layer that pulls your systems into live dashboards — Power BI and beyond. Executive views for direction, operational views for the daily run, automated distribution so the right numbers arrive before the meeting, and AI-assisted analysis where it genuinely adds signal.',
			'workflow'  => array(
				'Data synchronized from CRM, ERP and channels',
				'Modelled into one consistent picture',
				'KPIs refreshed on schedule, not on request',
				'Thresholds trigger alerts to owners',
				'Monday meeting starts from live numbers',
			),
			'workflow_label' => 'A reporting layer, in practice',
			'integrations'   => array( 'Power BI', 'Odoo', 'Salesforce', 'Zoho', 'Databases', 'Google Sheets' ),
			'capabilities'   => array(
				array( 'Executive dashboards', 'Revenue, pipeline, cash and operations in one live view.' ),
				array( 'Operational dashboards', 'Queues, SLAs and workloads for the people running the day.' ),
				array( 'Automated reporting', 'Scheduled reports that build and send themselves.' ),
				array( 'KPI systems', 'Metrics defined once, measured consistently everywhere.' ),
				array( 'Data pipelines', 'Clean, reliable flows from source systems to the model.' ),
				array( 'AI-assisted insight', 'Anomalies surfaced and trends explained in plain language.' ),
			),
			'faqs'      => array(
				array( 'Our data is messy. Is that a blocker?', 'It is the normal starting point. Part of the build is deciding which system owns which fact, cleaning what flows into the model, and keeping it clean automatically.' ),
				array( 'Power BI or something else?', 'Power BI is our default for UAE businesses on Microsoft 365. Where a different stack fits better, we build on that instead.' ),
			),
		),
		'ai-strategy-managed'         => array(
			'no'        => '06',
			'title'     => 'AI Strategy & Managed Automation',
			'nav_desc'  => 'Know what to automate — then keep it running well',
			'outcome'   => 'A roadmap grounded in your operation, and automations that keep improving after launch.',
			'problem'   => 'The expensive mistake is not choosing the wrong tool. It is automating the wrong thing — or shipping an automation and letting it rot while the business changes around it.',
			'body'      => 'Operines starts with the operation, not the technology: we audit how work moves, find where AI creates return, and are candid about what should stay human. Then we stay: monitoring, tuning and extending your automations as volumes grow and processes evolve.',
			'workflow'  => array(
				'Process audit across departments',
				'Opportunity map ranked by ROI and effort',
				'Quick win shipped in weeks',
				'Architecture scaled system by system',
				'Monthly review: measure, tune, extend',
			),
			'workflow_label' => 'An engagement arc, in practice',
			'integrations'   => array( 'Your existing stack', 'n8n', 'Make', 'Power Automate', 'UiPath', 'Custom middleware' ),
			'capabilities'   => array(
				array( 'AI automation audit', 'A structured look at your operation, ending in a ranked opportunity map.' ),
				array( 'Transformation roadmap', 'Sequenced priorities: quick wins first, foundations underneath.' ),
				array( 'Architecture design', 'Which system owns what, how data flows, where humans approve.' ),
				array( 'Managed operations', 'Monitoring, incident response and continuous tuning.' ),
				array( 'Optimization cycles', 'Regular reviews that measure results and extend coverage.' ),
				array( 'Team enablement', 'Your people trained to work with — and supervise — the automation.' ),
			),
			'faqs'      => array(
				array( 'What does the AI Automation Audit involve?', 'A structured review of how work moves through your departments: where time goes, where handovers fail, what your systems can already do. You get a ranked opportunity map with recommended first moves — useful even if you build with someone else.' ),
				array( 'What does "managed automation" mean?', 'After launch, we monitor your automations, fix what breaks, tune what drifts, and extend coverage as your operation changes. Automation is an operating capability, not a one-off project.' ),
			),
		),
	);

	return apply_filters( 'operines_solutions', $solutions );
}

/**
 * Department explorer: what Operines automates, by department.
 */
function operines_departments(): array {
	return apply_filters(
		'operines_departments',
		array(
			'sales'     => array(
				'label' => 'Sales',
				'lede'  => 'A lead should never wait for a working day.',
				'flow'  => array( 'Incoming lead', 'AI qualification', 'CRM record created', 'Opportunity assigned', 'WhatsApp / email follow-up', 'Meeting booked', 'Sales dashboard updated' ),
				'items' => array( 'Instant lead response', 'Lead scoring & routing', 'Quote follow-up', 'Pipeline hygiene alerts', 'Meeting scheduling' ),
			),
			'service'   => array(
				'label' => 'Customer Service',
				'lede'  => 'Customers get answers while your team handles the hard cases.',
				'flow'  => array( 'Customer message', 'Intent understood', 'Answer from approved knowledge', 'Order / booking action taken', 'Escalation with context', 'Satisfaction logged' ),
				'items' => array( 'WhatsApp AI agent', '24/7 first response', 'Order status & FAQs', 'Smart escalation', 'Service quality dashboard' ),
			),
			'operations' => array(
				'label' => 'Operations',
				'lede'  => 'The daily run stops depending on chasing and checklists.',
				'flow'  => array( 'Job / order confirmed', 'Tasks generated', 'Teams notified', 'Progress tracked', 'Exception flagged', 'Completion reported' ),
				'items' => array( 'Task orchestration', 'SLA monitoring', 'Status notifications', 'Document generation', 'Exception queues' ),
			),
			'finance'   => array(
				'label' => 'Finance',
				'lede'  => 'Invoices process themselves; people approve, not retype.',
				'flow'  => array( 'Invoice received', 'Data extracted', 'PO matched & validated', 'Approval routed', 'Posted to ERP', 'Cash dashboard updated' ),
				'items' => array( 'Invoice processing', 'Approval routing', 'Payment reminders', 'Reconciliation support', 'VAT-conscious workflows' ),
			),
			'hr'        => array(
				'label' => 'HR',
				'lede'  => 'From application to onboarding without the paperwork chase.',
				'flow'  => array( 'Candidate applies', 'AI screening', 'Interview scheduled', 'Offer & documents', 'Onboarding checklist', 'HRMS updated' ),
				'items' => array( 'CV screening', 'Interview scheduling', 'Onboarding flows', 'Leave & expense workflows', 'Document tracking' ),
			),
			'marketing' => array(
				'label' => 'Marketing',
				'lede'  => 'Campaign responses become qualified pipeline, automatically.',
				'flow'  => array( 'Campaign response', 'Lead captured & tagged', 'AI qualification', 'Nurture sequence', 'Sales handover', 'Attribution reported' ),
				'items' => array( 'Lead capture from all channels', 'WhatsApp campaign follow-up', 'Segmented nurture', 'Handover rules', 'Campaign ROI reporting' ),
			),
			'management' => array(
				'label' => 'Management',
				'lede'  => 'You see the business live — nobody compiles anything.',
				'flow'  => array( 'Systems synchronized', 'KPIs modelled', 'Dashboard refreshed', 'Threshold alert', 'Drill-down to cause', 'Decision made on facts' ),
				'items' => array( 'Executive dashboard', 'Automated weekly brief', 'Threshold alerts', 'Cross-system KPIs', 'Board-ready reporting' ),
			),
			'it'        => array(
				'label' => 'IT',
				'lede'  => 'Integrations you govern, instead of scripts nobody remembers.',
				'flow'  => array( 'System event', 'Middleware routes it', 'Data validated & mapped', 'Systems updated', 'Failure retried & logged', 'Audit trail kept' ),
				'items' => array( 'API & webhook integration', 'Middleware architecture', 'Error handling & retries', 'Access control', 'Monitoring & logs' ),
			),
		)
	);
}

/**
 * Use-case library. Grouped for the /use-cases/ page and internal links.
 */
function operines_use_cases(): array {
	return apply_filters(
		'operines_use_cases',
		array(
			array( 'AI Lead Qualification', 'Every lead engaged and scored in seconds, whatever the hour.', 'sales', 'ai-agents' ),
			array( 'WhatsApp Sales Agent', 'Conversations that qualify, follow up and book — in Arabic and English.', 'sales', 'ai-agents' ),
			array( 'Automatic Customer Follow-up', 'Quotes, renewals and silent deals chased without anyone remembering.', 'sales', 'crm-sales-automation' ),
			array( 'Sales Pipeline Automation', 'Stage changes trigger tasks, documents and alerts on their own.', 'sales', 'crm-sales-automation' ),
			array( 'AI Customer Service', 'First response in seconds; humans handle the judgment calls.', 'service', 'ai-agents' ),
			array( 'Order Status Automation', '"Where is my order?" answered from live data, not a queue.', 'service', 'business-process-automation' ),
			array( 'Invoice Processing', 'Extracted, matched, approved and posted — with an audit trail.', 'finance', 'business-process-automation' ),
			array( 'Payment Reminders', 'Receivables chased politely, consistently and on time.', 'finance', 'erp-automation' ),
			array( 'Employee Onboarding', 'Contracts, accounts, equipment and training tracked to completion.', 'hr', 'business-process-automation' ),
			array( 'AI Recruitment Screening', 'Hundreds of CVs reduced to a shortlist with reasons.', 'hr', 'ai-agents' ),
			array( 'Executive Reporting', 'The Monday pack builds itself from live systems.', 'management', 'data-analytics-bi' ),
			array( 'ERP Notifications', 'Stock, approvals and exceptions pushed to the right person.', 'operations', 'erp-automation' ),
			array( 'Document Processing', 'IDs, contracts and forms read into your systems accurately.', 'operations', 'business-process-automation' ),
			array( 'Proposal Automation', 'Quotes and proposals generated from CRM data in minutes.', 'sales', 'crm-sales-automation' ),
			array( 'Internal Knowledge Assistant', 'Policies and product answers for your team, instantly.', 'operations', 'ai-agents' ),
			array( 'Email Triage & Automation', 'Shared inboxes sorted, answered and routed automatically.', 'service', 'business-process-automation' ),
		)
	);
}

/**
 * Integration ecosystem, grouped. Names only — no partnership implied.
 */
function operines_integrations(): array {
	return apply_filters(
		'operines_integrations',
		array(
			'Channels'        => array( 'WhatsApp Business', 'Email', 'Web chat', 'Voice', 'SMS' ),
			'CRM'             => array( 'Salesforce', 'Zoho', 'SuiteCRM', 'Odoo CRM', 'Custom CRM' ),
			'ERP & Finance'   => array( 'Odoo', 'Microsoft 365', 'Google Workspace', 'Accounting systems' ),
			'Data & BI'       => array( 'Power BI', 'SQL databases', 'Google Sheets', 'Data warehouses' ),
			'Automation'      => array( 'n8n', 'Make', 'Power Automate', 'UiPath', 'Custom middleware' ),
			'Commerce & Web'  => array( 'Shopify', 'WooCommerce', 'REST APIs', 'Webhooks' ),
		)
	);
}

/**
 * "The Operines Effect" — before/after transformation rows.
 * Descriptive, not fabricated metrics.
 */
function operines_effect_rows(): array {
	return apply_filters(
		'operines_effect_rows',
		array(
			array(
				'task'   => 'New lead handling',
				'before' => 'Lead sits in an inbox until someone notices, then gets typed into the CRM.',
				'b_cost' => 'Hours — or lost',
				'after'  => 'Identified, qualified, created in CRM, assigned, first reply sent.',
				'a_cost' => 'Seconds',
			),
			array(
				'task'   => 'Weekly management report',
				'before' => 'Numbers exported from four systems and assembled by hand.',
				'b_cost' => 'Half a day',
				'after'  => 'Systems synchronized continuously; the dashboard is the report.',
				'a_cost' => 'Live',
			),
			array(
				'task'   => 'Customer follow-up',
				'before' => 'Depends on whoever remembers, whenever they remember.',
				'b_cost' => 'Inconsistent',
				'after'  => 'Trigger, context, personalized message, escalation if ignored.',
				'a_cost' => 'Every time',
			),
			array(
				'task'   => 'Invoice to payment',
				'before' => 'Printed, forwarded, retyped, chased through three inboxes.',
				'b_cost' => 'Days',
				'after'  => 'Extracted, matched, routed for approval, posted to the ERP.',
				'a_cost' => 'Same day',
			),
		)
	);
}

/**
 * How we work — implementation stages.
 */
function operines_process(): array {
	return apply_filters(
		'operines_process',
		array(
			array( '01', 'Discover', 'We sit with your teams and map how work actually moves — not how the org chart says it moves.' ),
			array( '02', 'Map', 'Every manual step, handover and delay becomes a ranked opportunity map.' ),
			array( '03', 'Design', 'Architecture and business logic: what AI decides, what automation executes, what people approve.' ),
			array( '04', 'Build', 'Integrations, agents and workflows — built on the systems you already run.' ),
			array( '05', 'Test', 'Edge cases, approval gates and failure paths, proven before anything touches production.' ),
			array( '06', 'Deploy', 'Launched into the live operation, with your team trained on the new normal.' ),
			array( '07', 'Optimize', 'We measure what changed, tune what drifts, and extend what works.' ),
		)
	);
}

/**
 * Industries with concrete process narratives.
 */
function operines_industries(): array {
	return apply_filters(
		'operines_industries',
		array(
			'real-estate' => array(
				'label'   => 'Real Estate',
				'problem' => 'Portal leads go cold in hours; agents juggle WhatsApp threads; management can\'t see which listings convert.',
				'flow'    => array( 'Lead arrives from portal or WhatsApp', 'AI qualifies budget, area and intent', 'Assigned to the right agent instantly', 'CRM updated, viewing scheduled', 'Automatic follow-up until decision', 'Pipeline visible by project and agent' ),
				'outcome' => 'Every inquiry answered in seconds and followed to a conclusion — booked, closed or consciously dropped.',
			),
			'healthcare' => array(
				'label'   => 'Healthcare',
				'problem' => 'Front desks drown in booking calls and no-shows, while patient questions repeat all day.',
				'flow'    => array( 'Patient messages on WhatsApp', 'AI books, reschedules or answers', 'Reminders reduce no-shows', 'Front desk handles exceptions', 'Visit logged to the system', 'Utilization visible to management' ),
				'outcome' => 'Fewer missed appointments, calmer front desk, and patients answered at 10pm without staffing for it.',
			),
			'professional-services' => array(
				'label'   => 'Professional Services',
				'problem' => 'Billable people spend hours on intake, document chasing and status update emails.',
				'flow'    => array( 'Inquiry received and qualified', 'Engagement created in the system', 'Document checklist chased automatically', 'Work status visible to the client', 'Invoicing triggered on milestones', 'Partner dashboard shows utilization' ),
				'outcome' => 'Intake and admin run themselves; professionals spend their hours on the work clients pay for.',
			),
			'retail-ecommerce' => array(
				'label'   => 'Retail & E-commerce',
				'problem' => '"Where is my order?" floods every channel while stock and pricing live in disconnected systems.',
				'flow'    => array( 'Customer asks on WhatsApp', 'AI answers from live order data', 'Returns and exchanges initiated', 'Stock alerts trigger reordering', 'Abandoned carts followed up', 'Sales dashboard live across channels' ),
				'outcome' => 'Service scales with order volume instead of headcount, and inventory decisions come from live data.',
			),
			'hospitality' => array(
				'label'   => 'Hospitality',
				'problem' => 'Booking requests, guest questions and review follow-ups scatter across phone, email and chat.',
				'flow'    => array( 'Guest inquiry on any channel', 'AI answers availability and rates', 'Booking confirmed to the PMS', 'Pre-arrival messages sent', 'On-stay requests routed to staff', 'Post-stay review requested' ),
				'outcome' => 'Guests get instant answers around the clock; staff get requests, not message triage.',
			),
			'logistics' => array(
				'label'   => 'Logistics',
				'problem' => 'Shipment status lives in the operations team\'s heads; customers call to ask; updates are manual.',
				'flow'    => array( 'Order booked into the system', 'Milestones tracked automatically', 'Customers notified proactively', 'Exceptions escalated with context', 'PODs collected and filed', 'On-time performance dashboarded' ),
				'outcome' => 'Customers stop calling for updates because the updates arrive first.',
			),
			'financial-services' => array(
				'label'   => 'Financial & Accounting Services',
				'problem' => 'Client documents arrive late and unstructured; deadlines are tracked in spreadsheets and memory.',
				'flow'    => array( 'Client documents requested automatically', 'Submissions extracted and filed', 'Missing items chased politely', 'Work queue prioritized by deadline', 'Filings prepared from clean data', 'Client informed at every stage' ),
				'outcome' => 'Deadline season without the panic: documents in on time, work queued by risk, clients informed.',
			),
			'education' => array(
				'label'   => 'Education',
				'problem' => 'Admissions inquiries peak in waves; parents ask the same questions; enrollment steps stall on paperwork.',
				'flow'    => array( 'Inquiry from web or WhatsApp', 'AI answers programs and fees', 'Campus visit scheduled', 'Application steps tracked', 'Documents collected and verified', 'Enrollment funnel visible live' ),
				'outcome' => 'Every family answered immediately, and the admissions funnel becomes measurable.',
			),
		)
	);
}

/**
 * Illustrative "what automated actually means" ledger for the signature section.
 */
function operines_ledger(): array {
	return apply_filters(
		'operines_ledger',
		array(
			array( '09:31:02', 'Lead captured from website form' ),
			array( '09:31:03', 'Existing customer record matched' ),
			array( '09:31:04', 'AI qualification completed — high intent' ),
			array( '09:31:04', 'Opportunity created in CRM' ),
			array( '09:31:05', 'Account manager assigned' ),
			array( '09:31:05', 'Personalized WhatsApp reply sent' ),
			array( '09:31:07', 'Management dashboard updated' ),
		)
	);
}

/**
 * Site-wide FAQs (also used for FAQ schema on relevant pages).
 */
function operines_global_faqs(): array {
	return apply_filters(
		'operines_global_faqs',
		array(
			array(
				'What is AI business automation?',
				'AI business automation combines software integration, workflow automation and AI decision-making so that routine business work — lead handling, approvals, follow-ups, reporting — happens automatically across your existing systems, with people approving the steps that need judgment.',
			),
			array(
				'What is an AI agent?',
				'An AI agent is software that watches a channel or system, understands what is happening, and acts: answering a customer, updating a CRM record, routing an approval, or escalating to a person. Unlike a chatbot, an agent is connected to your systems and completes work, not just conversations.',
			),
			array(
				'Which business processes should be automated first?',
				'Start with processes that are frequent, rule-based and expensive when delayed: lead response, customer follow-up, invoice approvals, data entry between systems, and recurring reports. An automation audit ranks your specific processes by return against effort.',
			),
			array(
				'Can AI integrate with Odoo, Salesforce or Zoho?',
				'Yes. Operines connects AI agents and automations to Odoo, Salesforce, Zoho, SuiteCRM and custom systems through their APIs — reading data, writing records and triggering workflows, governed by rules you approve.',
			),
			array(
				'Can AI automate WhatsApp for business?',
				'Yes. Using the WhatsApp Business Platform, AI agents can answer customers, qualify leads, send follow-ups and connect conversations to your CRM — in Arabic and English. This is a core Operines specialty, and the focus of our Operines AI platform.',
			),
			array(
				'How much does business automation cost in the UAE?',
				'It depends on scope: a focused automation (one process, one integration) is a small project measured in weeks; an operation-wide intelligence layer is a phased program. The honest first step is an audit that prices specific opportunities against their measurable return — which is exactly what our AI Automation Audit produces.',
			),
			array(
				'What is the difference between RPA and AI agents?',
				'RPA replays fixed clicks and keystrokes; it breaks when screens or inputs change. AI agents understand intent from messages and documents, make bounded decisions, and call systems through APIs. Most real operations use both: deterministic automation for fixed rules, AI where inputs vary.',
			),
			array(
				'Do we lose control over decisions when we automate?',
				'No — control is designed in. You define what automation may do alone, what needs human approval, and what stays fully human. Every action is logged, and approval gates protect sensitive steps like payments, contracts and pricing.',
			),
		)
	);
}

/**
 * Primary navigation structure (rendered by header.php).
 */
function operines_nav(): array {
	$solutions = array();
	foreach ( operines_solutions() as $slug => $s ) {
		$solutions[] = array(
			'title' => $s['title'],
			'desc'  => $s['nav_desc'],
			'url'   => home_url( '/solutions/' . $slug . '/' ),
		);
	}
	return apply_filters(
		'operines_nav',
		array(
			'solutions'  => $solutions,
			'links'      => array(
				array( 'Industries', home_url( '/industries/' ) ),
				array( 'Use Cases', home_url( '/use-cases/' ) ),
				array( 'Operines AI', home_url( '/operines-ai/' ) ),
				array( 'Insights', home_url( '/insights/' ) ),
				array( 'About', home_url( '/about/' ) ),
			),
			'cta'        => array( 'Book an AI Automation Audit', home_url( '/book-audit/' ) ),
		)
	);
}

/**
 * Contact points. Single source of truth — update here when confirmed.
 * TODO(owner): confirm phone, WhatsApp number, address and social URLs.
 */
function operines_contact(): array {
	return apply_filters(
		'operines_contact',
		array(
			'email'    => 'hello@operines.com',   // TODO(owner): confirm.
			'whatsapp' => '',                      // TODO(owner): add number in international format, e.g. 9715XXXXXXXX.
			'phone'    => '',                      // TODO(owner): confirm.
			'location' => 'United Arab Emirates',  // TODO(owner): add office address if it should be public.
			'linkedin' => '',                      // TODO(owner): add URL.
		)
	);
}
