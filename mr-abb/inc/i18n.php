<?php
/**
 * Built-in Arabic strings for the interface.
 *
 * WordPress normally loads translations from .mo files based on the site
 * locale. Mr. Abb lets the owner switch languages per user, so the theme
 * carries its own Arabic dictionary and applies it through the gettext
 * filter whenever the interface language is Arabic. A languages/*.mo file,
 * if present, still takes precedence.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Arabic dictionary (Egyptian-friendly, business register).
 *
 * @return array
 */
function mrabb_arabic_strings() {
	return array(
		'AI Command Center'                                  => 'مركز القيادة الذكي',
		'Actions'                                            => 'الإجراءات',
		'Administrators only.'                               => 'للمسؤولين فقط.',
		'Automations'                                        => 'الأتمتة',
		'Back to Mr. Abb'                                    => 'العودة إلى مستر عب',
		'Close'                                              => 'إغلاق',
		'Collapse sidebar'                                   => 'طي القائمة الجانبية',
		'Connect your tools and Mr. Abb becomes more capable.' => 'اربط أدواتك ومستر عب هيقدر يعمل أكتر.',
		'Connections'                                        => 'الاتصالات',
		'Context'                                            => 'السياق',
		'Conversation'                                       => 'المحادثة',
		'Demo'                                               => 'تجريبي',
		'Details'                                            => 'التفاصيل',
		'Every session, what was said, what was done.'       => 'كل جلسة: إيه اللي اتقال، وإيه اللي اتعمل.',
		'Forgot your password?'                              => 'نسيت كلمة السر؟',
		'From you, from your tools, from Mr. Abb.'           => 'منك، من أدواتك، ومن مستر عب.',
		'Go back to the command center and just ask.'        => 'ارجع لمركز القيادة واسأل.',
		'Good afternoon, %s.'                                => 'مساء الخير يا %s.',
		'Good evening, %s.'                                  => 'مساء الخير يا %s.',
		'Good morning, %s.'                                  => 'صباح الخير يا %s.',
		'History'                                            => 'السجل',
		'Home'                                               => 'الرئيسية',
		'Keep me signed in'                                  => 'خليني مسجل الدخول',
		'Mobile navigation'                                  => 'تنقل الهاتف',
		'New Session'                                        => 'جلسة جديدة',
		'New automation'                                     => 'أتمتة جديدة',
		'Nothing here yet.'                                  => 'مفيش حاجة هنا لسه.',
		'Open menu'                                          => 'فتح القائمة',
		'Password'                                           => 'كلمة السر',
		'Please enter both your username and password.'      => 'من فضلك أدخل اسم المستخدم وكلمة السر.',
		'Please sign in to talk to Mr. Abb.'                 => 'سجّل الدخول عشان تتكلم مع مستر عب.',
		'Primary'                                            => 'رئيسي',
		'Priority tasks'                                     => 'المهام الأهم',
		'Profile'                                            => 'الملف الشخصي',
		'Ready'                                              => 'جاهز',
		'Recent actions'                                     => 'آخر الإجراءات',
		'Results'                                            => 'النتائج',
		'Sections'                                           => 'الأقسام',
		'Send'                                               => 'إرسال',
		'Session'                                            => 'الجلسة',
		'Settings'                                           => 'الإعدادات',
		'Sign in'                                            => 'تسجيل الدخول',
		'Sign in to talk to Mr. Abb.'                        => 'سجّل الدخول عشان تتكلم مع مستر عب.',
		'Sign out'                                           => 'تسجيل الخروج',
		'Skip to content'                                    => 'تخطي إلى المحتوى',
		'Start Talking'                                      => 'ابدأ الكلام',
		'Start listening'                                    => 'ابدأ الاستماع',
		'Switch language'                                    => 'تغيير اللغة',
		'Tap to talk'                                        => 'اضغط للتحدث',
		'Tasks'                                              => 'المهام',
		'That did not match. Try again.'                     => 'البيانات مش صحيحة. حاول تاني.',
		'That page does not exist.'                          => 'الصفحة دي مش موجودة.',
		'Things Mr. Abb does without being asked.'           => 'حاجات مستر عب بيعملها من غير ما تطلب.',
		'This space is private.'                             => 'المساحة دي خاصة.',
		'Toggle context panel'                               => 'إظهار/إخفاء لوحة السياق',
		'Tools'                                              => 'الأدوات',
		'Try asking Mr. Abb instead.'                        => 'جرّب تسأل مستر عب.',
		'Type a command'                                     => 'اكتب أمراً',
		'Username or email'                                  => 'اسم المستخدم أو البريد',
		'Voice'                                              => 'الصوت',
		'Voice is turned off in settings.'                   => 'الصوت متوقف من الإعدادات.',
		'Welcome back.'                                      => 'أهلاً بعودتك.',
		'What should we do?'                                 => 'نعمل إيه النهارده؟',
		'Your AI Command Center'                             => 'مركز القيادة الذكي الخاص بك',
		'Your account is not allowed to use this interface.' => 'حسابك مش مسموح له باستخدام الواجهة دي.',
		'or type a command…'                                 => 'أو اكتب أمراً…',
		"Today's schedule"                                   => 'مواعيد النهارده',
		'Nothing urgent.'                                    => 'مفيش حاجة مستعجلة.',
		"That's a good thing."                               => 'ودي حاجة كويسة.',
	);
}

/**
 * Translate theme strings to Arabic when the interface language is Arabic.
 *
 * @param string $translation Translated text (possibly untranslated).
 * @param string $text        Original text.
 * @param string $domain      Text domain.
 * @return string
 */
function mrabb_gettext_arabic( $translation, $text, $domain ) {
	if ( 'mr-abb' !== $domain || is_admin() ) {
		return $translation;
	}
	if ( $translation !== $text ) {
		return $translation; // A real .mo translation exists.
	}
	static $dict = null;
	static $lang = null;
	if ( null === $lang ) {
		$lang = function_exists( 'mrabb_current_language' ) ? mrabb_current_language() : 'en';
	}
	if ( 'ar' !== $lang ) {
		return $translation;
	}
	if ( null === $dict ) {
		$dict = mrabb_arabic_strings();
	}
	return isset( $dict[ $text ] ) ? $dict[ $text ] : $translation;
}
add_filter( 'gettext', 'mrabb_gettext_arabic', 10, 3 );
