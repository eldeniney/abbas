<?php
/**
 * Template Name: Standalone Survey (Arabic)
 *
 * A self-contained, unbranded Arabic-only landing page for the Beheira
 * shopping & delivery needs survey. Deliberately does NOT use the site
 * header/footer and never mentions any brand name. noindex — temporary
 * data-collection page.
 *
 * @package Operines
 */

$survey_css = get_theme_file_uri( 'assets/css/survey.css' );
$survey_js  = get_theme_file_uri( 'assets/js/survey.js' );
$survey_ver = (string) filemtime( get_theme_file_path( 'assets/css/survey.css' ) );
$fonts_dir  = get_theme_file_uri( 'assets/fonts' );
$img_dir    = get_theme_file_uri( 'assets/img' );

if ( ! function_exists( 'op_sv_icon' ) ) {
	/**
	 * Inline rounded line icons (24x24, stroke 1.8, round caps) — the brand
	 * calls for simple rounded icons with a consistent stroke weight.
	 */
	function op_sv_icon( string $name, int $size = 22 ): string {
		$paths = array(
			'gift'    => '<rect x="4" y="11.5" width="16" height="8.5" rx="2"/><rect x="3" y="7.5" width="18" height="4" rx="1.6"/><path d="M12 7.5V20"/><path d="M12 7.3C10 7.3 8.2 6.4 8.2 4.9c0-1.4 1.9-2.1 3.8 1 1.9-3.1 3.8-2.4 3.8-1 0 1.5-1.8 2.4-3.8 2.4z"/>',
			'user'    => '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5"/>',
			'pin'     => '<path d="M12 21s-6.5-5.3-6.5-10a6.5 6.5 0 0 1 13 0c0 4.7-6.5 10-6.5 10z"/><circle cx="12" cy="10.5" r="2.3"/>',
			'basket'  => '<path d="M4 9.5h16l-1.4 8.6a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7L4 9.5z"/><path d="M8.5 9.5 12 3.5l3.5 6"/><path d="M9.7 13v3.5M14.3 13v3.5"/>',
			'store'   => '<path d="M4.5 9 5.8 4h12.4l1.3 5"/><path d="M4 9a2.65 2.65 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.65 2.65 0 0 0 20 9"/><path d="M5.8 12.5V20h12.4v-7.5"/><path d="M10 20v-4.8h4V20"/>',
			'clock'   => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
			'box'     => '<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8"/><path d="M12 12.5v8"/>',
			'scooter' => '<circle cx="5.6" cy="17.3" r="2.4"/><circle cx="18.4" cy="17.3" r="2.4"/><path d="M8 17.3h5l1.9-7.3h3.4"/><path d="M16.4 6.5h2l.9 3.5"/><rect x="3.8" y="7.6" width="6.4" height="5.4" rx="1.4"/>',
			'search'  => '<circle cx="11" cy="11" r="6.5"/><path d="m15.9 15.9 4.6 4.6"/>',
			'flash'   => '<path d="M13 3 5.7 13.4h4.8L10.8 21l7.5-11.3h-5L13 3z"/>',
			'star'    => '<path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6z"/>',
			'coins'   => '<ellipse cx="12" cy="6.3" rx="7" ry="2.9"/><path d="M5 6.3v5.5c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6.3"/><path d="M5 11.8v5.4c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9v-5.4"/>',
			'card'    => '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18"/><path d="M6.5 14.5H11"/>',
			'apple'   => '<path d="M12 7.6c-1.1-1.5-3-2-4.5-1-2.8 1.7-2.9 5.5-1 8.9 1.9 3.5 4.5 5 5.5 5s3.6-1.5 5.5-5 1.8-7.2-1-8.9c-1.5-1-3.4-.5-4.5 1z"/><path d="M12 7.6c0-2 1-3.6 3-4.1"/>',
			'bread'   => '<path d="M4 12.7a8 8 0 0 1 16 0v5.8H4z"/><path d="M9 9.7v3.8M12 9.2v4.3M15 9.7v3.8"/>',
			'fish'    => '<path d="M7 12s3-5 8-5c3.2 0 5.3 2.6 6 5-.7 2.4-2.8 5-6 5-5 0-8-5-8-5z"/><path d="M7 12 3.5 8.8v6.4L7 12z"/><circle cx="16.6" cy="10.9" r="0.4" fill="currentColor" stroke="none"/>',
			'egg'     => '<path d="M12 3.6c3 0 6 5 6 9.4a6 6 0 0 1-12 0c0-4.4 3-9.4 6-9.4z"/>',
			'pill'    => '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8.5v7M8.5 12h7"/>',
			'plate'   => '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.4"/>',
			'home'    => '<path d="m4 11 8-7 8 7"/><path d="M6 9.4V20h12V9.4"/><path d="M10 20v-5.4h4V20"/>',
			'bottle'  => '<path d="M10.4 5.4c0-1 .7-1.9 1.6-1.9s1.6.9 1.6 1.9"/><path d="M10 7.4h4"/><rect x="9" y="7.4" width="6" height="12.6" rx="2.6"/><path d="M9 12.2h6"/>',
			'wheat'   => '<path d="M12 21V7.6"/><path d="M12 7.6c-2.4 0-3.9-1.4-3.9-3.9 2.4 0 3.9 1.4 3.9 3.9zM12 7.6c2.4 0 3.9-1.4 3.9-3.9-2.4 0-3.9 1.4-3.9 3.9z"/><path d="M12 12.6c-2.4 0-3.9-1.4-3.9-3.9 2.4 0 3.9 1.4 3.9 3.9zM12 12.6c2.4 0 3.9-1.4 3.9-3.9-2.4 0-3.9 1.4-3.9 3.9z"/><path d="M12 17.6c-2.4 0-3.9-1.4-3.9-3.9 2.4 0 3.9 1.4 3.9 3.9zM12 17.6c2.4 0 3.9-1.4 3.9-3.9-2.4 0-3.9 1.4-3.9 3.9z"/>',
			'dots'    => '<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
			'sparkle' => '<path d="m12 3.5 1.7 5.1 5.1 1.7-5.1 1.7-1.7 5.1-1.7-5.1-5.1-1.7 5.1-1.7L12 3.5z"/>',
			'copy'    => '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
			'check'   => '<path d="M5 13l4 4L19 7"/>',
			'back'    => '<path d="M9 6l6 6-6 6"/>',
		);
		if ( ! isset( $paths[ $name ] ) ) {
			return '';
		}
		return sprintf(
			'<svg viewBox="0 0 24 24" width="%1$d" height="%1$d" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%2$s</svg>',
			$size,
			$paths[ $name ]
		);
	}
}

