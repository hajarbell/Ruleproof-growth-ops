import { motion } from "framer-motion";
const activities = [
  { icon: "🔗", text: "LinkedIn scraper completed: 142 leads from AI Trends post", time: "2 hours ago" },
  { icon: "📝", text: "New post scheduled: '5 LinkedIn hacks for B2B founders'", time: "3 hours ago" },
  { icon: "👤", text: "New lead added: Sarah Chen from TechVault", time: "5 hours ago" },
  { icon: "📊", text: "Campaign 'AI Brokers Launch' reached 300 clicks", time: "6 hours ago" },
  { icon: "✅", text: "Lead stage updated: Elena Rossi → Call Booked", time: "Yesterday" },
  { icon: "📁", text: "File uploaded: LinkedIn Banner v3.png", time: "Yesterday" },
  { icon: "🚀", text: "Campaign created: Q1 Webinar Promo", time: "2 days ago" },
  { icon: "💡", text: "New idea added: Podcast guest outreach strategy", time: "2 days ago" },
];
export default function ActivityPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-bold font-display text-foreground">Activity</h1><p className="text-muted-foreground text-sm mt-1">Everything happening across the platform.</p></div>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-1">
          {activities.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-4 pl-8 relative py-3">
              <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-card border-2 border-primary" />
              <span className="text-lg">{item.icon}</span>
              <div><p className="text-sm text-foreground">{item.text}</p><p className="text-xs text-muted-foreground mt-0.5">{item.time}</p></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
