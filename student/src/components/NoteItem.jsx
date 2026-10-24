import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconNotes, IconExternalLink } from "@tabler/icons-react";
import { Badge } from "@app/design-system.jsx";
import { docEmbedUrl } from "@app/features/notes/index.js";
import { timeAgo, shortDate } from "@app/format.js";

// A note as the student reads it (a MyNote from features/notes): the
// teacher's words, which class and lesson it's about, and when it was sent
// (`showTime={false}` under a heading that already says when). The lesson
// is a link once it's shared with the class. `isNew` marks one they
// haven't seen yet.
export default function NoteItem({ note, showClass = true, showLesson = true, showTime = true, isNew = false }) {
  const navigate = useNavigate();
  const [reading, setReading] = useState(false);
  const preview = docEmbedUrl(note.docUrl);
  const { lesson } = note;
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <IconNotes size={16} stroke={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        {note.html
          ? <div className="note-body text-sm leading-relaxed text-neutral-900 break-words" dangerouslySetInnerHTML={{ __html: note.html }} />
          : <p className="text-sm leading-relaxed text-neutral-900 break-words">{note.text}</p>}
        {note.docUrl && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              {preview && (
                <button type="button" onClick={() => setReading((r) => !r)} aria-expanded={reading}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  {reading ? "Hide the document" : "Read the document here"}
                </button>
              )}
              <a href={note.docUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Open in Google Docs <IconExternalLink size={15} stroke={1.75} />
              </a>
            </div>
            {reading && preview && <iframe title="Lesson notes — Google Doc" src={preview} className="h-[28rem] w-full rounded-lg border border-neutral-400 bg-surface" />}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
          {isNew && <Badge color="primary" className="!px-1.5 !py-0.5">New</Badge>}
          {showClass && note.className && <span className="font-medium text-neutral-700">{note.className}</span>}
          {showLesson && lesson && (note.open ? (
            <button type="button" onClick={() => navigate(`/classes/${note.classId}/lessons/${lesson.id}`)}
              className="font-semibold text-primary-600 hover:text-primary-700 text-left">
              Lesson {lesson.n}: {lesson.title}
            </button>
          ) : <span>Lesson {lesson.n}: {lesson.title}</span>)}
          {showTime && <span title={shortDate(note.sentAt)}>Sent {timeAgo(note.sentAt)}</span>}
        </div>
      </div>
    </div>
  );
}
