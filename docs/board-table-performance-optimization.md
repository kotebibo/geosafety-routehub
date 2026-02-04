# Performance Optimization for Large Virtualized Tables with Drag-and-Drop

> Research document for optimizing MondayBoardTable component performance

Your current approach of progressive loading + CSS content-visibility is fundamentally flawed for 1,000-2,000+ interactive rows. **True DOM virtualization is mandatory**—Monday.com's engineering team spent years arriving at this conclusion after exhausting alternatives. Here's the complete technical breakdown with specific solutions for your stack.

## Your Current Problems Diagnosed

**Problem 1: Progressive loading instead of virtualization** creates an ever-growing DOM. Every loaded row persists, triggering re-renders and accumulating memory. With 2,000 rows × 20 columns, you're managing **40,000+ DOM nodes** when virtualization would maintain only **~200-400 nodes** (visible window + overscan buffer).

**Problem 2: Content-visibility is cargo cult for this use case.** While it provides a legitimate 7x improvement for chunked static content (Google's web.dev blog went from 232ms to 30ms), it offers only **15-45% gains** for interactive tables and critically **does not reduce DOM node count or memory footprint**. Your React reconciliation still processes every row; browser skip painting off-screen elements but everything remains in memory. For 1,000+ interactive rows, this is the wrong tool.

**Problem 3: Grouping 1,000+ items blocks UI** because JavaScript's main thread handles both the expensive grouping computation and UI updates. The solution requires either concurrent rendering features or web workers—your current synchronous approach guarantees jank.

## Monday.com's Actual Implementation Reveals the Path Forward

Monday.com's engineering team published detailed technical posts documenting their evolution. Their boards handle **2,000+ items with 50+ columns, yielding 100,000+ cells and 500,000+ React components**.

Their architecture evolved through three generations:

**Generation 1: react-window** (standard virtualization). They abandoned this due to customization limitations.

**Generation 2: Custom windowing** with traditional mount/unmount cycles. Expensive for complex cells connected to Redux.

**Generation 3: Component recycling** — the key insight. Instead of destroying and creating DOM elements during scroll, they **reuse the same components by changing their props**:

```tsx
// Monday.com's recycling pattern - reuse elements, change keys
cloneElement(element, { key: row.renderKey, ...row.elementProps })
```

This triggers `componentDidUpdate` instead of unmount/mount cycles, dramatically reducing DOM manipulation overhead.

**Their three-mode cell rendering system** progressively enhances cells based on available frame budget:

| Mode | Render Time | Use Case |
|------|-------------|----------|
| Placeholder | Minimal | Shows item name only when system is stressed |
| Light | 2x faster than Full | During active scrolling—visually ready but non-interactive |
| Full | Baseline | After scrolling stops—fully interactive |

**The Canvas breakthrough**: Even with these optimizations, Monday.com discovered that **CSS "Recalculate Style" operations** were the ultimate bottleneck—not React. Their solution: render cell placeholders using Canvas API during scroll, which skips the browser's Style and Layout phases entirely. DOM renders only after scrolling stops.

```tsx
// Monday.com's hybrid Canvas/DOM approach
// Canvas draws during scroll (skips Style → Layout → Paint)
ctx.fillStyle = backgroundColor;
ctx.fillRect(cellLeft, cellTop, cellWidth, cellHeight);
ctx.fillText(label, cellLeft + cellWidth / 2, cellTop + cellHeight / 2);

// DOM renders after scroll stops (debounced by frame count)
// When DOM cell is ready, canvas stops drawing that specific cell
```

**Key takeaway**: For your scale (1,000-2,000 rows), you likely don't need Canvas. But you absolutely need true virtualization with component recycling, and potentially progressive cell rendering modes.

## TanStack Virtual + dnd-kit Integration Patterns

The critical challenge combining virtualization with drag-and-drop is a **transform conflict**: virtualization positions rows via `translateY`, while dnd-kit uses `transform` for drag animations. Both fight for the same CSS property.

**The working solution uses `top` positioning for virtualization, reserving `transform` for dnd-kit**:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSortable, CSS } from '@dnd-kit/sortable';
import { DndContext, closestCenter, useSensor, MouseSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

const DraggableVirtualizedRow = ({ row, virtualRow }) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.id,
  });

  // CRITICAL: Use `top` for virtual positioning, `transform` for dnd-kit
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform), // dnd-kit controls this
    transition,
    top: virtualRow.start,  // Virtual positioning via top instead of transform
    position: 'absolute',
    width: '100%',
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <tr ref={setNodeRef} style={style} data-index={virtualRow.index}>
      {row.cells.map(cell => <td key={cell.id}>{cell.value}</td>)}
    </tr>
  );
};

