<?php
/**
 * Built-in tools: Google (Calendar, Gmail, Tasks, Drive), web research and
 * the webhook-connector tools (n8n, WhatsApp, CRM, Odoo, Power BI, Power
 * Platform, UiPath, Operines).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function mrabb_register_builtin_tools() {
	static $done = false;
	if ( $done ) {
		return;
	}
	$done = true;
	$tz   = wp_timezone();

	/* ------------------------------------------------------------ Calendar */
	MrAbb_Tools::register( 'calendar.search', array(
		'title'       => __( 'Checking Calendar', 'mr-abb' ),
		'description' => 'List calendar events. Use range today, tomorrow, week, or from/to ISO dates.',
		'level'       => 'read',
		'connection'  => 'google-calendar',
		'params'      => array(
			'range' => array( 'type' => 'string', 'enum' => array( 'today', 'tomorrow', 'week', 'custom' ), 'description' => 'Which period to look at.' ),
			'from'  => array( 'type' => 'string', 'description' => 'Start date/time (ISO 8601) when range is custom.' ),
			'to'    => array( 'type' => 'string', 'description' => 'End date/time (ISO 8601) when range is custom.' ),
		),
		'required'    => array( 'range' ),
		'handler'     => function ( $p ) use ( $tz ) {
			$range = isset( $p['range'] ) ? $p['range'] : 'today';
			$start = new DateTime( 'today', $tz );
			$end   = new DateTime( 'tomorrow', $tz );
			$label = __( 'Today', 'mr-abb' );
			if ( 'tomorrow' === $range ) { $start = new DateTime( 'tomorrow', $tz ); $end = new DateTime( 'tomorrow +1 day', $tz ); $label = __( 'Tomorrow', 'mr-abb' ); }
			if ( 'week' === $range ) { $end = new DateTime( 'today +7 days', $tz ); $label = __( 'This week', 'mr-abb' ); }
			if ( 'custom' === $range && ! empty( $p['from'] ) ) { $start = new DateTime( $p['from'], $tz ); $end = ! empty( $p['to'] ) ? new DateTime( $p['to'], $tz ) : ( clone $start )->modify( '+1 day' ); $label = $start->format( 'j M' ); }
			$events = MrAbb_Google::calendar_events( $start->format( DATE_ATOM ), $end->format( DATE_ATOM ), 25 );
			if ( is_wp_error( $events ) ) { return $events; }
			$brief = array_map( function ( $e ) { return $e['date'] . ' ' . $e['time'] . ' ' . $e['title'] . ( $e['location'] ? ' @ ' . $e['location'] : '' ); }, $events );
			return array(
				'summary'  => count( $events ) ? count( $events ) . ' events: ' . implode( '; ', $brief ) : 'No events in that period.',
				'subtitle' => sprintf( _n( '%d event', '%d events', count( $events ), 'mr-abb' ), count( $events ) ),
				'data'     => $events,
				'card'     => array( 'type' => 'calendar', 'title' => sprintf( _n( '%d meeting', '%d meetings', count( $events ), 'mr-abb' ), count( $events ) ), 'data' => array( 'label' => $label, 'events' => $events ) ),
			);
		},
	) );

	MrAbb_Tools::register( 'calendar.create', array(
		'title'       => __( 'Creating meeting', 'mr-abb' ),
		'description' => 'Create a calendar event. start and end are ISO 8601 date-times in the owner timezone.',
		'level'       => 'action',
		'connection'  => 'google-calendar',
		'params'      => array(
			'title'       => array( 'type' => 'string' ),
			'start'       => array( 'type' => 'string', 'description' => 'ISO 8601 start, e.g. 2026-09-21T10:00:00' ),
			'end'         => array( 'type' => 'string', 'description' => 'ISO 8601 end. Default 30 minutes after start.' ),
			'attendees'   => array( 'type' => 'array', 'items' => array( 'type' => 'string' ), 'description' => 'Attendee emails.' ),
			'description' => array( 'type' => 'string' ),
			'location'    => array( 'type' => 'string' ),
		),
		'required'    => array( 'title', 'start' ),
		'handler'     => function ( $p ) use ( $tz ) {
			$start = new DateTime( $p['start'], $tz );
			$end   = ! empty( $p['end'] ) ? new DateTime( $p['end'], $tz ) : ( clone $start )->modify( '+30 minutes' );
			$r     = MrAbb_Google::calendar_create( $p['title'], $start->format( 'Y-m-d\TH:i:s' ), $end->format( 'Y-m-d\TH:i:s' ), isset( $p['attendees'] ) ? $p['attendees'] : array(), isset( $p['description'] ) ? $p['description'] : '', isset( $p['location'] ) ? $p['location'] : '' );
			if ( is_wp_error( $r ) ) { return $r; }
			$mins = ( $end->getTimestamp() - $start->getTimestamp() ) / 60;
			return array(
				'summary' => 'Created "' . $p['title'] . '" on ' . $start->format( 'l j M H:i' ) . '.',
				'data'    => array( 'id' => isset( $r['id'] ) ? $r['id'] : '', 'link' => isset( $r['htmlLink'] ) ? $r['htmlLink'] : '' ),
				'card'    => array( 'type' => 'calendar', 'title' => __( 'Meeting created', 'mr-abb' ), 'data' => array( 'label' => $start->format( 'D j M' ), 'created' => true, 'events' => array( array( 'time' => $start->format( 'H:i' ), 'title' => $p['title'], 'location' => isset( $p['location'] ) ? $p['location'] : '', 'duration' => $mins . 'm' ) ) ) ),
			);
		},
	) );

	/* --------------------------------------------------------------- Tasks */
	$task_shape = function ( $rows, $source ) {
		return array_map( function ( $t ) use ( $source ) {
			return array( 'id' => (string) $t['id'], 'title' => $t['title'], 'time' => isset( $t['due_time'] ) ? $t['due_time'] : '', 'date' => isset( $t['due'] ) ? $t['due'] : ( isset( $t['due_at'] ) ? $t['due_at'] : '' ), 'source' => isset( $t['source'] ) ? $t['source'] : $source, 'priority' => isset( $t['priority'] ) ? $t['priority'] : 'medium', 'status' => $t['status'] );
		}, $rows );
	};
	MrAbb_Tools::register( 'tasks.list', array(
		'title'       => __( 'Checking Tasks', 'mr-abb' ),
		'description' => 'List the owner\'s tasks (Google Tasks when connected, plus tasks created by Mr. Abb).',
		'level'       => 'read',
		'params'      => array( 'filter' => array( 'type' => 'string', 'enum' => array( 'open', 'all' ) ) ),
		'handler'     => function ( $p, $ctx ) use ( $task_shape ) {
			$all   = isset( $p['filter'] ) && 'all' === $p['filter'];
			$tasks = $task_shape( MrAbb_Store::list_tasks( $ctx['user_id'], $all ), 'manual' );
			if ( MrAbb_Google::is_connected() ) {
				$g = MrAbb_Google::tasks_list( $all );
				if ( ! is_wp_error( $g ) ) {
					$tasks = array_merge( $task_shape( $g, 'google' ), $tasks );
				}
			}
			$open = array_filter( $tasks, function ( $t ) { return 'open' === $t['status']; } );
			return array(
				'summary'  => count( $open ) ? count( $open ) . ' open tasks: ' . implode( '; ', array_map( function ( $t ) { return $t['title'] . ( $t['date'] ? ' (' . substr( $t['date'], 0, 10 ) . ')' : '' ); }, array_slice( array_values( $open ), 0, 12 ) ) ) : 'No open tasks.',
				'subtitle' => sprintf( _n( '%d open', '%d open', count( $open ), 'mr-abb' ), count( $open ) ),
				'data'     => $tasks,
				'card'     => array( 'type' => 'tasks', 'title' => __( "Today's priorities", 'mr-abb' ), 'data' => array( 'tasks' => array_slice( array_values( $open ), 0, 8 ) ) ),
			);
		},
	) );
	MrAbb_Tools::register( 'tasks.create', array(
		'title'       => __( 'Creating task', 'mr-abb' ),
		'description' => 'Create a task or reminder for the owner.',
		'level'       => 'action',
		'params'      => array( 'title' => array( 'type' => 'string' ), 'due' => array( 'type' => 'string', 'description' => 'Due date YYYY-MM-DD (optional).' ), 'time' => array( 'type' => 'string', 'description' => 'Due time HH:MM (optional).' ), 'priority' => array( 'type' => 'string', 'enum' => array( 'high', 'medium', 'low' ) ), 'notes' => array( 'type' => 'string' ) ),
		'required'    => array( 'title' ),
		'handler'     => function ( $p, $ctx ) {
			$ext = '';
			if ( MrAbb_Google::is_connected() ) {
				$g = MrAbb_Google::tasks_create( $p['title'], isset( $p['due'] ) ? $p['due'] : '', isset( $p['notes'] ) ? $p['notes'] : '' );
				if ( ! is_wp_error( $g ) && isset( $g['id'] ) ) { $ext = $g['id']; }
			}
			$id = MrAbb_Store::add_task( $ctx['user_id'], $p['title'], ! empty( $p['due'] ) ? gmdate( 'Y-m-d 00:00:00', strtotime( $p['due'] ) ) : null, isset( $p['time'] ) ? $p['time'] : '', 'ai', isset( $p['priority'] ) ? $p['priority'] : 'medium', $ext );
			return array( 'summary' => 'Task created: ' . $p['title'], 'data' => array( 'id' => $id ), 'card' => array( 'type' => 'tasks', 'title' => __( 'Task created', 'mr-abb' ), 'data' => array( 'tasks' => array( array( 'id' => (string) $id, 'title' => $p['title'], 'time' => isset( $p['time'] ) ? $p['time'] : '', 'source' => 'ai', 'priority' => isset( $p['priority'] ) ? $p['priority'] : 'medium', 'status' => 'open' ) ) ) ) );
		},
	) );
	MrAbb_Tools::register( 'tasks.complete', array(
		'title'       => __( 'Completing task', 'mr-abb' ),
		'description' => 'Mark a task as done by id or by (part of) its title.',
		'level'       => 'action',
		'params'      => array( 'id' => array( 'type' => 'string' ), 'title' => array( 'type' => 'string' ) ),
		'handler'     => function ( $p, $ctx ) {
			$q = isset( $p['title'] ) ? mb_strtolower( $p['title'] ) : '';
			foreach ( MrAbb_Store::list_tasks( $ctx['user_id'], false ) as $t ) {
				if ( ( isset( $p['id'] ) && (string) $t['id'] === (string) $p['id'] ) || ( $q && false !== mb_strpos( mb_strtolower( $t['title'] ), $q ) ) ) {
					MrAbb_Store::complete_task( $ctx['user_id'], $t['id'] );
					if ( $t['external_id'] && MrAbb_Google::is_connected() ) { MrAbb_Google::tasks_complete( $t['external_id'] ); }
					return array( 'summary' => 'Completed: ' . $t['title'] );
				}
			}
			if ( MrAbb_Google::is_connected() ) {
				$g = MrAbb_Google::tasks_list( false );
				if ( ! is_wp_error( $g ) ) {
					foreach ( $g as $t ) {
						if ( ( isset( $p['id'] ) && $t['id'] === $p['id'] ) || ( $q && false !== mb_strpos( mb_strtolower( $t['title'] ), $q ) ) ) {
							$r = MrAbb_Google::tasks_complete( $t['id'] );
							return is_wp_error( $r ) ? $r : array( 'summary' => 'Completed: ' . $t['title'] );
						}
					}
				}
			}
			return new WP_Error( 'mrabb_task_not_found', __( 'No matching open task.', 'mr-abb' ) );
		},
	) );

	/* --------------------------------------------------------------- Email */
	MrAbb_Tools::register( 'email.search', array(
		'title'       => __( 'Reading emails', 'mr-abb' ),
		'description' => 'Search Gmail. query uses Gmail search syntax, e.g. "is:unread newer_than:1d" or "from:ahmed".',
		'level'       => 'read',
		'connection'  => 'gmail',
		'params'      => array( 'query' => array( 'type' => 'string' ), 'max' => array( 'type' => 'integer', 'description' => 'Max messages (default 8).' ) ),
		'required'    => array( 'query' ),
		'handler'     => function ( $p ) {
			$m = MrAbb_Google::gmail_search( $p['query'], isset( $p['max'] ) ? min( 15, max( 1, (int) $p['max'] ) ) : 8 );
			if ( is_wp_error( $m ) ) { return $m; }
			return array(
				'summary'  => count( $m ) ? count( $m ) . ' messages: ' . implode( '; ', array_map( function ( $x ) { return $x['from'] . ' — ' . $x['subject'] . ' (' . $x['date'] . ') id=' . $x['id']; }, $m ) ) : 'No messages matched.',
				'subtitle' => sprintf( _n( '%d message', '%d messages', count( $m ), 'mr-abb' ), count( $m ) ),
				'data'     => $m,
				'card'     => array( 'type' => 'email', 'title' => $p['query'], 'data' => array( 'label' => 'Gmail', 'messages' => $m ), 'wide' => true ),
			);
		},
	) );
	MrAbb_Tools::register( 'email.read', array(
		'title'       => __( 'Reading email', 'mr-abb' ),
		'description' => 'Read the full text of one Gmail message by id (from email.search).',
		'level'       => 'read',
		'connection'  => 'gmail',
		'params'      => array( 'id' => array( 'type' => 'string' ) ),
		'required'    => array( 'id' ),
		'handler'     => function ( $p ) {
			$m = MrAbb_Google::gmail_read( $p['id'] );
			if ( is_wp_error( $m ) ) { return $m; }
			return array( 'summary' => 'From ' . $m['from'] . ' — ' . $m['subject'] . "\n" . $m['body'], 'data' => $m );
		},
	) );
	$email_details = function ( $p ) { return array( 'To' => isset( $p['to'] ) ? $p['to'] : '', 'Subject' => isset( $p['subject'] ) ? $p['subject'] : '' ); };
	$email_preview = function ( $p ) { return isset( $p['body'] ) ? $p['body'] : ''; };
	MrAbb_Tools::register( 'email.draft', array(
		'title'       => __( 'Drafting email', 'mr-abb' ),
		'description' => 'Save an email draft in Gmail (does not send).',
		'level'       => 'action',
		'connection'  => 'gmail',
		'params'      => array( 'to' => array( 'type' => 'string' ), 'subject' => array( 'type' => 'string' ), 'body' => array( 'type' => 'string' ), 'cc' => array( 'type' => 'string' ) ),
		'required'    => array( 'to', 'subject', 'body' ),
		'handler'     => function ( $p ) {
			$r = MrAbb_Google::gmail_draft( $p['to'], $p['subject'], $p['body'], isset( $p['cc'] ) ? $p['cc'] : '' );
			if ( is_wp_error( $r ) ) { return $r; }
			return array( 'summary' => 'Draft saved to ' . $p['to'] . ': ' . $p['subject'], 'card' => array( 'type' => 'email', 'data' => array( 'status' => 'draft', 'to' => $p['to'], 'subject' => $p['subject'], 'body' => $p['body'] ) ) );
		},
	) );
	MrAbb_Tools::register( 'email.send', array(
		'title'       => __( 'Send email', 'mr-abb' ),
		'description' => 'Send an email from the owner\'s Gmail. Requires approval.',
		'level'       => 'approval',
		'connection'  => 'gmail',
		'params'      => array( 'to' => array( 'type' => 'string' ), 'subject' => array( 'type' => 'string' ), 'body' => array( 'type' => 'string' ), 'cc' => array( 'type' => 'string' ) ),
		'required'    => array( 'to', 'subject', 'body' ),
		'details'     => $email_details,
		'preview'     => $email_preview,
		'handler'     => function ( $p ) {
			$r = MrAbb_Google::gmail_send( $p['to'], $p['subject'], $p['body'], isset( $p['cc'] ) ? $p['cc'] : '' );
			if ( is_wp_error( $r ) ) { return $r; }
			return array( 'summary' => 'Email sent to ' . $p['to'] . '.', 'subtitle' => __( 'Delivered', 'mr-abb' ), 'card' => array( 'type' => 'email', 'data' => array( 'status' => 'sent', 'to' => $p['to'], 'subject' => $p['subject'] ) ) );
		},
	) );

	/* --------------------------------------------------------------- Drive */
	MrAbb_Tools::register( 'drive.search', array(
		'title'       => __( 'Searching Drive', 'mr-abb' ),
		'description' => 'Find files in Google Drive by name.',
		'level'       => 'read',
		'connection'  => 'google-drive',
		'params'      => array( 'query' => array( 'type' => 'string' ) ),
		'required'    => array( 'query' ),
		'handler'     => function ( $p ) {
			$f = MrAbb_Google::drive_search( $p['query'] );
			if ( is_wp_error( $f ) ) { return $f; }
			return array( 'summary' => count( $f ) ? count( $f ) . ' files: ' . implode( '; ', array_map( function ( $x ) { return $x['name']; }, $f ) ) : 'No files found.', 'data' => $f, 'card' => array( 'type' => 'documents', 'title' => $p['query'], 'data' => array( 'label' => 'Drive', 'documents' => $f ) ) );
		},
	) );

	/* ----------------------------------------------------------------- Web */
	MrAbb_Tools::register( 'web.search', array(
		'title'       => __( 'Researching the web', 'mr-abb' ),
		'description' => 'Search the web and summarise findings with sources.',
		'level'       => 'read',
		'connection'  => 'web',
		'params'      => array( 'query' => array( 'type' => 'string' ) ),
		'required'    => array( 'query' ),
		'handler'     => function ( $p, $ctx ) {
			$r = MrAbb_Brain::web_search( $p['query'], isset( $ctx['language'] ) ? $ctx['language'] : mrabb_current_language() );
			if ( is_wp_error( $r ) ) { return $r; }
			return array( 'summary' => $r['summary'], 'subtitle' => sprintf( _n( '%d source', '%d sources', count( $r['sources'] ), 'mr-abb' ), count( $r['sources'] ) ), 'data' => $r, 'card' => array( 'type' => 'web', 'title' => $p['query'], 'data' => array( 'query' => $p['query'], 'summary' => $r['summary'], 'sources' => $r['sources'] ) ) );
		},
	) );

	/* --------------------------------------------- Webhook connector tools */
	$connector_tool = function ( $name, $connector, $action, $title, $description, $level, $params, $required, $card_type = null, $details = null, $preview = null ) {
		MrAbb_Tools::register( $name, array_filter( array(
			'title'       => $title,
			'description' => $description,
			'level'       => $level,
			'connection'  => $connector,
			'params'      => $params,
			'required'    => $required,
			'details'     => $details,
			'preview'     => $preview,
			'handler'     => function ( $p, $ctx ) use ( $connector, $action, $card_type, $name ) {
				$r = MrAbb_Connectors::call( $connector, $action, $p, $ctx['user_id'] );
				if ( is_wp_error( $r ) ) { return $r; }
				$card = isset( $r['card'] ) && is_array( $r['card'] ) ? $r['card'] : ( isset( $r['data'] ) ? array( 'type' => $card_type ? $card_type : mrabb_card_type_for_tool( $name ), 'title' => isset( $r['title'] ) ? $r['title'] : '', 'data' => $r['data'] ) : null );
				return array( 'summary' => isset( $r['summary'] ) ? $r['summary'] : ( isset( $r['message'] ) ? $r['message'] : 'Done.' ), 'subtitle' => isset( $r['subtitle'] ) ? $r['subtitle'] : '', 'data' => isset( $r['data'] ) ? $r['data'] : null, 'card' => $card );
			},
		) ) );
	};

	$connector_tool( 'n8n.executeWorkflow', 'n8n', 'execute', __( 'Running workflow', 'mr-abb' ), 'Run an n8n workflow by name with an optional payload.', 'action', array( 'workflow' => array( 'type' => 'string', 'description' => 'Workflow name or key.' ), 'payload' => array( 'type' => 'object', 'description' => 'Input for the workflow.' ) ), array( 'workflow' ), 'automation' );
	$connector_tool( 'whatsapp.send', 'whatsapp', 'send', __( 'Send WhatsApp message', 'mr-abb' ), 'Send a WhatsApp message. Requires approval.', 'approval', array( 'to' => array( 'type' => 'string', 'description' => 'Recipient name or phone.' ), 'message' => array( 'type' => 'string' ) ), array( 'to', 'message' ), 'whatsapp', function ( $p ) { return array( 'To' => $p['to'] ); }, function ( $p ) { return $p['message']; } );
	$connector_tool( 'crm.searchCustomer', 'crm', 'searchCustomer', __( 'Searching CRM', 'mr-abb' ), 'Find customers or contacts in the CRM.', 'read', array( 'query' => array( 'type' => 'string' ) ), array( 'query' ), 'customers' );
	$connector_tool( 'crm.listOpportunities', 'crm', 'listOpportunities', __( 'Analyzing Opportunities', 'mr-abb' ), 'List sales opportunities. filter: closing_this_month, at_risk, all.', 'read', array( 'filter' => array( 'type' => 'string' ) ), array(), 'crm' );
	$connector_tool( 'crm.updateOpportunity', 'crm', 'updateOpportunity', __( 'Update opportunity', 'mr-abb' ), 'Update an opportunity (stage, value, notes). Requires approval.', 'approval', array( 'id' => array( 'type' => 'string' ), 'fields' => array( 'type' => 'object' ) ), array( 'id', 'fields' ), 'crm' );
	$connector_tool( 'odoo.query', 'odoo', 'query', __( 'Checking Odoo', 'mr-abb' ), 'Query Odoo records. Describe what you need in query.', 'read', array( 'query' => array( 'type' => 'string' ), 'model' => array( 'type' => 'string' ) ), array( 'query' ), 'odoo' );
	$connector_tool( 'powerbi.query', 'power-bi', 'query', __( 'Reading Power BI', 'mr-abb' ), 'Read KPIs or a dataset from Power BI.', 'read', array( 'query' => array( 'type' => 'string' ), 'dataset' => array( 'type' => 'string' ) ), array( 'query' ), 'analytics' );
	$connector_tool( 'operines.query', 'operines', 'query', __( 'Checking Operines', 'mr-abb' ), 'Query operational data in Operines.', 'read', array( 'query' => array( 'type' => 'string' ) ), array( 'query' ), 'report' );
	$connector_tool( 'powerplatform.runFlow', 'power-platform', 'runFlow', __( 'Running Power Automate flow', 'mr-abb' ), 'Trigger a Power Automate flow by name.', 'action', array( 'flow' => array( 'type' => 'string' ), 'payload' => array( 'type' => 'object' ) ), array( 'flow' ), 'automation' );
	$connector_tool( 'uipath.executeProcess', 'uipath', 'execute', __( 'Running UiPath process', 'mr-abb' ), 'Start a UiPath process by name.', 'action', array( 'process' => array( 'type' => 'string' ), 'input' => array( 'type' => 'object' ) ), array( 'process' ), 'automation' );
}
add_action( 'mrabb_register_tools', 'mrabb_register_builtin_tools' );
