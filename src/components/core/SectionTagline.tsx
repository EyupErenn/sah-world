import { AppIcon } from "@/components/ui/AppIcon";
import { SECTION_TAGLINES, type PrimarySection } from "@/lib/sectionTaglines";

export default function SectionTagline({
  section,
  compact = false,
  inverse = false,
}: {
  section: PrimarySection;
  compact?: boolean;
  inverse?: boolean;
}) {
  const item = SECTION_TAGLINES[section];
  return (
    <blockquote
      className={`section-tagline ${compact ? "compact" : ""} ${inverse ? "inverse" : ""}`}
    >
      <span aria-hidden="true">
        <AppIcon name={item.kind === "ayet" ? "book-2" : "quote"} />
      </span>
      <div>
        <p>“{item.text}”</p>
        <a href={item.href} target="_blank" rel="noreferrer">
          {item.source}
          <AppIcon name="external-link" />
        </a>
      </div>
    </blockquote>
  );
}