/**
 * Step heading with its icon chip.
 */
if ( ! function_exists( 'op_sv_step_head' ) ) {
	function op_sv_step_head( string $icon, string $title, string $hint = '' ): void {
		printf( '<span class="sv-step-icon">%s</span>', op_sv_icon( $icon, 24 ) ); // phpcs:ignore WordPress.Security.EscapeOutput
		printf( '<h2 class="sv-q-title">%s</h2>', esc_html( $title ) );
		if ( $hint ) {
			printf( '<p class="sv-q-hint">%s</p>', wp_kses( $hint, array( 'span' => array( 'class' => true, 'id' => true ) ) ) );
		}
	}
}
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#3A1F3D">
<title>استبيان احتياجات التسوق والتوصيل — البحيرة</title>
<meta property="og:type" content="website">
<meta property="og:title" content="جاوب على كام سؤال بسيط وخد 75 جنيه هدية 🎁">
<meta property="og:description" content="استبيان سريع عن التسوق والتوصيل في البحيرة — دقايق معدودة، وهديتك كود بقيمة 75 جنيه لأول طلب عند الإطلاق.">
<meta property="og:url" content="<?php echo esc_url( get_permalink() ); ?>">
<meta property="og:image" content="<?php echo esc_url( $img_dir . '/survey-og.png' ); ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="icon" type="image/svg+xml" href="<?php echo esc_url( $img_dir . '/survey-favicon.svg' ); ?>">
<link rel="apple-touch-icon" href="<?php echo esc_url( $img_dir . '/survey-touch.png' ); ?>">
<link rel="preload" href="<?php echo esc_url( $fonts_dir ); ?>/baloo2-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?php echo esc_url( $survey_css . '?v=' . $survey_ver ); ?>">
</head>
<body class="survey-body">

