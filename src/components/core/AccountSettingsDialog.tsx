"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function AccountSettingsDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const patchProfile = useAuthStore((state) => state.patchProfile);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  const save = async () => {
    const displayName = name.trim().slice(0, 60);
    if (!profile || displayName.length < 2) {
      setMessage("Görünen ad en az 2 karakter olmalı.");
      return;
    }
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      setMessage("Değişiklik kaydedilemedi. Lütfen yeniden dene.");
      return;
    }
    patchProfile({ display_name: displayName });
    setMessage("Profilin güncellendi.");
  };

  const deleteAccount = async () => {
    if (confirmation !== "HESABIMI SIL") return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("delete_my_account", {
      confirmation_text: confirmation,
    });
    if (error) {
      setSaving(false);
      setMessage(
        "Hesap silinemedi. Destek için Görüş ve Öneri alanına yazabilirsin.",
      );
      return;
    }
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  return (
    <div
      className="settings-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="account-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <span className="eyebrow">HESAP VE GİZLİLİK</span>
            <h2 id="settings-title">Ayarlar</h2>
            <p>Kişisel bilgilerini ve hesabını güvenle yönet.</p>
          </div>
          <button onClick={onClose} aria-label="Ayarları kapat">
            <AppIcon name="x" />
          </button>
        </header>
        <div className="settings-block">
          <span className="settings-symbol">
            <AppIcon name="user" />
          </span>
          <div>
            <label htmlFor="display-name">Görünen ad</label>
            <p>Topluluk alanlarında yalnızca bu ad görünür.</p>
            <div className="settings-inline">
              <input
                id="display-name"
                value={name}
                minLength={2}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
              />
              <button
                className="primary-button"
                disabled={saving || name.trim() === profile?.display_name}
                onClick={() => void save()}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
        <div className="settings-trust">
          <AppIcon name="shield-lock" />
          <div>
            <strong>Özel kayıtların sana aittir</strong>
            <p>
              Günlük, şükür, hata ve manevi notların topluluk üyeleriyle
              paylaşılmaz. Ayrıntılar için{" "}
              <a href="/gizlilik">Gizlilik Politikası</a>nı inceleyebilirsin.
            </p>
          </div>
        </div>
        {message && (
          <p className="settings-message" role="status">
            {message}
          </p>
        )}
        <div className="settings-danger">
          <div>
            <strong>Hesabımı ve verilerimi sil</strong>
            <p>
              Bu işlem günlüklerin, notların, oturumların ve profilin dâhil
              hesabına bağlı verileri kalıcı olarak kaldırır.
            </p>
          </div>
          {!deleteOpen ? (
            <button onClick={() => setDeleteOpen(true)}>Hesabımı sil</button>
          ) : (
            <div className="delete-confirm">
              <label>
                Onaylamak için <b>HESABIMI SIL</b> yaz
                <input
                  autoFocus
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(
                      event.target.value.toLocaleUpperCase("tr-TR"),
                    )
                  }
                  maxLength={13}
                />
              </label>
              <div>
                <button
                  onClick={() => {
                    setDeleteOpen(false);
                    setConfirmation("");
                  }}
                >
                  Vazgeç
                </button>
                <button
                  disabled={saving || confirmation !== "HESABIMI SIL"}
                  onClick={() => void deleteAccount()}
                >
                  Kalıcı olarak sil
                </button>
              </div>
            </div>
          )}
        </div>
        <footer>
          <a href="/gizlilik">Gizlilik Politikası</a>
          <a href="/kullanim-kosullari">Kullanım Koşulları</a>
        </footer>
      </section>
    </div>
  );
}
