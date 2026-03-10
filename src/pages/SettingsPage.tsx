import { motion } from "framer-motion";
import { Building2, Users, Bell, Database, Palette } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
const sections = [
  { title: "Workspace", description: "Company name, logo, and branding", icon: Building2 },
  { title: "Team", description: "Invite members, manage roles", icon: Users },
  { title: "Notifications", description: "Email and in-app notification preferences", icon: Bell },
  { title: "Data & Integrations", description: "Connected accounts, API keys, exports", icon: Database },
];
export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-bold font-display text-foreground">Settings</h1><p className="text-muted-foreground text-sm mt-1">Configure your workspace and preferences.</p></div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-lg bg-muted"><Palette className="w-5 h-5 text-muted-foreground" /></div><div><h3 className="font-semibold text-foreground">Appearance</h3><p className="text-xs text-muted-foreground">Toggle light and dark mode</p></div></div>
          <button onClick={toggleTheme} className="px-4 py-2 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-accent transition-colors">{theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}</button>
        </div>
      </motion.div>
      <div className="space-y-3">
        {sections.map((section, i) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-5 shadow-soft hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-3"><div className="p-2.5 rounded-lg bg-muted"><section.icon className="w-5 h-5 text-muted-foreground" /></div><div><h3 className="font-semibold text-foreground">{section.title}</h3><p className="text-xs text-muted-foreground">{section.description}</p></div></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
