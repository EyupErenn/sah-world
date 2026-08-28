export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  vehicle_type: string;
  xp: number;
  streak_current: number;
  streak_last_date: string;
  badges: string[];
  total_zikir: number;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
};

export type GroupRow = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  group_code: string;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  role: 'owner' | 'member';
};

export type ChatMessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type XpEventRow = {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string;
  label: string;
  xp_amount: number;
  created_at: string;
};

export type FocusSessionRow = {
  id: string;
  user_id: string;
  task_label: string;
  timer_type: 'countdown' | 'stopwatch';
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  started_at: string;
  ended_at: string;
  completed: boolean;
  linked_journal_entry_id: string | null;
  xp_awarded: number;
  created_at: string;
};

export type GeographyRow = 'filistin' | 'dogu_turkistan';
export type RegionalAwarenessContentRow = {
  id: string;
  geography: GeographyRow;
  section: 'history' | 'displacement' | 'today' | 'detention' | 'culture' | 'solidarity';
  title: string;
  body: string;
  source_label: string;
  source_url: string;
  order_index: number;
  section_title: string;
  content_body: string;
  source_name: string;
  display_order: number;
  action_cue: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
export type AwarenessQuizQuestionRow = {
  id: string;
  geography: GeographyRow;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation_text: string;
  source_url: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};
export type UserQuizAttemptRow = {
  id: string;
  user_id: string;
  geography: GeographyRow;
  score: number;
  xh_awarded: number;
  completed_at: string;
};

export type AwarenessEngagementRow = {
  id: string;
  user_id: string;
  geography: GeographyRow;
  content_id: string;
  event_type: 'section_read' | 'action_opened' | 'quiz_completed';
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type ProfessionTrackRow = {
  id: string;
  profession_name: string;
  icon: string;
  description: string;
  color_accent: string;
  created_at: string;
  updated_at: string;
};

export type ProfessionLessonRow = {
  id: string;
  track_id: string;
  title: string;
  order_index: number;
  duration_estimate_minutes: number;
  content_body: Json;
  source_references: Json;
  xp_reward: number;
  created_at: string;
  updated_at: string;
};

export type UserProfessionTrackRow = {
  id: string;
  user_id: string;
  track_id: string;
  followed_at: string;
};

export type UserLessonProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
  reflection_note: string | null;
};

export type AsmaUlHusnaRow = {
  order_number: number;
  arabic_text: string;
  transliteration_turkish: string;
  meaning_turkish: string;
  brief_reflection: string;
};

export type UserAsmaReflectionRow = {
  id: string;
  user_id: string;
  asma_order_number: number;
  is_favorite: boolean;
  reflection_note: string;
  created_at: string;
  updated_at: string;
};

export type DuaLibraryRow = {
  id: string;
  category: 'quran' | 'hadith' | 'companions';
  occasion: string;
  title: string;
  arabic_text: string;
  turkish_meaning: string;
  source_citation: string;
  source_url: string;
  context_note: string;
};

export type JournalSpiritualLinkRow = {
  id: string;
  user_id: string;
  journal_entry_id: string;
  entry_date: string;
  entry_kind: 'asma' | 'dua';
  reference_id: string;
  display_label: string;
  reflection_note: string | null;
  xp_awarded: number;
  created_at: string;
};

export type IntegratedActivityRow = {
  id: string;
  category: string;
  label: string;
  detail: string;
  xp_amount: number;
  occurred_at: string;
  source_view: string;
};

export type FeedbackType = 'suggestion' | 'bug' | 'usability' | 'content' | 'performance' | 'other';
export type FeedbackStatus = 'received' | 'reviewing' | 'planned' | 'completed' | 'closed';
export type FeedbackRow = {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  message: string;
  rating: number | null;
  page_path: string;
  status: FeedbackStatus;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminFeedbackRow = Omit<FeedbackRow, 'reviewed_by'> & {
  display_name: string;
  avatar_url: string | null;
  total_count: number;
};

export interface Database {
  public: {
    Tables: {
      profiles: RowTable<ProfileRow>;
      journal_entries: RowTable<{ id: string; user_id: string; date: string; mood: number | null; energy: number | null; stress: number | null; sleep: number | null; content: string; moments: string[]; self_note: string; tags: string[]; created_at: string; updated_at: string }>;
      quran_notes: RowTable<{ id: string; user_id: string; date: string; sure: string; ayet: string; tefsir: string; ders: string; created_at: string }>;
      hadis_notes: RowTable<{ id: string; user_id: string; date: string; metin: string; kaynak: string; konu: string; uygulama: string; created_at: string }>;
      lesson_entries: RowTable<{ id: string; user_id: string; date: string; title: string; wrong: string; learned: string; severity: number | null; created_at: string }>;
      sukur_entries: RowTable<{ id: string; user_id: string; date: string; text: string; nimet1: string; nimet2: string; nimet3: string; created_at: string }>;
      eisenhower_tasks: RowTable<{ id: string; user_id: string; quadrant: 'q1' | 'q2' | 'q3' | 'q4'; text: string; done: boolean; completed_at: string | null; created_at: string }>;
      tespih_log: RowTable<{ id: string; user_id: string; date: string; count: number }>;
      friendships: RowTable<{ id: string; user_id: string; friend_id: string; status: 'pending' | 'accepted'; created_at: string }>;
      chat_messages: RowTable<ChatMessageRow>;
      groups: RowTable<GroupRow>;
      group_members: RowTable<GroupMemberRow>;
      xp_events: RowTable<XpEventRow>;
      focus_sessions: RowTable<FocusSessionRow>;
      feedback: RowTable<FeedbackRow>;
      regional_awareness_content: RowTable<RegionalAwarenessContentRow>;
      awareness_quiz_questions: RowTable<AwarenessQuizQuestionRow>;
      user_quiz_attempts: RowTable<UserQuizAttemptRow>;
      awareness_engagement_log: RowTable<AwarenessEngagementRow>;
      profession_tracks: RowTable<ProfessionTrackRow>;
      profession_lessons: RowTable<ProfessionLessonRow>;
      user_profession_tracks: RowTable<UserProfessionTrackRow>;
      user_lesson_progress: RowTable<UserLessonProgressRow>;
      asma_ul_husna: RowTable<AsmaUlHusnaRow>;
      user_asma_reflections: RowTable<UserAsmaReflectionRow>;
      dua_library: RowTable<DuaLibraryRow>;
      user_dua_favorites: RowTable<{ id: string; user_id: string; dua_id: string; created_at: string }>;
      journal_spiritual_links: RowTable<JournalSpiritualLinkRow>;
    };
    Views: {
      public_profile_summary: { Row: Pick<ProfileRow, 'id' | 'display_name' | 'avatar_url' | 'xp' | 'streak_current' | 'badges'>; Relationships: [] };
    };
    Functions: {
      create_group: { Args: { group_name: string; group_description?: string }; Returns: GroupRow };
      preview_group_by_code: { Args: { lookup_code: string }; Returns: Array<Pick<GroupRow, 'id' | 'name' | 'description' | 'group_code' | 'member_count'>> };
      join_group_by_code: { Args: { join_code: string }; Returns: string };
      get_my_groups: { Args: Record<string, never>; Returns: GroupRow[] };
      get_group_roster: { Args: { target_group_id: string }; Returns: Array<{ user_id: string; display_name: string; avatar_url: string | null; xp: number; streak_current: number; badges: string[]; role: 'owner' | 'member'; joined_at: string }> };
      leave_group: { Args: { target_group_id: string }; Returns: boolean };
      delete_group: { Args: { target_group_id: string }; Returns: boolean };
      rotate_group_code: { Args: { target_group_id: string }; Returns: string };
      send_group_message: { Args: { target_group_id: string; message_content: string }; Returns: ChatMessageRow };
      get_friends_with_last_message: { Args: { requesting_user: string }; Returns: Array<{ friend_id: string; display_name: string; avatar_url: string | null; xp: number; streak_current: number; friendship_id: string; last_message: string | null; last_message_at: string | null; unread_count: number }> };
      search_users_by_name: { Args: { search_term: string; requesting_user: string }; Returns: Array<{ id: string; display_name: string; avatar_url: string | null; xp: number; streak_current: number }> };
      is_app_admin: { Args: Record<string, never>; Returns: boolean };
      ensure_my_profile: { Args: Record<string, never>; Returns: ProfileRow };
      submit_feedback: { Args: { feedback_type: FeedbackType; feedback_title: string; feedback_message: string; feedback_rating?: number | null; feedback_page_path?: string }; Returns: string };
      admin_feedback_stats: { Args: Record<string, never>; Returns: Array<{ total_count: number; received_count: number; reviewing_count: number; planned_count: number; completed_count: number; average_rating: number | null }> };
      admin_list_feedback: { Args: { filter_status?: string | null; filter_type?: string | null; filter_rating?: number | null; search_text?: string | null; sort_order?: string; page_number?: number; page_size?: number; include_archived?: boolean; filter_from?: string | null; filter_to?: string | null }; Returns: AdminFeedbackRow[] };
      admin_update_feedback: { Args: { target_id: string; next_status: FeedbackStatus; response_text?: string | null; archive_item?: boolean }; Returns: undefined };
      complete_profession_lesson: { Args: { target_lesson_id: string; reflection_text?: string | null }; Returns: Array<{ awarded: boolean; xp_awarded: number; track_completed: boolean }> };
      log_spiritual_to_journal: { Args: { target_kind: 'asma' | 'dua'; target_reference_id: string; reflection_text?: string | null }; Returns: Array<{ journal_entry_id: string; journal_content: string; xp_awarded: number; daily_xp_count: number }> };
      get_my_activity_log: { Args: { from_date?: string | null; to_date?: string | null }; Returns: IntegratedActivityRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
