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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const adminNav = [
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

// Guest: no Scrapers, Leads, Campaigns, Activity
const guestNav = adminNav.filter(
  (i) => !["/scrapers", "/leads", "/campaigns", "/activity"].includes(i.path),
);

function MemberAvatar({
  name,
  photo,
  size = 6,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover border-2 border-sidebar flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0 border-2 border-sidebar`}
      style={{ fontSize: size < 8 ? "9px" : "11px" }}
    >
      {initials}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, workspace, members, myRole, logout } = useAuth();

  const navItems = myRole === "admin" ? adminNav : guestNav;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "You";
  const photoURL = user?.photoURL || "";

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 252 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar z-30 overflow-hidden"
    >
      {/* ── Workspace header ── */}
      <div className="border-b border-sidebar-border flex-shrink-0">
        <div
          className={`flex items-center gap-2.5 px-3 py-3 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">R</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="font-bold text-sm font-display gradient-text leading-tight truncate">
                  {workspace?.name || "RuProof"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Growth OS
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Members strip */}
        <AnimatePresence>
          {!collapsed && members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-2.5 flex items-center gap-1.5 overflow-hidden"
            >
              <div className="flex -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <div key={m.uid} title={`${m.displayName} (${m.role})`}>
                    <MemberAvatar
                      name={m.displayName || m.email}
                      photo={m.photoURL}
                      size={6}
                    />
                  </div>
                ))}
                {members.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-sidebar flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                    +{members.length - 4}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground ml-1">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
              {myRole === "admin" && (
                <button
                  onClick={() => navigate("/settings")}
                  className="ml-auto text-[10px] text-primary hover:underline font-medium"
                >
                  Invite
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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

      {/* ── User footer ── */}
      <div className="border-t border-sidebar-border flex-shrink-0 p-2 space-y-1">
        {/* User card */}
        <div className="relative">
          <button
            onClick={() => !collapsed && setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group ${collapsed ? "justify-center" : ""}`}
          >
            <MemberAvatar name={displayName} photo={photoURL} size={7} />
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {myRole ?? "member"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          {/* User dropdown */}
          <AnimatePresence>
            {showUserMenu && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-soft overflow-hidden z-50"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.email}
                  </p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${myRole === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {myRole}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
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
