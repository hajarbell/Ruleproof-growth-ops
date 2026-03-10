import { motion } from "framer-motion";
import { Megaphone, Plus, MousePointerClick, Link2, TrendingUp, Copy } from "lucide-react";
const campaigns = [
  { name: "AI Brokers Launch", url: "ruproof.ai/campaign/ai-brokers", clicks: 342, conversions: 28, sources: ["LinkedIn", "Email"], status: "Active" },
  { name: "Q1 Webinar Promo", url: "ruproof.ai/campaign/q1-webinar", clicks: 189, conversions: 15, sources: ["LinkedIn", "DM"], status: "Active" },
  { name: "Insurance Report Download", url: "ruproof.ai/campaign/insurance-report", clicks: 567, conversions: 89, sources: ["Email", "Facebook"], status: "Completed" },
];
export default function CampaignsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display text-foreground">Campaigns</h1><p className="text-muted-foreground text-sm mt-1">Create tracking links and monitor campaigns.</p></div>
        <button className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"><Plus className="w-4 h-4" />New Campaign</button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((campaign, i) => (
          <motion.div key={campaign.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-5 shadow-soft">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg gradient-primary"><Megaphone className="w-4 h-4 text-primary-foreground" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5"><Link2 className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-primary font-mono">{campaign.url}</span><button className="p-0.5 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button></div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${campaign.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{campaign.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center"><div className="flex items-center justify-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-primary" /><span className="text-lg font-bold text-foreground">{campaign.clicks}</span></div><p className="text-xs text-muted-foreground">Clicks</p></div>
              <div className="p-3 rounded-lg bg-muted/50 text-center"><div className="flex items-center justify-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-success" /><span className="text-lg font-bold text-foreground">{campaign.conversions}</span></div><p className="text-xs text-muted-foreground">Conversions</p></div>
              <div className="p-3 rounded-lg bg-muted/50"><div className="flex flex-wrap gap-1 justify-center">{campaign.sources.map(s => <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>)}</div><p className="text-xs text-muted-foreground text-center mt-1">Sources</p></div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
