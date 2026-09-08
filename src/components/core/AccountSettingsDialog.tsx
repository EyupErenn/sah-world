"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/AppIcon";
import AvatarImage from "@/components/ui/AvatarImage";
import { BADGES, getLevelForXP } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useJourneyStore } from "@/store/useJourneyStore";
import type { ProfileRow } from "@/types/database";

type SettingsTab = "account" | "preferences" | "growth" | "privacy";
type ThemePreference = ProfileRow["theme_preference"];
type NotificationPreferences = ProfileRow["notification_preferences"];

const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: "account", label: "Hesap", icon: "user-circle" },
  { id: "preferences", label: "Tercihler", icon: "adjustments-horizontal" },
  { id: "growth", label: "Gelişimim", icon: "sprout" },
  { id: "privacy", label: "Gizlilik ve Veri", icon: "shield-lock" },
];

const notificationOptions: Array<{
  id: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: string;
}> = [
  { id: "focus", title: "Odaklanma hatırlatmaları", description: "Tamamlanan odak oturumlarında tarayıcı bildirimi al.", icon: "target-arrow" },
  { id: "prayer", title: "Namaz vakti hatırlatmaları", description: "Mescidim alanındaki seçili şehir için vakit yaklaşınca hatırlat.", icon: "building-mosque" },
  { id: "community", title: "Topluluk bildirimleri", description: "Grup hareketleri ve yeni mesajlar için uygulama içi bildirim al.", icon: "users-group" },
];

