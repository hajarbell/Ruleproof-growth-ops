import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Link2,
  Image,
  FileText,
  X,
  ChevronLeft,
  Pencil,
  Square,
  StickyNote,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MessageCircle,
  Type,
  Minus,
  Bold,
  AlignLeft,
  Move,
  MousePointer2,
  Highlighter,
  CornerUpLeft,
  Users,
  Tag,
  Layout,
  File,
  Grid3X3,
  Check,
  Upload,
  GripVertical,
} from "lucide-react";

// ─── Brand Colors ──────────────────────────────────────────────────────────────
const BRAND_COLORS = [
  "#38BDF8",
  "#0EA5E9",
  "#0284C7",
  "#7C3AED",
  "#8B5CF6",
  "#A78BFA",
  "#EC4899",
  "#F43F5E",
  "#FB7185",
  "#10B981",
  "#34D399",
  "#6EE7B7",
  "#F59E0B",
  "#FBBF24",
  "#FCD34D",
  "#EF4444",
  "#14B8A6",
  "#06B6D4",
  "#6366F1",
  "#818CF8",
  "#F97316",
  "#FB923C",
  "#84CC16",
  "#22C55E",
  "#E879F9",
  "#D946EF",
  "#64748B",
  "#94A3B8",
  "#CBD5E1",
  "#FFFFFF",
];
const GRADIENTS = [
  { name: "Aura", value: "linear-gradient(135deg,#8B5CF6,#38BDF8)" },
  { name: "Bluesky", value: "linear-gradient(135deg,#0EA5E9,#6366F1)" },
  { name: "Hotpink", value: "linear-gradient(135deg,#EC4899,#F97316)" },
];

// ─── Types ─────────────────────────────────────────────────────────────────────
type NodeType = "shape" | "sticky" | "image" | "text";
interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fill: string;
  gradient?: string;
  borderRadius: number;
  fontSize: number;
  bold: boolean;
  imageUrl?: string;
  rotation: number;
}
interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
}
interface Comment {
  id: string;
  nodeId?: string;
  x: number;
  y: number;
  text: string;
  author: string;
  color: string;
}
interface DrawPath {
  id: string;
  points: string;
  color: string;
  width: number;
  highlight: boolean;
}
interface IdeaCard {
  id: string;
  title: string;
  tags: string[];
  category: string;
  assignee?: string;
  format: "canvas" | "file" | "board" | "image";
  color: string;
  canvasData?: {
    nodes: CanvasNode[];
    connections: Connection[];
    comments: Comment[];
    draws: DrawPath[];
  };
}

const CATEGORIES = [
  "Post Idea",
  "Campaign Idea",
  "Research",
  "Hooks & Angles",
  "Competitor Intel",
  "Strategy",
  "Visual",
];
const BOARDS = [
  "Post Ideas",
  "Campaign Ideas",
  "Hooks & Angles",
  "Competitor Intel",
  "Strategy",
];
const MEMBERS = ["You", "Alex", "Jordan", "Sam", "Riley"];
const FORMATS: {
  value: IdeaCard["format"];
  label: string;
  icon: any;
  desc: string;
}[] = [
  {
    value: "canvas",
    label: "Canvas",
    icon: Grid3X3,
    desc: "Mind map & whiteboard",
  },
  { value: "board", label: "Board", icon: Layout, desc: "Kanban-style board" },
  { value: "file", label: "File", icon: File, desc: "Document or note" },
  { value: "image", label: "Image", icon: Image, desc: "Visual asset" },
];

const STICKY_COLORS = [
  "#FEF08A",
  "#86EFAC",
  "#93C5FD",
  "#F9A8D4",
  "#FCA5A5",
  "#C4B5FD",
];

let nid = 100;
const uid = () => `n${++nid}`;

