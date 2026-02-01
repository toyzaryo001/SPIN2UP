
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableRow({ children, ...props }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props['data-row-key'] });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        position: isDragging ? 'relative' as 'relative' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} {...props}>
            {/* We pass attributes and listeners to the handle manually if we want drag handle */}
            {/* But here we wrap the whole row via context, logic handled in parent */}
            {children(attributes, listeners)}
        </tr>
    );
}
