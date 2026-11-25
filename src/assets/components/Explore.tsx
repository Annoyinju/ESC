import { memo, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api"; // adjust to where your api.ts lives

interface ExploreItem {
    id: number;
    title: string | null;
    desc: string | null;
    author: string;
    imageUrl: string | null;
}

interface ExplorePage {
    items: ExploreItem[];
    nextCursor: number | null;
}

interface ExploreProps {
    isAdmin: boolean;
    loggedIn: boolean;
}

interface ExploreCardProps {
    item: ExploreItem;
    onDelete?: (id: number) => void;
}

const GAP = 16;            // space between cards (px)
const MIN_CARD = 220;      // minimum card width, decides the number of columns
const INFO_HEIGHT = 56;    // fixed height of the title/creator area
const OVERSCAN_ROWS = 2;   // extra rows rendered above and below the viewport
const PAGE_SIZE = 24;

/* ---------- One card ---------- */

const ExploreCard = memo(function ExploreCard({ item, onDelete }: ExploreCardProps) {
    const [failed, setFailed] = useState<boolean>(false);

    return (
        <article className="exploreCard" title={item.desc ?? undefined}>
            {onDelete && (
                <button
                    className="exploreDelete"
                    onClick={() => onDelete(item.id)}
                    aria-label="Delete drawing"
                >
                    🗑
                </button>
            )}
            <div className="exploreImage">
                {item.imageUrl && !failed ? (
                    <img
                        src={item.imageUrl}
                        alt={item.title ?? "Untitled drawing"}
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailed(true)}
                    />
                ) : (
                    <span className="exploreMissing">Image unavailable</span>
                )}
            </div>
            <div className="exploreInfo">
                <strong>{item.title ?? "Untitled"}</strong>
                <span>by {item.author}</span>
            </div>
        </article>
    );
});

/* ---------- The virtualized grid ---------- */

export default function Explore({ isAdmin, loggedIn }: ExploreProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [myIds, setMyIds] = useState<Set<number>>(new Set());

    const [items, setItems] = useState<ExploreItem[]>([]);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [scrollTop, setScrollTop] = useState<number>(0);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    const loadingRef = useRef<boolean>(false);
    const cursorRef = useRef<number | null | undefined>(undefined);
    useEffect(() => {
    if (!loggedIn) {
        setMyIds(new Set());
        return;
    }
    api("/drawings")
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: { id: number }[]) => setMyIds(new Set(rows.map((r) => r.id))))
        .catch(() => setMyIds(new Set()));
}, [loggedIn]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const loadMore = useCallback(async () => {
        if (loadingRef.current || cursorRef.current === null) return;
        loadingRef.current = true;
        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
            if (cursorRef.current !== undefined) params.set("cursor", String(cursorRef.current));

            const res = await api(`/explore?${params}`);
            if (!res.ok) throw new Error("Request failed");

            const data: ExplorePage = await res.json();
            setItems((prev) => [...prev, ...data.items]);

            cursorRef.current = data.nextCursor;
            if (data.nextCursor === null) setHasMore(false);
        } catch {
            setError("Could not load drawings.");
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    /* Admin: delete a drawing for everyone */
    const handleDelete = useCallback(async (id: number) => {
        const own = myIds.has(id);
        if (!confirm(own ? "Delete your drawing? This can't be undone."
                        : "Delete this drawing for everyone? This can't be undone.")) return;
        try {
            const res = await api(`/drawings/${id}`, { method: "DELETE" });
            if (res.ok) {
                setItems((prev) => prev.filter((i) => i.id !== id));
            } else if (res.status === 401 || res.status === 403) {
                alert("You're not allowed to delete this.");
            } else {
                alert("Delete failed. Try again.");
            }
        } catch {
            alert("Could not reach the server.");
        }
    }, [myIds]);

    /* Layout math */
    const columns = Math.max(1, Math.floor((size.width + GAP) / (MIN_CARD + GAP)));
    const cardWidth = size.width > 0 ? (size.width - GAP * (columns - 1)) / columns : MIN_CARD;
    const cardHeight = cardWidth + INFO_HEIGHT;
    const rowHeight = cardHeight + GAP;

    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = Math.max(0, totalRows * rowHeight - GAP);

    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
    const endRow = Math.min(
        totalRows,
        Math.ceil((scrollTop + size.height) / rowHeight) + OVERSCAN_ROWS
    );
    const visible = items.slice(startRow * columns, endRow * columns);

    useEffect(() => {
        if (size.height === 0 || error || !hasMore) return;
        if (endRow >= totalRows) loadMore();
    }, [size.height, error, hasMore, endRow, totalRows, loadMore]);

    const retry = () => {
        setError("");
        loadMore();
    };

    return (
        <div
            ref={scrollRef}
            className="exploreScroll"
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
            <div style={{ position: "relative", height: totalHeight }}>
                {visible.map((item, i) => {
                    const index = startRow * columns + i;
                    const row = Math.floor(index / columns);
                    const col = index % columns;
                    const showDelete = isAdmin || myIds.has(item.id);   // here

                    return (
                        <div key={item.id} style={{
                                position: "absolute",
                                top: row * rowHeight,
                                left: col * (cardWidth + GAP),
                                width: cardWidth,
                                height: cardHeight,
                            }}>
                            <ExploreCard item={item} onDelete={showDelete ? handleDelete : undefined} />
                        </div>
                    );
                })}
            </div>

            <div className="exploreStatus">
                {loading && <span>Loading...</span>}
                {error && (
                    <>
                        <span>{error}</span> <button onClick={retry}>Retry</button>
                    </>
                )}
                {!loading && !error && !hasMore && items.length === 0 && (
                    <span>No public drawings yet.</span>
                )}
                {!loading && !error && !hasMore && items.length > 0 && (
                    <span>You've reached the end.</span>
                )}
            </div>
        </div>
    );
}