export default function AccountSettingsDialog({
  onClose,
  onThemeChange,
}: {
  onClose: () => void;
  onThemeChange: (theme: ThemePreference) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const patchProfile = useAuthStore((state) => state.patchProfile);
  const journey = useJourneyStore();
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const avatarUrl = profile?.avatar_url || dicebear(profile?.display_name || "Yolcu");
  const preferences = profile?.notification_preferences ?? { focus: true, prayer: false, community: true };
  const themePreference = profile?.theme_preference ?? "system";
  const { level, nextLevel, index } = getLevelForXP(journey.xp);
  const levelProgress = nextLevel ? Math.round(((journey.xp - level.xp) / (nextLevel.xp - level.xp)) * 100) : 100;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (cropSource) setCropSource(null);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cropSource, onClose]);

  useEffect(() => () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
  }, [cropSource]);

  const flash = (text: string, isError = false) => {
    if (isError) { setError(text); setMessage(""); }
    else { setMessage(text); setError(""); }
  };

  const saveName = async () => {
    const displayName = name.trim().slice(0, 60);
    if (!profile || displayName.length < 2) { flash("Görünen ad en az 2 karakter olmalı.", true); return; }
    const previousName = profile.display_name;
    patchProfile({ display_name: displayName });
    setEditingName(false);
    setSaving(true);
    const { error: updateError } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.id);
    setSaving(false);
    if (updateError) {
      patchProfile({ display_name: previousName });
      setName(previousName);
      setEditingName(true);
      flash("Adın kaydedilemedi. İnternet bağlantını kontrol edip yeniden dene.", true);
      return;
    }
    flash("Görünen adın güncellendi.");
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { flash("JPG, PNG veya WebP biçiminde bir görsel seçmelisin.", true); return; }
    if (file.size > 5 * 1024 * 1024) { flash("Görsel 5 MB’dan küçük olmalı.", true); return; }
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setCropSource(URL.createObjectURL(file));
    setUploadProgress(0);
    setError("");
  };

  const uploadAvatar = async () => {
    if (!cropSource || !croppedArea || !profile || !user) return;
    setSaving(true);
    setUploadProgress(12);
    setError("");
    try {
      const blob = await cropImage(cropSource, croppedArea);
      setUploadProgress(38);
      const path = `${user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("user-avatars").upload(path, blob, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      setUploadProgress(78);
      const { data } = supabase.storage.from("user-avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      if (profileError) throw profileError;
      patchProfile({ avatar_url: publicUrl });
      setUploadProgress(100);
      URL.revokeObjectURL(cropSource);
      setCropSource(null);
      flash("Profil fotoğrafın güvenle güncellendi.");
    } catch {
      setUploadProgress(0);
      flash("Fotoğraf yüklenemedi. Dosyanı ve bağlantını kontrol edip yeniden dene.", true);
    } finally { setSaving(false); }
  };

  const resetAvatarToFallback = async () => {
    if (!profile || !user) return;
    setSaving(true);
    const previous = profile.avatar_url;
    patchProfile({ avatar_url: null });
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    if (updateError) { patchProfile({ avatar_url: previous }); flash("Varsayılan avatar etkinleştirilemedi.", true); }
    else {
      await supabase.storage.from("user-avatars").remove([`${user.id}/avatar.webp`]);
      flash("Sana özel harf avatarı etkinleştirildi.");
    }
    setSaving(false);
  };

  const updateTheme = async (next: ThemePreference) => {
    if (!profile || next === themePreference) return;
    const previous = themePreference;
    patchProfile({ theme_preference: next });
    onThemeChange(next);
    const { error: updateError } = await supabase.from("profiles").update({ theme_preference: next }).eq("id", profile.id);
    if (updateError) { patchProfile({ theme_preference: previous }); onThemeChange(previous); flash("Tema tercihin kaydedilemedi.", true); }
    else flash("Tema tercihin cihazların arasında eşitlendi.");
  };

  const toggleNotification = async (key: keyof NotificationPreferences) => {
    if (!profile) return;
    const nextEnabled = !Boolean(preferences[key]);
    if ((key === "focus" || key === "prayer") && nextEnabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { flash("Tarayıcı bildirim izni verilmedi. Bu tercihi daha sonra yeniden açabilirsin.", true); return; }
    }
    const next = { ...preferences, [key]: nextEnabled };
    patchProfile({ notification_preferences: next });
    const { error: updateError } = await supabase.from("profiles").update({ notification_preferences: next }).eq("id", profile.id);
    if (updateError) { patchProfile({ notification_preferences: preferences }); flash("Bildirim tercihin kaydedilemedi.", true); return; }
    if (key === "prayer") window.localStorage.setItem("sah-prayer-notifications", nextEnabled ? "1" : "0");
    flash("Bildirim tercihin güncellendi.");
  };

  const exportData = () => {
    const payload = { exported_at: new Date().toISOString(), profile: profile ? { display_name: profile.display_name, email: user?.email, created_at: profile.created_at } : null, journey: journey.exportAll() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sah-verilerim-${new Date().toLocaleDateString("en-CA")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    flash("Veri arşivin hazırlandı.");
  };

  const signOut = async () => {
    setSaving(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const deleteAccount = async () => {
    if (confirmation !== "HESABIMI SIL") return;
    setSaving(true);
    const { error: deleteError } = await supabase.rpc("delete_my_account", { confirmation_text: confirmation });
    if (deleteError) { setSaving(false); flash("Hesap silinemedi. Görüş ve Öneri alanından destek isteyebilirsin.", true); return; }
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="account-settings account-center" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="account-center-header">
          <div><span className="eyebrow">PROFİL VE HESAP MERKEZİ</span><h2 id="settings-title">Sana ait alan</h2><p>Kimliğini, tercihlerini ve verilerini tek bir güvenli merkezden yönet.</p></div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Ayarları kapat"><AppIcon name="x" /></button>
        </header>

        <div className="profile-identity-card">
          <button className="avatar-editor" onClick={() => fileInputRef.current?.click()} aria-label="Profil fotoğrafını değiştir">
            <AvatarImage src={avatarUrl} alt={`${profile?.display_name || "Kullanıcı"} profil fotoğrafı`} size={112} priority />
            <span><AppIcon name="camera" /></span>
          </button>
          <div className="identity-copy">
            {editingName ? <div className="identity-name-editor"><label htmlFor="display-name">Görünen ad</label><input id="display-name" autoFocus value={name} minLength={2} maxLength={60} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void saveName()} /><div><button onClick={() => { setEditingName(false); setName(profile?.display_name ?? ""); }}>Vazgeç</button><button className="primary-button" disabled={saving} onClick={() => void saveName()}>Kaydet</button></div></div>
            : <><h3>{profile?.display_name || "Yolcu"}</h3><p>{user?.email || "E-posta bilgisi alınamadı"}</p><span>{level.icon} {level.name} · {journey.xp.toLocaleString("tr-TR")} XH</span></>}
          </div>
          {!editingName && <button className="identity-edit" onClick={() => setEditingName(true)}><AppIcon name="pencil" /> Düzenle</button>}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { acceptFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </div>

        <nav className="settings-tabs" aria-label="Hesap ayarları sekmeleri">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "active" : ""} aria-selected={activeTab === tab.id} role="tab" onClick={() => setActiveTab(tab.id)}><AppIcon name={tab.icon} /><span>{tab.label}</span></button>)}</nav>
        {(message || error) && <p className={`settings-message ${error ? "error" : ""}`} role="status"><AppIcon name={error ? "alert-circle" : "circle-check"} /> {error || message}</p>}

        <div className="settings-panel" role="tabpanel">
          {activeTab === "account" && <AccountTab onChoose={() => fileInputRef.current?.click()} onDrop={acceptFile} dragging={dragging} setDragging={setDragging} hasCustomAvatar={Boolean(profile?.avatar_url)} onFallback={() => void resetAvatarToFallback()} onSignOut={() => void signOut()} saving={saving} />}
          {activeTab === "preferences" && <PreferencesTab theme={themePreference} preferences={preferences} onTheme={(next) => void updateTheme(next)} onNotification={(key) => void toggleNotification(key)} />}
          {activeTab === "growth" && <GrowthTab levelName={level.name} levelIcon={level.icon} levelIndex={index} xp={journey.xp} progress={levelProgress} nextLevel={nextLevel?.name} badges={journey.badges} streak={journey.streak.current} />}
          {activeTab === "privacy" && <PrivacyTab onExport={exportData} deleteOpen={deleteOpen} setDeleteOpen={setDeleteOpen} confirmation={confirmation} setConfirmation={setConfirmation} saving={saving} onDelete={() => void deleteAccount()} />}
        </div>
        <footer><a href="/gizlilik">Gizlilik Politikası</a><a href="/kullanim-kosullari">Kullanım Koşulları</a></footer>

        {cropSource && <div className="avatar-crop-backdrop" role="presentation"><section className="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title"><header><div><span className="eyebrow">PROFİL FOTOĞRAFI</span><h3 id="crop-title">Kadrajını ayarla</h3></div><button onClick={() => setCropSource(null)} aria-label="Kırpmayı kapat"><AppIcon name="x" /></button></header><div className="avatar-crop-stage"><Cropper image={cropSource} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedArea(pixels)} /></div><label className="crop-zoom"><span>Yakınlaştır</span><input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>{uploadProgress > 0 && <div className="upload-progress" aria-label={`Yükleme yüzde ${uploadProgress}`}><span style={{ width: `${uploadProgress}%` }} /></div>}<div className="crop-actions"><button onClick={() => setCropSource(null)}>Vazgeç</button><button className="primary-button" disabled={saving || !croppedArea} onClick={() => void uploadAvatar()}><AppIcon name="upload" /> {saving ? "Yükleniyor…" : "Fotoğrafı kullan"}</button></div></section></div>}
      </section>
    </div>
  );
}

function AccountTab({ onChoose, onDrop, dragging, setDragging, hasCustomAvatar, onFallback, onSignOut, saving }: { onChoose: () => void; onDrop: (file?: File) => void; dragging: boolean; setDragging: (value: boolean) => void; hasCustomAvatar: boolean; onFallback: () => void; onSignOut: () => void; saving: boolean }) {
  return <div className="settings-section-stack"><section className="settings-section-heading"><span><AppIcon name="photo" /></span><div><h3>Profil fotoğrafı</h3><p>Toplulukta seni temsil eden, kare kırpılmış bir fotoğraf kullan.</p></div></section><button className={`avatar-dropzone ${dragging ? "dragging" : ""}`} onClick={onChoose} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onDrop(event.dataTransfer.files?.[0]); }}><AppIcon name="cloud-upload" /><span><strong>Fotoğraf seç veya buraya bırak</strong><small>JPG, PNG veya WebP · en fazla 5 MB</small></span><b>Dosya seç</b></button>{hasCustomAvatar && <button className="settings-text-action" disabled={saving} onClick={onFallback}><AppIcon name="refresh" /> Harf avatarına dön</button>}<div className="settings-trust"><AppIcon name="shield-lock" /><div><strong>Güvenli ve kişisel</strong><p>Yükleme yalnızca sana ait klasöre yapılır. Diğer kullanıcılar dosya ekleyemez, değiştiremez veya silemez.</p></div></div><section className="account-security-row"><span><AppIcon name="logout" /></span><div><strong>Bu cihazdaki oturumu kapat</strong><small>Diğer cihazlardaki oturumların açık kalır.</small></div><button disabled={saving} onClick={onSignOut}>Oturumu kapat</button></section></div>;
}

function PreferencesTab({ theme, preferences, onTheme, onNotification }: { theme: ThemePreference; preferences: NotificationPreferences; onTheme: (theme: ThemePreference) => void; onNotification: (key: keyof NotificationPreferences) => void }) {
  return <div className="settings-section-stack"><section><div className="settings-section-heading"><span><AppIcon name="palette" /></span><div><h3>Görünüm</h3><p>SAH’ın cihazlarında nasıl görüneceğini seç.</p></div></div><div className="theme-options">{([['light','sun','Aydınlık'],['dark','moon','Gece'],['system','device-laptop','Sistem']] as const).map(([id, icon, label]) => <button key={id} className={theme === id ? "active" : ""} onClick={() => onTheme(id)}><AppIcon name={icon} /><strong>{label}</strong>{theme === id && <AppIcon name="circle-check" />}</button>)}</div></section><section><div className="settings-section-heading"><span><AppIcon name="bell" /></span><div><h3>Bildirimler</h3><p>Yalnızca sana fayda sağlayan hatırlatmaları açık tut.</p></div></div><div className="preference-list">{notificationOptions.map((option) => <button key={option.id} className="preference-row" onClick={() => onNotification(option.id)} aria-pressed={Boolean(preferences[option.id])}><span className="preference-icon"><AppIcon name={option.icon} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span><i className={preferences[option.id] ? "on" : ""}><b /></i></button>)}</div></section></div>;
}

function GrowthTab({ levelName, levelIcon, levelIndex, xp, progress, nextLevel, badges, streak }: { levelName: string; levelIcon: string; levelIndex: number; xp: number; progress: number; nextLevel?: string; badges: string[]; streak: number }) {
  const earned = useMemo(() => BADGES.filter((badge) => badges.includes(badge.id)), [badges]);
  return <div className="settings-section-stack"><section className="growth-profile-hero"><span>{levelIcon}</span><div><small>SEVİYE {levelIndex + 1} / 10</small><h3>{levelName}</h3><p>{xp.toLocaleString("tr-TR")} XH · {nextLevel ? `${nextLevel} seviyesine %${progress}` : "En yüksek seviye"}</p><div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div></section><div className="growth-profile-stats"><article><AppIcon name="flame" /><strong>{streak}</strong><span>Günlük seri</span></article><article><AppIcon name="award" /><strong>{earned.length}</strong><span>Kazanılan rozet</span></article><article><AppIcon name="sparkles" /><strong>{xp.toLocaleString("tr-TR")}</strong><span>Toplam XH</span></article></div><section><div className="settings-section-heading"><span><AppIcon name="award" /></span><div><h3>Rozetlerin</h3><p>Uygulamadaki istikrarının küçük işaretleri.</p></div></div>{earned.length ? <div className="profile-badges">{earned.map((badge) => <article key={badge.id}><span>✦</span><div><strong>{badge.name}</strong><small>{badge.desc}</small></div></article>)}</div> : <div className="settings-empty"><AppIcon name="sparkles" /><span><strong>İlk rozetin yolculukta</strong><small>Düzenli kayıtların ilerledikçe burada görünecek.</small></span></div>}</section><p className="ethics-note"><AppIcon name="info-circle" /> XH ve rozetler yalnızca uygulamadaki katılımı gösterir; manevi değer veya üstünlük ölçüsü değildir.</p></div>;
}

function PrivacyTab({ onExport, deleteOpen, setDeleteOpen, confirmation, setConfirmation, saving, onDelete }: { onExport: () => void; deleteOpen: boolean; setDeleteOpen: (value: boolean) => void; confirmation: string; setConfirmation: (value: string) => void; saving: boolean; onDelete: () => void }) {
  return <div className="settings-section-stack"><div className="settings-trust"><AppIcon name="shield-lock" /><div><strong>Özel kayıtların sana aittir</strong><p>Günlük, şükür, hata ve manevi notların topluluk üyeleriyle paylaşılmaz. <a href="/gizlilik">Gizlilik Politikası</a> ayrıntıları açıklar.</p></div></div><section className="data-export-card"><span><AppIcon name="file-download" /></span><div><h3>Verilerimin bir kopyasını indir</h3><p>Kayıtlarını ve gelişim verilerini okunabilir JSON dosyası olarak cihazına kaydet.</p></div><button onClick={onExport}>Arşivi indir</button></section><section className="settings-danger"><div><strong>Hesabımı ve verilerimi sil</strong><p>Bu işlem günlüklerin, notların, oturumların ve profilin dâhil hesabına bağlı verileri kalıcı olarak kaldırır.</p></div>{!deleteOpen ? <button onClick={() => setDeleteOpen(true)}>Hesabımı sil</button> : <div className="delete-confirm"><label>Onaylamak için <b>HESABIMI SIL</b> yaz<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value.toLocaleUpperCase("tr-TR"))} maxLength={13} /></label><div><button onClick={() => { setDeleteOpen(false); setConfirmation(""); }}>Vazgeç</button><button disabled={saving || confirmation !== "HESABIMI SIL"} onClick={onDelete}>Kalıcı olarak sil</button></div></div>}</section></div>;
}

function dicebear(seed: string) { return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`; }

async function cropImage(source: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = source; });
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 512, 512);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("crop_failed")), "image/webp", 0.88));
}
