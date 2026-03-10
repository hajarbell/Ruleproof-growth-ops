import { UserSearch, Mail, MessageSquare, Linkedin, TrendingUp, MousePointerClick, Plus, PenTool } from "lucide-react";
import { motion } from "framer-motion";

function StatCard({ title, value, subtitle, icon: Icon, gradient }: { title: string; value: string | number; subtitle: string; icon: React.ElementType; gradient?: boolean }) {
  return (
    <div className={`glass rounded-xl p-4 shadow-soft ${gradient ? "border-primary/20" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className={`p-1.5 rounded-lg ${gradient ? "gradient-primary" : "bg-muted"}`}>
          <Icon className={`w-3.5 h-3.5 ${gradient ? "text-primary-foreground" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground font-display">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

const recentLeads = [
  { name: "Sarah Chen", company: "TechVault", source: "LinkedIn", time: "5 min ago" },
  { name: "Marcus Brown", company: "Finova AI", source: "Scraper", time: "22 min ago" },
  { name: "Elena Rossi", company: "DataPulse", source: "Campaign", time: "1 hour ago" },
  { name: "James Okafor", company: "NexGen", source: "LinkedIn", time: "2 hours ago" },
];

const recentPosts = [
  { title: "5 AI Trends for Insurance", platform: "LinkedIn", engagement: 342, time: "Today" },
  { title: "Why Brokers Need Automation", platform: "LinkedIn", engagement: 218, time: "Yesterday" },
  { title: "RuProof Case Study Launch", platform: "Facebook", engagement: 156, time: "2 days ago" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Growth Command Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Marketing performance across all channels.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="New Leads" value={48} subtitle="+12 today" icon={UserSearch} gradient />
        <StatCard title="Emails Sent" value={312} subtitle="This week" icon={Mail} />
        <StatCard title="Replies" value={67} subtitle="21.5% rate" icon={MessageSquare} />
        <StatCard title="LI Engagements" value="1.2K" subtitle="+18% vs last week" icon={Linkedin} />
        <StatCard title="Follower Growth" value="+340" subtitle="This month" icon={TrendingUp} />
        <StatCard title="Campaign Clicks" value={891} subtitle="3 active campaigns" icon={MousePointerClick} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 shadow-soft">
          <h3 className="font-semibold font-display text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "New Lead", Icon: Plus }, { label: "Create Post", Icon: PenTool }, { label: "LI Analytics", Icon: TrendingUp }, { label: "Run Scraper", Icon: MousePointerClick }].map(({ label, Icon }) => (
              <button key={label} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted hover:bg-accent transition-colors group">
                <div className="p-2 rounded-lg gradient-primary text-primary-foreground"><Icon className="w-4 h-4" /></div>
                <span className="text-xs font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-display text-foreground">Recent Leads</h3>
            <UserSearch className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div key={lead.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.company} · {lead.time}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{lead.source}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-display text-foreground">Recent Posts</h3>
            <PenTool className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div key={post.title} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{post.platform}</span>
                  <span className="text-xs text-primary font-medium">{post.engagement} engagements</span>
                  <span className="text-xs text-muted-foreground ml-auto">{post.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