// ─── New Idea Modal ────────────────────────────────────────────────────────────
function NewIdeaModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (idea: IdeaCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [assignee, setAssignee] = useState("You");
  const [format, setFormat] = useState<IdeaCard["format"]>("canvas");

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  const submit = () => {
    if (!title.trim()) return;
    onCreate({
      id: uid(),
      title,
      tags,
      category,
      assignee,
      format,
      color: "#38BDF8",
      canvasData: { nodes: [], connections: [], comments: [], draws: [] },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
        style={{ background: "hsl(225 30% 8%)" }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
          <h2 className="text-base font-semibold text-foreground font-display">
            New Idea
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your idea a name..."
              className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {/* Category */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Add a tag..."
                className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground hover:bg-accent"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs"
                  >
                    {t}
                    <button
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Assign */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Assign to
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {MEMBERS.map((m) => (
                <button
                  key={m}
                  onClick={() => setAssignee(m)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${assignee === m ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {/* Format */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${format === f.value ? "border-primary/60 bg-primary/10 text-primary" : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted"}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="px-5 py-2 rounded-lg gradient-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {format === "canvas" ? "Open Canvas →" : "Create"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Color Panel ───────────────────────────────────────────────────────────────
function ColorPanel({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string, g?: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("#ffffff");
  const [customColors, setCustomColors] = useState<string[]>([]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="absolute z-40 top-full mt-1 left-0 w-64 rounded-xl border border-border/60 shadow-2xl p-3"
      style={{ background: "hsl(225 25% 10%)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Color
        </span>
        <button onClick={onClose}>
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      {/* Brand palette */}
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {[...BRAND_COLORS, ...customColors].map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{ background: c }}
            className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 ${value === c ? "border-white" : "border-transparent"}`}
          />
        ))}
      </div>
      {/* Gradients */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1.5">Gradients</p>
        <div className="flex gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g.name}
              onClick={() => onChange("gradient", g.value)}
              style={{ background: g.value }}
              className="flex-1 h-7 rounded-md text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
      {/* Add custom */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        <input
          type="color"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
        />
        <button
          onClick={() => {
            setCustomColors([...customColors, custom]);
            onChange(custom);
          }}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          <Plus className="w-3 h-3" />
          Add color
        </button>
      </div>
    </motion.div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────────────
type Tool =
  | "select"
  | "shape"
  | "sticky"
  | "connect"
  | "pencil"
  | "highlight"
  | "text"
  | "erase"
  | "comment"
  | "image";

function Canvas({ idea, onBack }: { idea: IdeaCard; onBack: () => void }) {
  const [nodes, setNodes] = useState<CanvasNode[]>(
    idea.canvasData?.nodes || [],
  );
  const [connections, setConnections] = useState<Connection[]>(
    idea.canvasData?.connections || [],
  );
  const [comments, setComments] = useState<Comment[]>(
    idea.canvasData?.comments || [],
  );
  const [draws, setDraws] = useState<DrawPath[]>(idea.canvasData?.draws || []);

  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#38BDF8");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState("");
  const [commentPos, setCommentPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    ox: number;
    oy: number;
  } | null>(null);
  const [resizingNode, setResizingNode] = useState<{
    id: string;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);
  const [shapeColor, setShapeColor] = useState("#1E293B");
  const [shapeGradient, setShapeGradient] = useState<string | undefined>();
  const [shapeRadius, setShapeRadius] = useState(12);
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const getSVGPoint = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  const selectedNode = nodes.find((n) => n.id === selectedId);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    const pt = getSVGPoint(e);

    if (tool === "shape") {
      const node: CanvasNode = {
        id: uid(),
        type: "shape",
        x: pt.x - 60,
        y: pt.y - 30,
        w: 120,
        h: 60,
        text: "Node",
        fill: shapeColor,
        gradient: shapeGradient,
        borderRadius: shapeRadius,
        fontSize,
        bold: isBold,
        rotation: 0,
      };
      setNodes((prev) => [...prev, node]);
      setSelectedId(node.id);
      setTool("select");
      return;
    }
    if (tool === "sticky") {
      const node: CanvasNode = {
        id: uid(),
        type: "sticky",
        x: pt.x - 60,
        y: pt.y - 40,
        w: 120,
        h: 100,
        text: "Note...",
        fill: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        borderRadius: 4,
        fontSize: 13,
        bold: false,
        rotation: 0,
      };
      setNodes((prev) => [...prev, node]);
      setSelectedId(node.id);
      setTool("select");
      return;
    }
    if (tool === "text") {
      const node: CanvasNode = {
        id: uid(),
        type: "text",
        x: pt.x,
        y: pt.y,
        w: 160,
        h: 40,
        text: "Text",
        fill: "transparent",
        borderRadius: 0,
        fontSize,
        bold: isBold,
        rotation: 0,
      };
      setNodes((prev) => [...prev, node]);
      setSelectedId(node.id);
      setEditNodeId(node.id);
      setTool("select");
      return;
    }
    if (tool === "comment") {
      setCommentPos(pt);
      return;
    }
    if (tool === "pencil" || tool === "highlight") {
      setDrawing(true);
      setCurrentPath([pt]);
      return;
    }
    if (tool === "image") {
      const url = window.prompt("Paste image URL:");
      if (url) {
        const node: CanvasNode = {
          id: uid(),
          type: "image",
          x: pt.x - 80,
          y: pt.y - 60,
          w: 160,
          h: 120,
          text: "",
          fill: "",
          borderRadius: 8,
          fontSize: 14,
          bold: false,
          imageUrl: url,
          rotation: 0,
        };
        setNodes((prev) => [...prev, node]);
      }
      setTool("select");
      return;
    }
    setSelectedId(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (draggingNode) {
      const pt = getSVGPoint(e);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNode.id
            ? { ...n, x: pt.x - draggingNode.ox, y: pt.y - draggingNode.oy }
            : n,
        ),
      );
      return;
    }
    if (resizingNode) {
      const pt = getSVGPoint(e);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === resizingNode.id
            ? {
                ...n,
                w: Math.max(60, resizingNode.ow + (pt.x - resizingNode.ox)),
                h: Math.max(40, resizingNode.oh + (pt.y - resizingNode.oy)),
              }
            : n,
        ),
      );
      return;
    }
    if (drawing) {
      const pt = getSVGPoint(e);
      setCurrentPath((prev) => [...prev, pt]);
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
    if (drawing && currentPath.length > 1) {
      const pts = currentPath.map((p) => `${p.x},${p.y}`).join(" L ");
      const path: DrawPath = {
        id: uid(),
        points: `M ${pts}`,
        color: strokeColor,
        width: tool === "highlight" ? 18 : strokeWidth,
        highlight: tool === "highlight",
      };
      setDraws((prev) => [...prev, path]);
    }
    setDrawing(false);
    setCurrentPath([]);
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === "erase") {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setConnections((prev) =>
        prev.filter((c) => c.from !== id && c.to !== id),
      );
      return;
    }
    if (tool === "connect") {
      if (!connectFrom) {
        setConnectFrom(id);
      } else if (connectFrom !== id) {
        const label = window.prompt("Connection label (optional):") || "";
        setConnections((prev) => [
          ...prev,
          { id: uid(), from: connectFrom, to: id, label },
        ]);
        setConnectFrom(null);
      }
      return;
    }
    setSelectedId(id);
    const pt = getSVGPoint(e);
    const node = nodes.find((n) => n.id === id)!;
    setDraggingNode({ id, ox: pt.x - node.x, oy: pt.y - node.y });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.2, Math.min(3, z * delta)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setConnections((prev) =>
      prev.filter((c) => c.from !== selectedId && c.to !== selectedId),
    );
    setSelectedId(null);
  };

  const updateNode = (id: string, patch: Partial<CanvasNode>) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const getNodeCenter = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? { x: n.x + n.w / 2, y: n.y + n.h / 2 } : { x: 0, y: 0 };
  };

  const currentPathStr =
    currentPath.length > 1
      ? `M ${currentPath.map((p) => `${p.x},${p.y}`).join(" L ")}`
      : "";

  const toolButtons: { t: Tool; icon: any; label: string }[] = [
    { t: "select", icon: MousePointer2, label: "Select" },
    { t: "shape", icon: Square, label: "Shape" },
    { t: "sticky", icon: StickyNote, label: "Sticky" },
    { t: "text", icon: Type, label: "Text" },
    { t: "connect", icon: Move, label: "Connect" },
    { t: "pencil", icon: Pencil, label: "Draw" },
    { t: "highlight", icon: Highlighter, label: "Highlight" },
    { t: "image", icon: Upload, label: "Image" },
    { t: "comment", icon: MessageCircle, label: "Comment" },
    { t: "erase", icon: Trash2, label: "Erase" },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: "hsl(225 30% 7%)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30"
        style={{ background: "hsl(225 30% 8%)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Ideas Lab</span>
        </button>
        <div className="w-px h-4 bg-border/40" />
        <span className="text-sm font-medium text-foreground font-display">
          {idea.title}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary ml-1">
          {idea.category}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left toolbar */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 p-1.5 rounded-xl border border-border/40 shadow-xl"
          style={{ background: "hsl(225 25% 10%)" }}
        >
          {toolButtons.map(({ t, icon: Icon, label }) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              title={label}
              className={`p-2 rounded-lg transition-colors ${tool === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="my-1 h-px bg-border/30" />
          <div className="relative">
            <button
              onClick={() => setShowColorPanel((p) => !p)}
              title="Color"
              className="p-2 rounded-lg hover:bg-muted"
            >
              <div
                className="w-4 h-4 rounded-sm border border-white/20"
                style={{ background: strokeColor }}
              />
            </button>
            {showColorPanel && (
              <div className="absolute left-full ml-2 top-0">
                <ColorPanel
                  value={strokeColor}
                  onChange={(v, g) => {
                    setStrokeColor(v === "gradient" ? g || v : v);
                    setShowColorPanel(false);
                  }}
                  onClose={() => setShowColorPanel(false)}
                />
              </div>
            )}
          </div>
          <button
            onClick={() =>
              setStrokeWidth((w) => (w === 1 ? 2 : w === 2 ? 4 : 1))
            }
            title="Stroke width"
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted text-xs font-mono"
          >
            {strokeWidth}px
          </button>
          <button
            onClick={() => setDraws((prev) => prev.slice(0, -1))}
            title="Undo last stroke"
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <CornerUpLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Right properties panel */}
        {selectedNode && tool === "select" && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-3 top-3 z-20 w-52 rounded-xl border border-border/40 shadow-xl p-3 space-y-3"
            style={{ background: "hsl(225 25% 10%)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Properties
              </span>
              <button
                onClick={deleteSelected}
                className="p-1 rounded hover:bg-destructive/20 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {selectedNode.type !== "text" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Fill
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {BRAND_COLORS.slice(0, 12).map((c) => (
                    <button
                      key={c}
                      style={{ background: c }}
                      onClick={() =>
                        updateNode(selectedNode.id, {
                          fill: c,
                          gradient: undefined,
                        })
                      }
                      className={`w-6 h-6 rounded border-2 ${selectedNode.fill === c ? "border-white" : "border-transparent"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.name}
                      style={{ background: g.value }}
                      onClick={() =>
                        updateNode(selectedNode.id, {
                          fill: "gradient",
                          gradient: g.value,
                        })
                      }
                      className="flex-1 h-5 rounded text-[9px] text-white"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedNode.type === "shape" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Roundness: {selectedNode.borderRadius}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={selectedNode.borderRadius}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      borderRadius: +e.target.value,
                    })
                  }
                  className="w-full h-1 accent-primary"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Font size: {selectedNode.fontSize}px
              </label>
              <input
                type="range"
                min={10}
                max={36}
                value={selectedNode.fontSize}
                onChange={(e) =>
                  updateNode(selectedNode.id, { fontSize: +e.target.value })
                }
                className="w-full h-1 accent-primary"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() =>
                  updateNode(selectedNode.id, { bold: !selectedNode.bold })
                }
                className={`flex-1 p-1.5 rounded text-xs flex items-center justify-center gap-1 ${selectedNode.bold ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                <Bold className="w-3 h-3" />
                Bold
              </button>
              <button
                onClick={() => {
                  const t =
                    window.prompt("Edit text:", selectedNode.text) ||
                    selectedNode.text;
                  updateNode(selectedNode.id, { text: t });
                }}
                className="flex-1 p-1.5 rounded text-xs flex items-center justify-center gap-1 bg-muted text-muted-foreground"
              >
                <Type className="w-3 h-3" />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="text-xs text-muted-foreground">W</label>
                <input
                  type="number"
                  value={Math.round(selectedNode.w)}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { w: +e.target.value })
                  }
                  className="w-full bg-muted/50 border border-border/40 rounded px-2 py-1 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">H</label>
                <input
                  type="number"
                  value={Math.round(selectedNode.h)}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { h: +e.target.value })
                  }
                  className="w-full bg-muted/50 border border-border/40 rounded px-2 py-1 text-xs text-foreground"
                />
              </div>
            </div>
            <button
              onClick={() => {
                const copy: CanvasNode = {
                  ...selectedNode,
                  id: uid(),
                  x: selectedNode.x + 20,
                  y: selectedNode.y + 20,
                };
                setNodes((prev) => [...prev, copy]);
                setSelectedId(copy.id);
              }}
              className="w-full p-1.5 rounded bg-muted text-muted-foreground text-xs hover:bg-accent"
            >
              Duplicate
            </button>
          </motion.div>
        )}

        {tool === "connect" && connectFrom && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs">
            Click another shape to connect
          </div>
        )}

        {commentPos && (
          <div
            className="absolute z-30"
            style={{
              left: commentPos.x * zoom + pan.x + 10,
              top: commentPos.y * zoom + pan.y + 10,
            }}
          >
            <div className="bg-card border border-border rounded-xl shadow-xl p-3 w-52">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add comment..."
                rows={2}
                className="w-full bg-muted/50 rounded p-2 text-sm text-foreground resize-none focus:outline-none"
              />
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => {
                    if (commentText.trim()) {
                      setComments((prev) => [
                        ...prev,
                        {
                          id: uid(),
                          x: commentPos.x,
                          y: commentPos.y,
                          text: commentText,
                          author: "You",
                          color: "#38BDF8",
                        },
                      ]);
                    }
                    setCommentPos(null);
                    setCommentText("");
                  }}
                  className="flex-1 py-1 rounded bg-primary text-primary-foreground text-xs"
                >
                  Post
                </button>
                <button
                  onClick={() => {
                    setCommentPos(null);
                    setCommentText("");
                  }}
                  className="flex-1 py-1 rounded bg-muted text-muted-foreground text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          className="flex-1 w-full h-full select-none"
          style={{
            cursor:
              tool === "pencil" || tool === "highlight"
                ? "crosshair"
                : tool === "shape" || tool === "sticky" || tool === "text"
                  ? "cell"
                  : isPanning
                    ? "grabbing"
                    : "default",
          }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onWheel={onWheel}
        >
          <defs>
            {GRADIENTS.map((g) => {
              const id = `grad-${g.name}`;
              const colors = g.value.match(/#[0-9a-fA-F]{6}/g) || [
                "#8B5CF6",
                "#38BDF8",
              ];
              return (
                <linearGradient
                  key={id}
                  id={id}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={colors[0]} />
                  <stop offset="100%" stopColor={colors[1]} />
                </linearGradient>
              );
            })}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0,8 3,0 6" fill="#64748B" />
            </marker>
          </defs>

          <pattern
            id="dots"
            x={pan.x % (20 * zoom)}
            y={pan.y % (20 * zoom)}
            width={20 * zoom}
            height={20 * zoom}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={10 * zoom}
              cy={10 * zoom}
              r={0.8}
              fill="rgba(100,116,139,0.25)"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {connections.map((c) => {
              const a = getNodeCenter(c.from);
              const b = getNodeCenter(c.to);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const cx1 = a.x + dx * 0.25;
              const cy1 = a.y + dy * 0.25 - 40;
              const cx2 = b.x - dx * 0.25;
              const cy2 = b.y - dy * 0.25 - 40;
              return (
                <g key={c.id}>
                  <path
                    d={`M ${a.x} ${a.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${b.x} ${b.y}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                  />
                  {c.label && (
                    <g>
                      <rect
                        x={mx - c.label.length * 3.5 - 4}
                        y={my - 28}
                        width={c.label.length * 7 + 8}
                        height={18}
                        rx={4}
                        fill="hsl(225 25% 13%)"
                        stroke="#334155"
                      />
                      <text
                        x={mx}
                        y={my - 18}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize={10}
                        fontFamily="Inter"
                      >
                        {c.label}
                      </text>
                    </g>
                  )}
                  <circle
                    cx={mx}
                    cy={my - 20}
                    r={5}
                    fill="#1E293B"
                    stroke="#475569"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const l = window.prompt("Edit label:", c.label) || "";
                      setConnections((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, label: l } : x,
                        ),
                      );
                    }}
                  />
                  {tool === "erase" && (
                    <path
                      d={`M ${a.x} ${a.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${b.x} ${b.y}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setConnections((prev) =>
                          prev.filter((x) => x.id !== c.id),
                        )
                      }
                    />
                  )}
                </g>
              );
            })}

            {draws.map((d) => (
              <path
                key={d.id}
                d={d.points}
                fill="none"
                stroke={d.color}
                strokeWidth={d.width}
                strokeOpacity={d.highlight ? 0.4 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ cursor: tool === "erase" ? "pointer" : "default" }}
                onClick={() =>
                  tool === "erase" &&
                  setDraws((prev) => prev.filter((x) => x.id !== d.id))
                }
              />
            ))}
            {drawing && currentPathStr && (
              <path
                d={currentPathStr}
                fill="none"
                stroke={strokeColor}
                strokeWidth={tool === "highlight" ? 18 : strokeWidth}
                strokeOpacity={tool === "highlight" ? 0.4 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {nodes.map((node) => {
              const isSelected = selectedId === node.id;
              const gradMatch = GRADIENTS.find(
                (g) => g.value === node.gradient,
              );
              const fillVal =
                node.gradient && gradMatch
                  ? `url(#grad-${gradMatch.name})`
                  : node.fill;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{
                    cursor:
                      tool === "select"
                        ? "move"
                        : tool === "erase"
                          ? "crosshair"
                          : "default",
                  }}
                  onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditNodeId(node.id);
                  }}
                >
                  {node.type === "shape" && (
                    <rect
                      width={node.w}
                      height={node.h}
                      rx={node.borderRadius}
                      fill={fillVal}
                      stroke={isSelected ? "#38BDF8" : "#334155"}
                      strokeWidth={isSelected ? 1.5 : 1}
                    />
                  )}
                  {node.type === "sticky" && (
                    <>
                      <rect
                        width={node.w}
                        height={node.h}
                        rx={4}
                        fill={node.fill}
                        style={{
                          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
                        }}
                      />
                      <rect
                        width={node.w}
                        height={12}
                        rx={4}
                        fill="rgba(0,0,0,0.12)"
                      />
                    </>
                  )}
                  {node.type === "image" && node.imageUrl && (
                    <image
                      href={node.imageUrl}
                      width={node.w}
                      height={node.h}
                    />
                  )}
                  {node.type !== "image" &&
                    (editNodeId === node.id ? (
                      <foreignObject
                        x={4}
                        y={4}
                        width={node.w - 8}
                        height={node.h - 8}
                      >
                        <textarea
                          value={node.text}
                          onChange={(e) =>
                            updateNode(node.id, { text: e.target.value })
                          }
                          onBlur={() => setEditNodeId(null)}
                          autoFocus
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            color: node.type === "sticky" ? "#1a1a1a" : "#fff",
                            fontSize: node.fontSize,
                            fontWeight: node.bold ? "700" : "400",
                            fontFamily: "Inter",
                            padding: 0,
                            lineHeight: 1.4,
                          }}
                        />
                      </foreignObject>
                    ) : (
                      <text
                        x={node.w / 2}
                        y={node.h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={node.type === "sticky" ? "#1a1a1a" : "#E2E8F0"}
                        fontSize={node.fontSize}
                        fontWeight={node.bold ? "700" : "400"}
                        fontFamily="Inter"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {node.text.length > 40
                          ? node.text.slice(0, 38) + "…"
                          : node.text}
                      </text>
                    ))}
                  {isSelected && (
                    <>
                      <rect
                        x={-3}
                        y={-3}
                        width={node.w + 6}
                        height={node.h + 6}
                        rx={node.borderRadius + 2}
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                      />
                      <rect
                        x={node.w - 6}
                        y={node.h - 6}
                        width={10}
                        height={10}
                        rx={2}
                        fill="#38BDF8"
                        style={{ cursor: "se-resize" }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const pt = getSVGPoint(e);
                          setResizingNode({
                            id: node.id,
                            ox: pt.x,
                            oy: pt.y,
                            ow: node.w,
                            oh: node.h,
                          });
                        }}
                      />
                    </>
                  )}
                  {tool === "connect" && (
                    <circle
                      cx={node.w / 2}
                      cy={0}
                      r={5}
                      fill="#38BDF8"
                      opacity={connectFrom === node.id ? 1 : 0.6}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                </g>
              );
            })}

            {comments.map((c) => (
              <g
                key={c.id}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (
                    window.confirm(
                      `${c.author}: ${c.text}\n\nDelete this comment?`,
                    )
                  ) {
                    setComments((prev) => prev.filter((x) => x.id !== c.id));
                  }
                }}
              >
                <circle cx={c.x} cy={c.y} r={14} fill={c.color} opacity={0.9} />
                <text
                  x={c.x}
                  y={c.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={10}
                >
                  💬
                </text>
                <title>
                  {c.author}: {c.text}
                </title>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

// ─── Main IdeasLabPage ─────────────────────────────────────────────────────────
const DEFAULT_CARDS: IdeaCard[] = [
  {
    id: "1",
    title: "Hook: 'Most brokers waste 80% of their leads'",
    category: "Post Idea",
    tags: [],
    format: "canvas",
    color: "#38BDF8",
    canvasData: { nodes: [], connections: [], comments: [], draws: [] },
  },
  {
    id: "2",
    title: "Competitor analysis: InsurTech comparison",
    category: "Research",
    tags: [],
    format: "canvas",
    color: "#F59E0B",
    canvasData: { nodes: [], connections: [], comments: [], draws: [] },
  },
  {
    id: "3",
    title: "Video series: Day in the life of AI broker",
    category: "Campaign Idea",
    tags: [],
    format: "file",
    color: "#10B981",
    canvasData: { nodes: [], connections: [], comments: [], draws: [] },
  },
  {
    id: "4",
    title: "Carousel: 5 steps to automate lead gen",
    category: "Post Idea",
    tags: [],
    format: "board",
    color: "#38BDF8",
    canvasData: { nodes: [], connections: [], comments: [], draws: [] },
  },
  {
    id: "5",
    title: "Podcast guest outreach strategy",
    category: "Campaign Idea",
    tags: [],
    format: "canvas",
    color: "#10B981",
    canvasData: { nodes: [], connections: [], comments: [], draws: [] },
  },
  {
    id: "6",
    title: "Infographic: Insurance market 2026",
    category: "Visual",
    tags: [],
    format: "image",
    color: "#EF4444",
    canvasData: { nodes: [], connections: [], comments: [], draws: [] },
  },
];

const CAT_COLOR: Record<string, string> = {
  "Post Idea": "#38BDF8",
  "Campaign Idea": "#10B981",
  Research: "#F59E0B",
  "Hooks & Angles": "#8B5CF6",
  "Competitor Intel": "#F43F5E",
  Strategy: "#EC4899",
  Visual: "#EF4444",
};

const FORMAT_ICON: Record<string, any> = {
  canvas: Grid3X3,
  board: Layout,
  file: FileText,
  image: Image,
};

export default function IdeasLabPage() {
  const [cards, setCards] = useState<IdeaCard[]>(DEFAULT_CARDS);
  const [activeBoard, setActiveBoard] = useState("Post Ideas");
  const [showNewModal, setShowNewModal] = useState(false);
  const [canvasIdea, setCanvasIdea] = useState<IdeaCard | null>(null);

  const handleCreate = (idea: IdeaCard) => {
    setCards((prev) => [...prev, idea]);
    if (idea.format === "canvas") setCanvasIdea(idea);
  };

  const openIdea = (idea: IdeaCard) => {
    if (idea.format === "canvas") setCanvasIdea(idea);
  };

  if (canvasIdea)
    return <Canvas idea={canvasIdea} onBack={() => setCanvasIdea(null)} />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Ideas Lab
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Brain dump, mind map, and organize creative ideas.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Idea
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {BOARDS.map((board) => (
          <button
            key={board}
            onClick={() => setActiveBoard(board)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeBoard === board ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >
            {board}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((idea, i) => {
          const FormatIcon = FORMAT_ICON[idea.format] || FileText;
          const dotColor = CAT_COLOR[idea.category] || "#64748B";
          return (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-4 shadow-soft hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => openIdea(idea)}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-2 h-2 rounded-full mt-1"
                  style={{ background: dotColor }}
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground flex items-center gap-1">
                    <FormatIcon className="w-3 h-3" />
                    {idea.format}
                  </span>
                  <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h4 className="text-sm font-medium text-foreground mb-2 leading-snug">
                {idea.title}
              </h4>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {idea.category}
                </span>
                {idea.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                {idea.format === "canvas" && (
                  <button
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      openIdea(idea);
                    }}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    Open Canvas →
                  </button>
                )}
                <button
                  className="p-1.5 rounded text-muted-foreground hover:bg-muted ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCards((prev) => prev.filter((c) => c.id !== idea.id));
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cards.length * 0.04 }}
          onClick={() => setShowNewModal(true)}
          className="glass rounded-xl p-4 border-dashed border-border/60 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors min-h-[140px]"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">New Idea</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showNewModal && (
          <NewIdeaModal
            onClose={() => setShowNewModal(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
