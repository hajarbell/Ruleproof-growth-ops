import { motion } from "framer-motion";
import { Facebook, Users, Plus, Search } from "lucide-react";
const pages = [{ name: "RuProof AI", followers: 1240, engagement: "3.2%", recentPosts: 12 }];
const groups = [
  { name: "Insurance Tech Innovators", members: 18400, activity: "High" },
  { name: "AI for Financial Services", members: 12300, activity: "Medium" },
  { name: "Digital Marketing Brokers", members: 8900, activity: "High" },
  { name: "SaaS Growth Hackers", members: 34500, activity: "Very High" },
];
export default function FacebookPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display text-foreground">Facebook</h1><p className="text-muted-foreground text-sm mt-1">Manage pages and discover groups.</p></div>
        <button className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"><Plus className="w-4 h-4" />Connect Page</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map((page, i) => (
          <motion.div key={page.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg gradient-primary"><Facebook className="w-5 h-5 text-primary-foreground" /></div>
              <div><h3 className="font-semibold text-foreground">{page.name}</h3><p className="text-xs text-muted-foreground">Connected Page</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold text-foreground">{page.followers.toLocaleString()}</p><p className="text-xs text-muted-foreground">Followers</p></div>
              <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold text-primary">{page.engagement}</p><p className="text-xs text-muted-foreground">Engagement</p></div>
              <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold text-foreground">{page.recentPosts}</p><p className="text-xs text-muted-foreground">Posts</p></div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold font-display text-foreground">Group Discovery</h3><Search className="w-4 h-4 text-muted-foreground" /></div>
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-3"><Users className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">{group.name}</p><p className="text-xs text-muted-foreground">{group.members.toLocaleString()} members</p></div></div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${group.activity === "Very High" ? "bg-success/10 text-success" : group.activity === "High" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{group.activity}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
