import styles from "./SectionSkeleton.module.css";

type Shape = "cards" | "editor" | "timer" | "scene" | "report";

/** Stable, route-shaped placeholders. No dependency on auth or remote data. */
export default function SectionSkeleton({ shape = "cards" }: { shape?: Shape }) {
  return (
    <div className={styles.root} role="status" aria-busy="true" aria-label="İçerik hazırlanıyor">
      <div aria-hidden="true">
        <div className={styles.heading} />
        <div className={styles.subtitle} />
        <div className={`${styles.body} ${styles[shape]}`}>
          {shape === "timer" ? <><div className={styles.dial} /><div className={styles.panel} /></> :
            shape === "editor" ? <><div className={styles.panel} /><div className={styles.editorPage} /></> :
            shape === "scene" ? <><div className={styles.scenePanel} /><div className={styles.panel} /></> :
            Array.from({ length: shape === "report" ? 6 : 3 }, (_, index) => <div key={index} className={styles.panel} />)}
        </div>
      </div>
      <span className={styles.label}>İçerik hazırlanıyor…</span>
    </div>
  );
}
