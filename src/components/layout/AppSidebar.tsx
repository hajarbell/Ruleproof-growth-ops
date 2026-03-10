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

// ─── Nav per role ─────────────────────────────────────────────────────────────
const ALL_NAV = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "LinkedIn", path: "/linkedin", icon: Linkedin },
  { title: "Facebook", path: "/facebook", icon: Facebook },
  { title: "Content Studio", path: "/content-studio", icon: PenTool },
  { title: "Ideas Lab", path: "/ideas-lab", icon: Lightbulb },
  { title: "Scrapers", path: "/scrapers", icon: Bot },
  { title: "Leads CRM", path: "/leads", icon: UserSearch },
  { title: "Campaigns", path: "/campaigns", icon: Megaphone },
  { title: "Files", path: "/files", icon: FolderOpen },
  { title: "Activity", path: "/activity", icon: Activity },
  { title: "Settings", path: "/settings", icon: Settings },
];

const GUEST_PATHS = ["/content-studio"]; // guest only sees content studio
const VIP_HIDDEN = ["/scrapers", "/leads", "/campaigns"]; // vip sees everything except these

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
      {/* ── NOTION-STYLE WORKSPACE HEADER ── */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => !collapsed && setWsMenuOpen(!wsMenuOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-3 hover:bg-sidebar-accent transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          {/* Workspace icon */}
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

        {/* ── Workspace dropdown ── */}
        <AnimatePresence>
          {wsMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              className="absolute top-full left-2 right-2 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* My profile */}
              <div className="px-3 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <Avatar name={displayName} photo={photoURL} size={8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  {myRole && <RoleBadge role={myRole} />}
                </div>
              </div>

              {/* Members */}
              {members.length > 1 && (
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Members ({members.length})
                  </p>
                  <div className="space-y-1.5">
                    {members
                      .filter((m) => m.uid !== user?.uid)
                      .map((m) => (
                        <div key={m.uid} className="flex items-center gap-2">
                          <Avatar
                            name={m.displayName || m.email}
                            photo={m.photoURL}
                            size={6}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">
                              {m.displayName || m.email}
                            </p>
                          </div>
                          <RoleBadge role={m.role} />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {myRole === "admin" && (
                <button
                  onClick={() => {
                    setWsMenuOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Invite members
                  </span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-500/10 transition-colors text-left border-t border-border"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">
                  Sign out
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Members avatars strip */}
        <AnimatePresence>
          {!collapsed && members.length > 0 && !wsMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 pb-2 flex items-center gap-1.5"
            >
              <div className="flex -space-x-1.5">
                {members.slice(0, 5).map((m) => (
                  <div
                    key={m.uid}
                    title={`${m.displayName || m.email} · ${m.role}`}
                    className="ring-2 ring-sidebar rounded-full"
                  >
                    <Avatar
                      name={m.displayName || m.email}
                      photo={m.photoURL}
                      size={5}
                    />
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
              {myRole === "admin" && (
                <button
                  onClick={() => {
                    setWsMenuOpen(false);
                    navigate("/settings");
                  }}
                  className="ml-auto text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
                >
                  <UserPlus className="w-3 h-3" />
                  Invite
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-b border-sidebar-border" />
      </div>

      {/* ── NAV ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setWsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* ── COLLAPSE BUTTON ── */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.aside>
  );
}
