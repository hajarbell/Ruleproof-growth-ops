import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Linkedin,
  Facebook,
  PenTool,
  Lightbulb,
  Bot,
  UserSearch,
  Megaphone,
  FolderOpen,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  UserPlus,
  Shield,
  Star,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Nav per role — paths MUST match routes in App.tsx exactly ───────────────
const ALL_NAV = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "LinkedIn", path: "/linkedin", icon: Linkedin },
  { title: "Facebook", path: "/facebook", icon: Facebook },
  { title: "Content Studio", path: "/content", icon: PenTool }, // was /content-studio ❌
  { title: "Ideas Lab", path: "/ideas", icon: Lightbulb }, // was /ideas-lab ❌
  { title: "Scrapers", path: "/scrapers", icon: Bot },
  { title: "Leads CRM", path: "/leads", icon: UserSearch },
  { title: "Campaigns", path: "/campaigns", icon: Megaphone },
  { title: "Files", path: "/files", icon: FolderOpen },
  { title: "Activity", path: "/activity", icon: Activity },
  { title: "Settings", path: "/settings", icon: Settings },
];

const GUEST_PATHS = ["/content"];
const VIP_HIDDEN = ["/scrapers", "/leads", "/campaigns"];

function getNavItems(role: string | null) {
  if (role === "admin") return ALL_NAV;
  if (role === "vip")
    return ALL_NAV.filter((i) => !VIP_HIDDEN.includes(i.path));
  // guest
  return ALL_NAV.filter(
    (i) => GUEST_PATHS.includes(i.path) || i.path === "/settings",
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  if (role === "admin")
    return (
      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
        <Shield className="w-2.5 h-2.5" />
        Admin
      </span>
    );
  if (role === "vip")
    return (
      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold uppercase">
        <Star className="w-2.5 h-2.5" />
        VIP
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold uppercase">
      <UserIcon className="w-2.5 h-2.5" />
      Guest
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  name,
  photo,
  size = 8,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const ini = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`;
  if (photo)
    return <img src={photo} alt={name} className={`${cls} object-cover`} />;
  return (
    <div
      className={`${cls} gradient-primary flex items-center justify-center text-primary-foreground font-bold`}
      style={{ fontSize: size <= 6 ? "9px" : "11px" }}
    >
      {ini}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, workspace, members, myRole, logout } = useAuth();

  const navItems = getNavItems(myRole);
  const displayName = user?.displayName || user?.email?.split("@")[0] || "You";
  const photoURL = user?.photoURL || "";

  const handleLogout = async () => {
    setWsMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 252 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar z-30 overflow-hidden"
    >
      {/* ── WORKSPACE HEADER ── */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => !collapsed && setWsMenuOpen(!wsMenuOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-3 hover:bg-sidebar-accent transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm text-primary-foreground font-bold text-sm">
            {workspace?.name?.[0]?.toUpperCase() ?? "R"}
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0 text-left overflow-hidden"
              >
                <p className="font-bold text-sm text-sidebar-foreground truncate leading-tight">
                  {workspace?.name ?? "RuProof"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Growth OS
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${wsMenuOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {/* Workspace dropdown */}
        <AnimatePresence>
          {wsMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-2 right-2 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">
                  {workspace?.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  setWsMenuOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite members
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── NAV ITEMS ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 px-2">
        {navItems.map(({ title, path, icon: Icon }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {title}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* ── BOTTOM USER ROW ── */}
      <div
        className={`flex-shrink-0 border-t border-sidebar-border p-2 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}
      >
        <Avatar name={displayName} photo={photoURL} size={7} />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-w-0"
            >
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {displayName}
              </p>
              {myRole && <RoleBadge role={myRole} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── COLLAPSE TOGGLE ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex-shrink-0 flex items-center justify-center h-8 border-t border-sidebar-border text-muted-foreground hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
}
