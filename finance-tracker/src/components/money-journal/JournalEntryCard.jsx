import { format, parseISO } from 'date-fns'
import { BookOpen, Pencil, Sparkles, Trash2 } from 'lucide-react'

function JournalEntryCard({ entry, expanded, onDelete, onEdit, onToggle }) {
  const excerpt = entry.reflection || entry.financialWin || entry.lesson

  return (
    <article className={`journal-entry-card${expanded ? ' is-expanded' : ''}`}>
      <div className="journal-entry-date-mark" aria-hidden="true">
        <span>{format(parseISO(entry.entryDate), 'MMM')}</span>
        <strong>{format(parseISO(entry.entryDate), 'd')}</strong>
      </div>
      <div className="journal-entry-main">
        <div className="journal-entry-topline">
          <div className="journal-entry-heading">
            <p>{format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')}</p>
            <h3>{entry.title}</h3>
          </div>
          <div className="journal-entry-actions">
            <button
              aria-label={`Edit ${entry.title}`}
              className="journal-icon-button"
              onClick={() => onEdit(entry)}
              type="button"
            >
              <Pencil aria-hidden="true" size={15} />
            </button>
            <button
              aria-label={`Delete ${entry.title}`}
              className="journal-icon-button journal-delete-button"
              onClick={() => onDelete(entry)}
              type="button"
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          </div>
        </div>
        <p className="journal-entry-excerpt">{excerpt}</p>
        {entry.tags.length > 0 && (
          <div aria-label="Entry tags" className="journal-entry-tags">
            {entry.tags.map((tag) => (
              <span className="journal-tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <button
          aria-expanded={expanded}
          className="journal-entry-toggle"
          onClick={() => onToggle(entry.id)}
          type="button"
        >
          <BookOpen aria-hidden="true" size={14} />
          {expanded ? 'Close reflection' : 'Read reflection'}
        </button>
        {expanded && (
          <div className="journal-entry-details">
            {entry.reflection && (
              <section>
                <h4>My reflection</h4>
                <p>{entry.reflection}</p>
              </section>
            )}
            {entry.financialWin && (
              <section className="journal-detail-win">
                <h4><Sparkles aria-hidden="true" size={14} /> A financial win</h4>
                <p>{entry.financialWin}</p>
              </section>
            )}
            {entry.lesson && (
              <section className="journal-detail-lesson">
                <h4>Something I learned</h4>
                <p>{entry.lesson}</p>
              </section>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default JournalEntryCard
