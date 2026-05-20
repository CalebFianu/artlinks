import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LinkRow from './LinkRow';

export default function SortableLinkRow({ link, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : 'auto',
      }}
    >
      <LinkRow {...props} link={link} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