function VirtualizedDndTable({ data, setData }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const dataIds = useMemo(() => data.map(d => d.id), [data]);

  const sensors = useSensors(useSensor(MouseSensor));

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 42,
    overscan: 5,  // Minimum 5 for smooth scrolling
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setData(prev => {
        const oldIndex = prev.findIndex(d => d.id === active.id);
        const newIndex = prev.findIndex(d => d.id === over?.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
        <table style={{ display: 'grid' }}>
          <tbody style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            display: 'grid'
          }}>
            <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                <DraggableVirtualizedRow
                  key={data[virtualRow.index].id}
                  row={data[virtualRow.index]}
                  virtualRow={virtualRow}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}
```

**Known limitations with dnd-kit + virtualization**:
- Auto-scroll at viewport boundaries during drag doesn't work reliably—may require custom implementation
- Dragged items can disappear if dragged outside visible range—consider keeping the active dragged item in DOM regardless of viewport
- Use `overscan: 5` minimum to ensure smooth item appearance during drag

## Sticky Columns Require Separation from the Virtualizer

Attempting to use CSS `position: sticky` on columns inside a virtualized container creates positioning conflicts. **The recommended pattern is rendering sticky columns outside the virtualized area entirely**:

```tsx
function TableWithStickyColumns({ data, stickyColumns, scrollableColumns }) {
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div style={{ display: 'flex' }}>
      {/* Sticky columns rendered OUTSIDE virtualizer */}
      <div style={{ position: 'sticky', left: 0, zIndex: 2, background: '#fff' }}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{ position: 'absolute', top: virtualRow.start, height: virtualRow.size }}
            >
              {stickyColumns.map(col => (
                <div key={col.id}>{data[virtualRow.index][col.accessorKey]}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable columns with horizontal overflow */}
      <div ref={parentRef} style={{ flex: 1, overflow: 'auto', height: '600px' }}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{ position: 'absolute', top: virtualRow.start, display: 'flex' }}
            >
              {scrollableColumns.map(col => (
                <div key={col.id} style={{ width: col.width }}>
                  {data[virtualRow.index][col.accessorKey]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Grouping Operations Require Off-Main-Thread Processing

Your UI blocking during grouping of 1,000+ items has two solutions: React 18 concurrent features for moderate loads, or web workers for heavy operations.

**Solution 1: useTransition for immediate feedback** (best for operations under ~100ms)

```tsx
function GroupableTable({ items }) {
  const [groupField, setGroupField] = useState<string | null>(null);
  const [groupedData, setGroupedData] = useState(items);
  const [isPending, startTransition] = useTransition();

  const handleGroupChange = (field: string) => {
    setGroupField(field);  // Immediate UI update

    startTransition(() => {
      // Heavy computation marked as non-urgent
      const grouped = groupItemsByField(items, field);
      setGroupedData(grouped);
    });
  };

  return (
    <>
      <GroupSelector onChange={handleGroupChange} />
      {isPending && <LoadingOverlay />}
      <VirtualizedTable data={groupedData} />
    </>
  );
}
```

**Solution 2: Web workers for heavy transformations** (best for operations over ~50ms)

```tsx
// workers/dataProcessor.worker.ts
import { expose } from 'comlink';

const api = {
  groupItems(items: Item[], field: string): GroupedData {
    const result: Record<string, Item[]> = {};
    for (const item of items) {
      const key = item[field] ?? 'Ungrouped';
      (result[key] ??= []).push(item);
    }
    return result;
  },

  sortItems(items: Item[], field: string, direction: 'asc' | 'desc'): Item[] {
    return [...items].sort((a, b) => {
      const cmp = a[field] > b[field] ? 1 : -1;
      return direction === 'asc' ? cmp : -cmp;
    });
  }
};

expose(api);

// hooks/useDataProcessor.ts
'use client';
import { useEffect, useRef } from 'react';
import { wrap, Remote } from 'comlink';

export function useDataProcessor<T>() {
  const workerRef = useRef<Remote<T> | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/dataProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = wrap<T>(worker);
    return () => worker.terminate();
  }, []);

  return workerRef;
}

// Component usage
function Table({ items }) {
  const processor = useDataProcessor<DataProcessorApi>();
  const [grouped, setGrouped] = useState(null);

  const handleGroup = async (field: string) => {
    if (processor.current) {
      const result = await processor.current.groupItems(items, field);
      setGrouped(result);
    }
  };
}
```

## Memoization Patterns That Actually Matter

**Where memoization is critical**:
- **Column definitions**: Must have stable references—new array each render causes full table re-render
- **Data arrays**: Primary re-render trigger—must be memoized or stable
- **Event handlers passed to memoized rows**: Only if rows use `React.memo`

**Where memoization hurts performance**:
- Simple calculations under ~1,000 operations (hook overhead exceeds computation)
- Values that change every render (cache constantly invalidated)
- Parent components when children aren't wrapped in `React.memo` (wasted effort)

```tsx
// ✅ CRITICAL: Memoize columns - they almost never change
const columns = useMemo(() => [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
], []);

// ✅ CRITICAL: Stable data reference
const stableData = useMemo(() => data, [data]);

// ✅ Memoize handlers ONLY if rows are React.memo wrapped
const handleRowClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// ❌ CARGO CULT: Memoizing cheap operations
const doubled = useMemo(() => value * 2, [value]); // Hook overhead > computation

// ❌ CARGO CULT: Dependencies change every render
const config = useMemo(() => ({ ...props }), [props]); // props is new object each render
```

**Component structure for minimal re-renders**:

```tsx
// Each row independently memoized with custom comparison
const TableRow = React.memo(function TableRow({ row, onSelect }) {
  return (
    <tr onClick={() => onSelect(row.id)}>
      {row.cells.map(cell => (
        <MemoizedCell key={cell.id} cell={cell} />
      ))}
    </tr>
  );
}, (prev, next) => prev.row.id === next.row.id && prev.row.updatedAt === next.row.updatedAt);

const MemoizedCell = React.memo(function Cell({ cell }) {
  return <td>{cell.value}</td>;
});
```

## Memory Management with Supabase Real-time

Your unbounded memory growth stems from accumulating rows. The solution combines normalized data structures with virtualization:

```tsx
'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createClient } from '@supabase/supabase-js';

function VirtualizedRealtimeTable({ initialData }) {
  // Normalized structure with Map for O(1) lookups
  const [state, setState] = useState(() => ({
    byId: new Map(initialData.map(r => [r.id, r])),
    ids: initialData.map(r => r.id),
  }));

  const parentRef = useRef<HTMLDivElement>(null);

  // Supabase real-time with proper cleanup
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('table-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          setState(prev => {
            const newById = new Map(prev.byId);
            let newIds = prev.ids;

            switch (payload.eventType) {
              case 'INSERT':
                newById.set(payload.new.id, payload.new);
                newIds = [...newIds, payload.new.id];
                break;
              case 'UPDATE':
                // O(1) update - works whether item is visible or not
                newById.set(payload.new.id, payload.new);
                break;
              case 'DELETE':
                newById.delete(payload.old.id);
                newIds = newIds.filter(id => id !== payload.old.id);
                break;
            }
            return { byId: newById, ids: newIds };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);  // CRITICAL: prevent memory leak
    };
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: state.ids.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = state.byId.get(state.ids[virtualRow.index]);
          return (
            <TableRow
              key={row.id}
              row={row}
              style={{ position: 'absolute', top: virtualRow.start }}
            />
          );
        })}
      </div>
    </div>
  );
}
```

**Why Map over Object**: Map provides **4x faster insertions and deletions** for large datasets, maintains insertion order, and doesn't convert keys to strings. Objects become unusably slow after ~8.3M elements; Map remains stable at 5M+.

## Library Recommendation Matrix

| Library | Best For | Bundle Size | Your Use Case Fit |
|---------|----------|-------------|-------------------|
| **@tanstack/react-virtual** | 1K-50K rows, custom UI | 10-15kb | ✅ Best choice |
| react-window | Simple lists, uniform sizes | ~6kb | ⚠️ Less flexible |
| AG Grid | 10K+ rows, enterprise features | ~300kb+ | ❌ Overkill, expensive |
| Canvas-based | Millions of cells, 60fps required | Varies | ❌ Not needed |

**Use @tanstack/react-virtual** because:
- Hook-based API aligns with React 18 patterns
- Seamless TanStack Table integration
- Better dynamic content support for real-time updates
- More active development than react-window
- Headless design gives full control over UI

## Content-visibility Verdict for Your Use Case

**Content-visibility is the wrong tool for interactive tables with 1,000+ rows.** The benchmarks are clear:

| Scenario | Content-visibility Gain | True Virtualization Gain |
|----------|------------------------|-------------------------|
| Interactive 1K+ row table | 15-45% | 90%+ |
| Memory reduction | 0% (all nodes in DOM) | 95%+ |
| React reconciliation savings | 0% | Proportional to virtualization |
| Scroll performance | Jank during fast scroll | Consistent 60fps |

Content-visibility helps static pages chunked into sections. For your dynamic, editable, draggable table, it's cargo cult optimization that doesn't address the fundamental problem.

## Implementation Priority Roadmap

1. **Immediately**: Replace progressive loading with @tanstack/react-virtual (highest impact)
2. **Week 1**: Implement dnd-kit integration using `top` positioning pattern
3. **Week 1**: Add normalized state structure with Map for O(1) lookups
4. **Week 2**: Separate sticky columns from virtualized area
5. **Week 2**: Add useTransition for filter/sort operations
6. **Week 3**: Implement web workers for grouping operations if useTransition isn't sufficient
7. **Week 3**: Add progressive cell rendering modes (Light/Full) if needed for polish

The single highest-impact change is implementing true virtualization. Everything else is optimization on top of that foundation. Your current content-visibility approach will never achieve acceptable performance at 2,000+ rows regardless of other optimizations—the DOM size fundamentally prevents it.

---

## References

- Monday.com Engineering Blog: Board Performance articles
- TanStack Virtual documentation
- dnd-kit documentation
- Web.dev content-visibility article
