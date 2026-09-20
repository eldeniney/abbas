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
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>استبيان احتياجات التسوق والتوصيل — البحيرة</title>
<link rel="preload" href="<?php echo esc_url( $fonts_dir ); ?>/baloo2-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?php echo esc_url( $survey_css . '?v=' . $survey_ver ); ?>">
</head>
<body class="survey-body">

<div class="sv-top" id="svTop" hidden>
	<div class="sv-top-inner">
		<button type="button" class="sv-back" id="svBack" aria-label="رجوع">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
		</button>
		<span class="sv-step-label" id="svStepLabel" aria-live="polite"></span>
		<span class="sv-gift-chip">هديتك 75 جنيه</span>
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
			<span class="sv-pill">هدية خاصة ليك</span>
			<div class="sv-gift"><span class="sv-gift-num">75</span><span class="sv-gift-unit">جنيه</span></div>
			<h1>جاوب على كام سؤال بسيط<br>وخد 75 جنيه هدية</h1>
			<p class="sv-hero-lede">دقايق معدودة، سؤال في كل شاشة، من موبايلك على طول. رأيك بيساعدنا نفهم احتياجات منطقتك أحسن.</p>
			<div class="sv-promise">بعد ما تخلّص هتاخد كود خصم بقيمة <b>75 جنيه</b> تستخدمه في أول طلب عند الإطلاق — وهتكون من أوائل الناس اللي تجرب الخدمة.</div>
			<button type="button" class="sv-btn sv-btn--orange sv-next">
				ابدأ وخد هديتك
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
			</button>
			<p class="sv-hero-note">من غير ما نسألك عنوان بيتك — بيانات بسيطة وبس.</p>
		</div>
	</section>

	<!-- ١ — بياناتك -->
	<section class="sv-screen" data-step data-title="خلّينا نعرفك">
		<h2 class="sv-q-title">خلّينا نعرفك</h2>
		<p class="sv-q-hint">علشان نربط هديتك بمشاركتك ونبعتلك تفاصيل الإطلاق.</p>
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
				<span class="sv-error" data-error>اكتب رقم موبايل صحيح يبدأ بـ 01 (11 رقم)</span>
			</label>
			<label class="sv-field">
				<span class="sv-label">البريد الإلكتروني <span class="sv-opt-tag">اختياري</span></span>
				<input name="email" type="email" dir="ltr" placeholder="name@example.com" autocomplete="email">
				<span class="sv-error" data-error>البريد الإلكتروني مش صحيح</span>
			</label>
		</div>
		<label class="sv-consent">
			<input required type="checkbox" name="consent" value="yes">
			<span class="sv-consent-box" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
			<span>أوافق على استخدام إجاباتي لأغراض دراسة السوق والتواصل معي بخصوص تجربة الإطلاق والعرض المذكور.</span>
		</label>
		<span class="sv-error" data-error-consent>من فضلك وافق قبل ما تكمل</span>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٢ — مكانك -->
	<section class="sv-screen" data-step data-title="إنت منين؟">
		<h2 class="sv-q-title">إنت منين في البحيرة؟</h2>
		<p class="sv-q-hint">من غير عنوان البيت — المنطقة وبس.</p>
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
		<h2 class="sv-q-title">خلال آخر 7 أيام، اشتريت إيه فعلًا؟</h2>
		<p class="sv-q-hint">اختار كل اللي ينطبق.</p>
		<div class="sv-opts sv-opts--grid">
			<?php
			$last7 = array( 'بقالة وسوبر ماركت', 'خضار وفاكهة', 'خبز ومخبوزات', 'لحوم/دواجن/أسماك', 'ألبان وبيض', 'أدوية/صيدلية', 'مطاعم وأكل', 'مستلزمات منزلية', 'مستلزمات أطفال', 'منتجات زراعية/أعلاف', 'أخرى' );
			foreach ( $last7 as $v ) :
				?>
				<label class="sv-opt"><input type="checkbox" name="last7[]" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٤ — آخر مصدر شراء -->
	<section class="sv-screen" data-step data-title="آخر مرة" data-auto>
		<h2 class="sv-q-title">آخر مرة اشتريت احتياجات، جبتها إزاي؟</h2>
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
		<h2 class="sv-q-title">الرحلة للمحل/السوق أخدت منك قد إيه تقريبًا؟</h2>
		<div class="sv-opts">
			<?php foreach ( array( 'أقل من 10 دقائق', '10–20 دقيقة', '21–40 دقيقة', 'أكثر من 40 دقيقة' ) as $v ) : ?>
				<label class="sv-opt"><input type="radio" name="travel_time" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ٦ — مرات التوصيل آخر ٣٠ يوم -->
	<section class="sv-screen" data-step data-title="التوصيل" data-auto>
		<h2 class="sv-q-title">خلال آخر 30 يوم، طلبت توصيل للبيت كام مرة؟</h2>
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
		<h2 class="sv-q-title">آخر مرة طلبت توصيل…</h2>
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
		<h2 class="sv-q-title">خلال آخر 30 يوم، احتجت منتج ومكنتش عارف تلاقيه فين؟</h2>
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
		<h2 class="sv-q-title">إيه أكتر 3 مشاكل بتقابلك في شراء احتياجاتك؟</h2>
		<p class="sv-q-hint">بحد أقصى 3 اختيارات — <span class="sv-count" id="painCount">0/3</span></p>
		<div class="sv-opts sv-opts--grid" id="painOpts">
			<?php
			$pains = array( 'المنتج مش متوفر', 'مش عارف المنتج موجود فين', 'المسافة بعيدة', 'مفيش توصيل', 'التوصيل بطيء', 'التوصيل غالي', 'الأسعار مش واضحة', 'الجودة مش مضمونة', 'اختيارات قليلة', 'صعوبة التواصل مع المحلات', 'مفيش مشكلة واضحة' );
			foreach ( $pains as $v ) :
				?>
				<label class="sv-opt"><input class="max3" type="checkbox" name="pain[]" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ١٠ — أهم قيمة -->
	<section class="sv-screen" data-step data-title="الأهم ليك" data-auto>
		<h2 class="sv-q-title">لو تقدر تعرف المنتجات المتاحة في المحلات القريبة وتطلبها للبيت — إيه أهم حاجة بالنسبة لك؟</h2>
		<div class="sv-opts">
			<?php foreach ( array( 'أعرف المنتج موجود فين', 'السعر يكون واضح', 'توصيل أسرع', 'تكلفة توصيل أقل', 'محلات موثوقة', 'منتجات أكتر', 'أطلب من أكتر من محل', 'سهولة الطلب' ) as $v ) : ?>
				<label class="sv-opt"><input type="radio" name="main_value" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ١١ — أقصى رسوم توصيل -->
	<section class="sv-screen" data-step data-title="رسوم التوصيل" data-auto>
		<h2 class="sv-q-title">بالنسبة لطلب عادي من محل قريب، أقصى مبلغ توصيل غالبًا تقبل تدفعه؟</h2>
		<div class="sv-opts">
			<?php foreach ( array( 'لن أدفع للتوصيل', 'حتى 10 جنيه', '11–20 جنيه', '21–30 جنيه', 'أكثر من 30 جنيه حسب الطلب' ) as $v ) : ?>
				<label class="sv-opt"><input type="radio" name="max_fee" value="<?php echo esc_attr( $v ); ?>"><span class="sv-opt-check sv-opt-check--radio" aria-hidden="true"></span><span class="sv-opt-text"><?php echo esc_html( $v ); ?></span></label>
			<?php endforeach; ?>
		</div>
		<div class="sv-actions"><button type="button" class="sv-btn sv-btn--primary sv-next">التالي</button></div>
	</section>

	<!-- ١٢ — الدفع + كلمة أخيرة -->
	<section class="sv-screen" data-step data-title="آخر خطوة">
		<h2 class="sv-q-title">آخر خطوة وهديتك جاهزة 🎁</h2>
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
			<button type="submit" class="sv-btn sv-btn--orange" id="svSubmit">إنهاء واستلام الكود</button>
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
		<div class="sv-reward">أنت من أوائل الناس اللي هيجربوا الخدمة عند الإطلاق.<br><b>احتفظ بالكود ده لأول طلب:</b></div>
		<div class="sv-promo" dir="ltr"><span id="promo">BHR75</span></div>
		<button type="button" class="sv-btn sv-btn--ghost" id="copyCode">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
			<span data-copy-label>انسخ الكود</span>
		</button>
		<p class="sv-promo-value"><b>قيمة الكود: 75 جنيه</b></p>
		<p class="sv-small">يُستخدم مرة واحدة على أول طلب بعد الإطلاق. شروط الاستخدام وتاريخ الصلاحية سيتم تأكيدهما عند الإطلاق.</p>
	</div>
</section>

<footer class="sv-footer">
	<p>استبيان مستقل لأغراض دراسة السوق. بياناتك تُستخدم فقط للتواصل معك بخصوص تجربة الإطلاق والعرض المذكور.</p>
</footer>
</main>

<script>
window.opSurvey = { endpoint: <?php echo wp_json_encode( admin_url( 'admin-post.php' ) ); ?> };
</script>
<script src="<?php echo esc_url( $survey_js . '?v=' . $survey_ver ); ?>" defer></script>
</body>
</html>
