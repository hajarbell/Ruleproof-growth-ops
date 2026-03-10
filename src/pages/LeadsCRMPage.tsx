import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
const stages = ["All", "Lead", "Contacted", "Replied", "Call Booked", "Client", "Lost"] as const;
const leads = [
  { name: "Sarah Chen", company: "TechVault", email: "sarah@techvault.io", country: "US", source: "LinkedIn", stage: "Replied", lastInteraction: "2 hours ago" },
  { name: "Marcus Brown", company: "Finova AI", email: "marcus@finova.ai", country: "UK", source: "Scraper", stage: "Lead", lastInteraction: "5 hours ago" },
  { name: "Elena Rossi", company: "DataPulse", email: "elena@datapulse.com", country: "Italy", source: "Campaign", stage: "Call Booked", lastInteraction: "Yesterday" },
  { name: "James Okafor", company: "NexGen", email: "james@nexgen.co", country: "Nigeria", source: "LinkedIn", stage: "Contacted", lastInteraction: "2 days ago" },
  { name: "Priya Sharma", company: "InsureFlow", email: "priya@insureflow.in", country: "India", source: "Scraper", stage: "Client", lastInteraction: "3 days ago" },
  { name: "Tom Miller", company: "BrokerEdge", email: "tom@brokeredge.com", country: "US", source: "Campaign", stage: "Lost", lastInteraction: "1 week ago" },
];
const stageColors: Record<string, string> = {
  Lead: "bg-muted text-muted-foreground", Contacted: "bg-primary/10 text-primary",
  Replied: "bg-warning/10 text-warning", "Call Booked": "bg-success/10 text-success",
  Client: "bg-success/20 text-success", Lost: "bg-destructive/10 text-destructive",
};
export default function LeadsCRMPage() {
  const [activeStage, setActiveStage] = useState<string>("All");
  const filtered = activeStage === "All" ? leads : leads.filter(l => l.stage === activeStage);
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display text-foreground">Leads CRM</h1><p className="text-muted-foreground text-sm mt-1">Manage and track all leads across sources.</p></div>
        <button className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"><Plus className="w-4 h-4" />Add Lead</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {stages.map((stage) => (
          <button key={stage} onClick={() => setActiveStage(stage)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeStage === stage ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>{stage}</button>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left">
            {["Name","Company","Email","Country","Source","Stage","Last Interaction"].map(h => <th key={h} className="pb-3 text-muted-foreground font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.email} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="py-3 font-medium text-foreground">{lead.name}</td>
                <td className="py-3 text-muted-foreground">{lead.company}</td>
                <td className="py-3 text-muted-foreground">{lead.email}</td>
                <td className="py-3 text-muted-foreground">{lead.country}</td>
                <td className="py-3"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{lead.source}</span></td>
                <td className="py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${stageColors[lead.stage]}`}>{lead.stage}</span></td>
                <td className="py-3 text-muted-foreground">{lead.lastInteraction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
