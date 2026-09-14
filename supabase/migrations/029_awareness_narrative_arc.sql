BEGIN;

ALTER TABLE public.regional_awareness_content
  DROP CONSTRAINT IF EXISTS regional_awareness_content_section_check;

ALTER TABLE public.regional_awareness_content
  ADD CONSTRAINT regional_awareness_content_section_check
  CHECK (section IN ('history', 'displacement', 'today', 'human', 'detention', 'culture', 'solidarity'));

UPDATE public.regional_awareness_content
SET display_order = CASE
      WHEN display_order = 2 THEN 4
      WHEN display_order = 3 THEN 2
      WHEN display_order = 4 THEN 3
      ELSE display_order
    END,
    section = CASE WHEN display_order = 2 THEN 'human' ELSE section END,
    updated_at = now()
WHERE geography = 'filistin' AND display_order IN (2, 3, 4);

UPDATE public.regional_awareness_content
SET section = 'today',
    title = 'Bugünün kapalı gerçeği',
    section_title = 'Bugünün kapalı gerçeği',
    updated_at = now()
WHERE geography = 'dogu_turkistan' AND display_order = 2;

UPDATE public.regional_awareness_content
SET section = 'human',
    title = 'Bir hayatın geride bıraktıkları',
    body = 'Dijital Hafıza’daki 7 Mayıs 2020 tarihli söyleşi, güvenlik nedeniyle tam adı ve yaşadığı şehir paylaşılmayan bir Uygur Türkünün hikâyesini aktarıyor. Kaynağın editoryal girişine göre kendisi, işini ve yakınlarını geride bırakarak eşi ve iki çocuğuyla yurt dışına çıkmak zorunda kaldı. Bu, büyük başlıkların ardındaki kayıp, aile ve belirsizlik boyutunu görünür kılan kişisel bir tanıklıktır.',
    content_body = 'Dijital Hafıza’daki 7 Mayıs 2020 tarihli söyleşi, güvenlik nedeniyle tam adı ve yaşadığı şehir paylaşılmayan bir Uygur Türkünün hikâyesini aktarıyor. Kaynağın editoryal girişine göre kendisi, işini ve yakınlarını geride bırakarak eşi ve iki çocuğuyla yurt dışına çıkmak zorunda kaldı. Bu, büyük başlıkların ardındaki kayıp, aile ve belirsizlik boyutunu görünür kılan kişisel bir tanıklıktır.',
    source_label = 'Dijital Hafıza Doğu Türkistan · Bir Doğu Türkistanlının Yaşadıkları',
    source_name = 'Dijital Hafıza Doğu Türkistan · Bir Doğu Türkistanlının Yaşadıkları',
    source_url = 'https://doguturkistan.dijitalhafiza.com/kose-yazilari/bir-dogu-turkistanlinin-yasadiklari',
    action_cue = 'Tanıklığı sahibine atfederek oku; kişinin güvenlik için saklı tutulan kimliğine ve mahremiyetine saygı göster.',
    updated_at = now()
WHERE geography = 'dogu_turkistan' AND display_order = 3;

UPDATE public.regional_awareness_content
SET section = 'solidarity',
    title = 'Dili yaşatmak, hafızayı geleceğe taşımak',
    body = 'Dijital Hafıza’nın biyografi sayfası, dilbilimci ve şair Abduweli Ayup’u Uygurca dil okulları kuran ve dil ile kültürün kuşaklar arası aktarım hakkını savunan bir eğitimci olarak tanıtıyor. Kültürel sebat burada yalnızca geçmişi hatırlamak değil; dili öğreterek geleceğe taşıyan somut bir emek olarak görünür oluyor.',
    content_body = 'Dijital Hafıza’nın biyografi sayfası, dilbilimci ve şair Abduweli Ayup’u Uygurca dil okulları kuran ve dil ile kültürün kuşaklar arası aktarım hakkını savunan bir eğitimci olarak tanıtıyor. Kültürel sebat burada yalnızca geçmişi hatırlamak değil; dili öğreterek geleceğe taşıyan somut bir emek olarak görünür oluyor.',
    source_label = 'Dijital Hafıza Doğu Türkistan · Abduweli Ayup biyografisi',
    source_name = 'Dijital Hafıza Doğu Türkistan · Abduweli Ayup biyografisi',
    source_url = 'https://doguturkistan.dijitalhafiza.com/biyografiler/abdulweli-ayup',
    action_cue = 'Bir halkı yalnızca maruz kaldığı baskıyla değil, dilini ve kültürünü yaşatma iradesiyle de tanı.',
    updated_at = now()
WHERE geography = 'dogu_turkistan' AND display_order = 5;

UPDATE public.regional_awareness_content
SET section = 'solidarity',
    title = 'Belgelemeden sorumluluğa',
    section_title = 'Belgelemeden sorumluluğa',
    updated_at = now()
WHERE geography = 'dogu_turkistan' AND display_order = 6;

COMMIT;
