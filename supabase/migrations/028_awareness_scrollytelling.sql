BEGIN;

ALTER TABLE public.awareness_engagement_log
  DROP CONSTRAINT IF EXISTS awareness_engagement_log_event_type_check;

ALTER TABLE public.awareness_engagement_log
  ADD CONSTRAINT awareness_engagement_log_event_type_check
  CHECK (event_type IN ('section_read', 'action_opened', 'quiz_completed', 'narrative_completed', 'shared'));

UPDATE public.regional_awareness_content
SET
  section_title = 'Hukuki süreç olmadan özgürlükten alıkoyma',
  content_body = 'Dijital Hafıza, Çin makamlarının “Mesleki Eğitim ve Öğretim Merkezi” adını kullandığı kapalı yapıları; hukuki süreç olmadan özgürlüğün sistematik biçimde kaldırıldığı yerler olarak tarif ediyor. Kaynak, kapalılık nedeniyle kesin ve güncel sayılara ulaşmanın güç olduğunu özellikle belirtiyor.',
  source_name = 'Dijital Hafıza Doğu Türkistan · Toplama Kampları',
  source_url = 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/toplama-kamplari',
  action_cue = 'Doğrulanması güç sayıları tekrar etmek yerine kaynağın kesinlik sınırını koru.',
  updated_at = now()
WHERE geography = 'dogu_turkistan' AND display_order = 2;

UPDATE public.awareness_quiz_questions
SET
  question_text = 'Dijital Hafıza, kamp olarak tarif ettiği yapılarda hangi temel soruna dikkat çeker?',
  option_a = 'Hukuki süreç olmadan özgürlükten alıkoymaya',
  option_b = 'Ulaşım planlamasına',
  option_c = 'Turizm eğitimine',
  option_d = 'Spor organizasyonuna',
  correct_option = 'A',
  explanation_text = 'Kavram sayfası, hukuki süreç olmadan özgürlüğün sistematik biçimde kaldırıldığı iddiasını aktarır.',
  source_url = 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/toplama-kamplari',
  updated_at = now()
WHERE geography = 'dogu_turkistan' AND order_index = 3;

UPDATE public.awareness_quiz_questions
SET
  question_text = 'Dijital Hafıza, kamp verilerindeki kesinliğin neden sınırlı olduğunu belirtir?',
  option_a = 'Gizlilik ve kapalılık politikaları',
  option_b = 'Mevsim değişikliği',
  option_c = 'Harita ölçeği',
  option_d = 'Dilbilgisi farkı',
  correct_option = 'A',
  explanation_text = 'Kavram sayfası, gizlilik ve kapalılık nedeniyle net ve güncel bilgilere ulaşmanın güç olduğunu belirtir.',
  source_url = 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/toplama-kamplari',
  updated_at = now()
WHERE geography = 'dogu_turkistan' AND order_index = 4;

COMMENT ON TABLE public.awareness_engagement_log IS
  'Private per-user reading, full narrative, action, sharing and quiz engagement; own-row RLS remains enforced.';

COMMIT;