<div class="sv-top" id="svTop" hidden>
	<div class="sv-top-inner">
		<button type="button" class="sv-back" id="svBack" aria-label="رجوع">
			<?php echo op_sv_icon( 'back', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</button>
		<span class="sv-step-label" id="svStepLabel" aria-live="polite"></span>
		<span class="sv-gift-chip"><?php echo op_sv_icon( 'gift', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?> هديتك 75 جنيه</span>
	</div>
	<div class="sv-progress" role="progressbar" aria-label="تقدم الاستبيان" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="svProgressBar">
		<span class="sv-progress-fill" id="svProgressFill"></span>
	</div>
</div>

<main class="sv-main">
<form id="survey" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" novalidate>
	<input type="hidden" name="action" value="op_survey_submit">
	<?php wp_nonce_field( 'op_survey_submit', '_opnonce', false ); ?>
	<input type="hidden" name="_opts" value="">
	<p class="sv-hp" aria-hidden="true"><label>اترك هذا الحقل فارغًا<input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>

	<!-- ٠ — الهدية -->
	<section class="sv-screen is-active" data-step>
		<div class="sv-hero">
			<svg class="sv-route" viewBox="0 0 320 120" aria-hidden="true">
				<path d="M18 96 C 90 96, 96 28, 168 28 S 262 84, 302 60" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="1 10" stroke-linecap="round"/>
				<circle cx="18" cy="96" r="7" fill="#F9732F"/>
				<circle cx="168" cy="28" r="5" fill="currentColor" opacity=".55"/>
				<circle cx="302" cy="60" r="7" fill="#F9732F"/>
			</svg>
			<span class="sv-spark sv-spark--1"><?php echo op_sv_icon( 'sparkle', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<span class="sv-spark sv-spark--2"><?php echo op_sv_icon( 'sparkle', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<span class="sv-spark sv-spark--3"><?php echo op_sv_icon( 'sparkle', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<span class="sv-gift-art" aria-hidden="true"><?php echo op_sv_icon( 'gift', 44 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<span class="sv-pill">هدية حقيقية — مش نقاط ولا سحب</span>
			<div class="sv-voucher" role="img" aria-label="كود خصم بقيمة 75 جنيه">
				<div class="sv-voucher-main">
					<span class="sv-voucher-label">كود خصم بقيمة</span>
					<div class="sv-voucher-value"><b>75</b><span>جنيه</span></div>
				</div>
				<div class="sv-voucher-strip"><?php echo op_sv_icon( 'sparkle', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?> على أول طلب عند الإطلاق — محجوز باسمك</div>
			</div>
			<h1>جاوب على كام سؤال بسيط<br>والكود ده يبقى بتاعك</h1>
			<p class="sv-hero-lede">3 دقايق من وقتك مقابل 75 جنيه خصم حقيقي — سؤال في كل شاشة، من موبايلك على طول.</p>
			<div class="sv-promise">الكود بيتربط برقم موبايلك ومحفوظ عندنا لحد الإطلاق — وهتكون كمان من أوائل الناس اللي تجرب الخدمة.</div>
			<button type="button" class="sv-btn sv-btn--orange sv-next">
				ابدأ وفعّل هديتك
				<?php echo op_sv_icon( 'back', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</button>
			<p class="sv-hero-note">من غير ما نسألك عنوان بيتك — بيانات بسيطة وبس.</p>
		</div>
	</section>

	<!-- ١ — بياناتك -->
	<section class="sv-screen" data-step data-title="خلّينا نعرفك">
		<?php op_sv_step_head( 'user', 'خلّينا نعرفك', 'علشان نربط هديتك بمشاركتك ونبعتلك تفاصيل الإطلاق.' ); ?>
		<div class="sv-card">
			<label class="sv-field">
				<span class="sv-label">الاسم</span>
				<input required name="name" type="text" placeholder="اسمك" autocomplete="name">
				<span class="sv-error" data-error>اكتب اسمك من فضلك</span>
			</label>
			<label class="sv-field">
				<span class="sv-label">رقم الموبايل <b class="sv-req">مطلوب</b></span>
				<input required name="mobile" type="tel" inputmode="tel" dir="ltr" placeholder="01xxxxxxxxx" autocomplete="tel">
				<span class="sv-hint-s">الكود هيتربط بآخر ٤ أرقام من رقمك</span>
				<span class="sv-error" data-error>اكتب رقم موبايل صحيح — يبدأ بـ 010 أو 011 أو 012 أو 015 (11 رقم)</span>
			</label>
			<label class="sv-field">
				<span class="sv-label">البريد الإلكتروني <span class="sv-opt-tag">اختياري</span></span>
				<input name="email" type="email" dir="ltr" placeholder="name@example.com" autocomplete="email">
				<span class="sv-error" data-error>البريد الإلكتروني مش صحيح</span>
			</label>
		</div>
		<label class="sv-consent">
			<input required type="checkbox" name="consent" value="yes">
			<span class="sv-consent-box" aria-hidden="true"><?php echo op_sv_icon( 'check', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<span>أوافق على استخدام إجاباتي لأغراض دراسة السوق والتواصل معي بخصوص تجربة الإطلاق والعرض المذكور.</span>
		</label>
		<span class="sv-error" data-error-consent>من فضلك وافق قبل ما تكمل</span>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٢ — مكانك -->
	<section class="sv-screen" data-step data-title="إنت منين؟">
		<?php op_sv_step_head( 'pin', 'إنت منين في البحيرة؟', 'من غير عنوان البيت — المنطقة وبس.' ); ?>
		<div class="sv-card">
			<label class="sv-field">
				<span class="sv-label">المركز / المدينة</span>
				<span class="sv-select">
					<select required name="city">
						<option value="">اختر…</option>
						<option value="دمنهور">دمنهور</option>
						<option value="كفر الدوار">كفر الدوار</option>
						<option value="رشيد">رشيد</option>
						<option value="إدكو">إدكو</option>
						<option value="أبو المطامير">أبو المطامير</option>
						<option value="أبو حمص">أبو حمص</option>
						<option value="الدلنجات">الدلنجات</option>
						<option value="المحمودية">المحمودية</option>
						<option value="الرحمانية">الرحمانية</option>
						<option value="إيتاي البارود">إيتاي البارود</option>
						<option value="حوش عيسى">حوش عيسى</option>
						<option value="شبراخيت">شبراخيت</option>
						<option value="كوم حمادة">كوم حمادة</option>
						<option value="بدر">بدر</option>
						<option value="وادي النطرون">وادي النطرون</option>
					</select>
				</span>
				<span class="sv-error" data-error>اختر المركز أو المدينة</span>
			</label>
			<label class="sv-field">
				<span class="sv-label">القرية / العزبة / الحي</span>
				<input required name="area" type="text" placeholder="اكتب المنطقة بدقة">
				<span class="sv-error" data-error>اكتب منطقتك من فضلك</span>
			</label>
			<label class="sv-field">
				<span class="sv-label">أقرب مكان معروف <span class="sv-opt-tag">اختياري</span></span>
				<input name="landmark" type="text" placeholder="سوق، موقف، مدرسة، مسجد معروف…">
			</label>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٣ — مشتريات آخر ٧ أيام -->
	<section class="sv-screen" data-step data-title="مشترياتك">
		<?php op_sv_step_head( 'basket', 'خلال آخر 7 أيام، اشتريت إيه فعلًا؟', 'اختار كل اللي ينطبق.' ); ?>
		<div class="sv-opts sv-opts--grid">
			<?php
			$last7 = array(
				'بقالة وسوبر ماركت'    => 'basket',
				'خضار وفاكهة'          => 'apple',
				'خبز ومخبوزات'         => 'bread',
				'لحوم/دواجن/أسماك'     => 'fish',
				'ألبان وبيض'           => 'egg',
				'أدوية/صيدلية'         => 'pill',
				'مطاعم وأكل'           => 'plate',
				'مستلزمات منزلية'      => 'home',
				'مستلزمات أطفال'       => 'bottle',
				'منتجات زراعية/أعلاف'  => 'wheat',
				'أخرى'                 => 'dots',
			);
			foreach ( $last7 as $v => $ic ) :
				?>
				<label class="sv-opt sv-opt--icon"><input type="checkbox" name="last7[]" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-ic" aria-hidden="true"><?php echo op_sv_icon( $ic, 21 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span><span class="sv-opt-tick" aria-hidden="true"><?php echo op_sv_icon( 'check', 12 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٤ — آخر مصدر شراء -->
	<section class="sv-screen" data-step data-title="آخر مرة" data-auto>
		<?php op_sv_step_head( 'store', 'آخر مرة اشتريت احتياجات، جبتها إزاي؟' ); ?>
		<div class="sv-opts">
			<?php
			$sources = array( 'روحت محل قريب', 'روحت سوق محلي', 'روحت منطقة/مدينة تانية', 'طلبت من محل بالتليفون أو WhatsApp', 'طلبت من تطبيق أو موقع' );
			foreach ( $sources as $v ) :
				?>
				<label class="sv-opt"><input required type="radio" name="source" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<span class="sv-error" data-error-group>اختار إجابة من فضلك</span>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٥ — وقت الرحلة (يتخطى لو طلب أونلاين) -->
	<section class="sv-screen" data-step data-title="الرحلة" data-auto id="travelBlock">
		<?php op_sv_step_head( 'clock', 'الرحلة للمحل/السوق أخدت منك قد إيه تقريبًا؟' ); ?>
		<div class="sv-opts">
			<?php foreach ( array( 'أقل من 10 دقائق', '10–20 دقيقة', '21–40 دقيقة', 'أكثر من 40 دقيقة' ) as $v ) : ?>
				<label class="sv-opt"><input type="radio" name="travel_time" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٦ — مرات التوصيل آخر ٣٠ يوم -->
	<section class="sv-screen" data-step data-title="التوصيل" data-auto>
		<?php op_sv_step_head( 'box', 'خلال آخر 30 يوم، طلبت توصيل للبيت كام مرة؟' ); ?>
		<div class="sv-opts">
			<?php foreach ( array( 'ولا مرة', 'مرة', '2–3 مرات', '4–7 مرات', '8 مرات أو أكثر' ) as $v ) : ?>
				<label class="sv-opt"><input required type="radio" name="delivery30" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<span class="sv-error" data-error-group>اختار إجابة من فضلك</span>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٧ — تفاصيل آخر توصيل (يتخطى لو "ولا مرة") -->
	<section class="sv-screen" data-step data-title="آخر توصيل" id="deliveryDetails">
		<?php op_sv_step_head( 'scooter', 'آخر مرة طلبت توصيل…' ); ?>
		<div class="sv-card">
			<fieldset class="sv-sub">
				<legend class="sv-label">طلبت إزاي؟</legend>
				<div class="sv-chiprow">
					<?php foreach ( array( 'WhatsApp', 'مكالمة', 'تطبيق', 'موقع', 'مندوب/شخص معروف' ) as $v ) : ?>
						<label class="sv-chip"><input type="radio" name="delivery_channel" value="<?php echo esc_attr( $v ); ?>"><span><?php echo esc_html( $v ); ?></span></label>
					<?php endforeach; ?>
				</div>
			</fieldset>
			<label class="sv-field">
				<span class="sv-label">دفعت كام للتوصيل تقريبًا؟ <span class="sv-opt-tag">بالجنيه</span></span>
				<input name="actual_fee" type="number" inputmode="numeric" min="0" dir="ltr" placeholder="0">
			</label>
			<fieldset class="sv-sub">
				<legend class="sv-label">الطلب وصل بعد قد إيه؟</legend>
				<div class="sv-chiprow">
					<?php foreach ( array( 'أقل من 30 دقيقة', '30–60 دقيقة', '1–2 ساعة', 'أكثر من ساعتين', 'نفس اليوم' ) as $v ) : ?>
						<label class="sv-chip"><input type="radio" name="actual_delivery_time" value="<?php echo esc_attr( $v ); ?>"><span><?php echo esc_html( $v ); ?></span></label>
					<?php endforeach; ?>
				</div>
			</fieldset>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٨ — منتج مش لاقيه -->
	<section class="sv-screen" data-step data-title="منتج ناقص">
		<?php op_sv_step_head( 'search', 'خلال آخر 30 يوم، احتجت منتج ومكنتش عارف تلاقيه فين؟' ); ?>
		<div class="sv-opts">
			<label class="sv-opt"><input required type="radio" name="couldnt_find" value="yes_many"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text">نعم، أكثر من مرة</span></label>
			<label class="sv-opt"><input type="radio" name="couldnt_find" value="yes_once"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text">نعم، مرة</span></label>
			<label class="sv-opt"><input type="radio" name="couldnt_find" value="no"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text">لا</span></label>
		</div>
		<span class="sv-error" data-error-group>اختار إجابة من فضلك</span>
		<div id="missingBlock" class="sv-reveal" hidden>
			<div class="sv-card">
				<label class="sv-field">
					<span class="sv-label">إيه آخر منتج مكنتش قادر تلاقيه بسهولة؟</span>
					<input name="missing_product" type="text" placeholder="اسم المنتج">
				</label>
				<fieldset class="sv-sub">
					<legend class="sv-label">عملت إيه وقتها؟</legend>
					<div class="sv-chiprow">
						<?php foreach ( array( 'سألت أكتر من محل', 'روحت منطقة/مدينة تانية', 'طلبت من حد يجيبه', 'دورت أونلاين', 'اشتريت بديل', 'استنيت', 'مشتريتوش' ) as $v ) : ?>
							<label class="sv-chip"><input type="radio" name="missing_action" value="<?php echo esc_attr( $v ); ?>"><span><?php echo esc_html( $v ); ?></span></label>
						<?php endforeach; ?>
					</div>
				</fieldset>
			</div>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٩ — أكبر ٣ مشاكل -->
	<section class="sv-screen" data-step data-title="المشاكل">
		<?php op_sv_step_head( 'flash', 'إيه أكتر 3 مشاكل بتقابلك في شراء احتياجاتك؟', 'بحد أقصى 3 اختيارات — <span class="sv-count" id="painCount">0/3</span>' ); ?>
		<div class="sv-opts sv-opts--grid" id="painOpts">
			<?php
			$pains = array( 'المنتج مش متوفر', 'مش عارف المنتج موجود فين', 'المسافة بعيدة', 'مفيش توصيل', 'التوصيل بطيء', 'التوصيل غالي', 'الأسعار مش واضحة', 'الجودة مش مضمونة', 'اختيارات قليلة', 'صعوبة التواصل مع المحلات', 'مفيش مشكلة واضحة' );
			foreach ( $pains as $v ) :
				?>
				<label class="sv-opt"><input class="max3" type="checkbox" name="pain[]" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check" aria-hidden="true"><?php echo op_sv_icon( 'check', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ١٠ — أهم قيمة -->
	<section class="sv-screen" data-step data-title="الأهم ليك" data-auto>
		<?php op_sv_step_head( 'star', 'لو تقدر تعرف المنتجات المتاحة في المحلات القريبة وتطلبها للبيت — إيه أهم حاجة بالنسبة لك؟' ); ?>
		<div class="sv-opts">
			<?php foreach ( array( 'أعرف المنتج موجود فين', 'السعر يكون واضح', 'توصيل أسرع', 'تكلفة توصيل أقل', 'محلات موثوقة', 'منتجات أكتر', 'أطلب من أكتر من محل', 'سهولة الطلب' ) as $v ) : ?>
				<label class="sv-opt"><input type="radio" name="main_value" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ١١ — أقصى رسوم توصيل -->
	<section class="sv-screen" data-step data-title="رسوم التوصيل" data-auto>
		<?php op_sv_step_head( 'coins', 'بالنسبة لطلب عادي من محل قريب، أقصى مبلغ توصيل غالبًا تقبل تدفعه؟' ); ?>
		<div class="sv-opts">
			<?php foreach ( array( 'لن أدفع للتوصيل', 'حتى 10 جنيه', '11–20 جنيه', '21–30 جنيه', 'أكثر من 30 جنيه حسب الطلب' ) as $v ) : ?>
				<label class="sv-opt"><input type="radio" name="max_fee" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ١٢ — الدفع + كلمة أخيرة -->
	<section class="sv-screen" data-step data-title="آخر خطوة">
		<?php op_sv_step_head( 'card', 'آخر خطوة وهديتك جاهزة' ); ?>
		<div class="sv-card">
			<fieldset class="sv-sub">
				<legend class="sv-label">إيه طرق الدفع اللي بتستخدمها حاليًا؟</legend>
				<div class="sv-chiprow">
					<?php foreach ( array( 'كاش', 'InstaPay', 'محفظة موبايل', 'بطاقة بنكية', 'دفع إلكتروني آخر' ) as $v ) : ?>
						<label class="sv-chip"><input type="checkbox" name="payments[]" value="<?php echo esc_attr( $v ); ?>"><span><?php echo esc_html( $v ); ?></span></label>
					<?php endforeach; ?>
				</div>
			</fieldset>
			<label class="sv-field">
				<span class="sv-label">أسماء محلات أو أماكن بتشتري منها باستمرار <span class="sv-opt-tag">اختياري</span></span>
				<textarea name="stores" rows="3" placeholder="بيساعدنا نفهم السوق المحلي"></textarea>
			</label>
			<label class="sv-field">
				<span class="sv-label">لو تقدر تغير حاجة واحدة في التسوق أو التوصيل في منطقتك، هتغير إيه؟</span>
				<textarea name="one_change" rows="3"></textarea>
			</label>
		</div>
		<span class="sv-error" data-error-submit></span>
		<div class="sv-actions">
			<button type="submit" class="sv-btn sv-btn--orange" id="svSubmit"><?php echo op_sv_icon( 'gift', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?> إنهاء واستلام الكود</button>
		</div>
	</section>
</form>

<!-- الشكر -->
<section class="sv-screen" id="thanks">
	<div class="sv-thanks">
		<span class="sv-check" aria-hidden="true">
			<svg viewBox="0 0 52 52" width="64" height="64"><circle class="sv-check-circle" cx="26" cy="26" r="24" fill="none" stroke="#23765B" stroke-width="3"/><path class="sv-check-mark" d="M14 27l8 8 16-17" fill="none" stroke="#23765B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</span>
		<h1>شكرًا يا <span id="personName"></span> 🎉</h1>
		<p>إجابتك هتساعدنا نبني الخدمة بناءً على احتياجات الناس الفعلية في منطقتك.</p>
		<div class="sv-reward"><span class="sv-reward-ic" aria-hidden="true"><?php echo op_sv_icon( 'gift', 26 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>أنت من أوائل الناس اللي هيجربوا الخدمة عند الإطلاق.<br><b>هديتك اتحجزت باسمك:</b></div>
		<div class="sv-voucher sv-voucher--code" >
			<div class="sv-voucher-main">
				<span class="sv-voucher-label">كود خصم بقيمة <b>75 جنيه</b></span>
				<div class="sv-voucher-num" dir="ltr"><span id="promo">BHR75</span></div>
			</div>
			<div class="sv-voucher-strip">يُستخدم مرة واحدة على أول طلب — مربوط برقم موبايلك</div>
		</div>
		<button type="button" class="sv-btn sv-btn--ghost" id="copyCode">
			<?php echo op_sv_icon( 'copy', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<span data-copy-label>انسخ الكود</span>
		</button>
		<p class="sv-small">احتفظ بالكود ده — شروط الاستخدام وتاريخ الصلاحية سيتم تأكيدهما عند الإطلاق.</p>
	</div>
</section>

<footer class="sv-footer">
	<p>استبيان مستقل لأغراض دراسة السوق. بياناتك تُستخدم فقط للتواصل معك بخصوص تجربة الإطلاق والعرض المذكور، وقد نسجّل بيانات تقنية عن الاتصال لحماية العرض من إساءة الاستخدام.</p>
</footer>
</main>

<script>
window.opSurvey = { endpoint: <?php echo wp_json_encode( admin_url( 'admin-post.php' ) ); ?> };
</script>
<script src="<?php echo esc_url( $survey_js . '?v=' . $survey_ver ); ?>" defer></script>
</body>
</html>
