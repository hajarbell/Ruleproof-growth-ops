import { motion } from "framer-motion";
import { Plus, Link2, Image, StickyNote, GripVertical } from "lucide-react";
const ideaCards = [
  { title: "Hook: 'Most brokers waste 80% of their leads'", category: "Post Idea", color: "from-primary to-primary/70" },
  { title: "Competitor analysis: InsurTech comparison", category: "Research", color: "from-warning to-warning/70" },
  { title: "Video series: Day in the life of AI broker", category: "Campaign Idea", color: "from-success to-success/70" },
  { title: "Carousel: 5 steps to automate lead gen", category: "Post Idea", color: "from-primary to-primary/70" },
  { title: "Podcast guest outreach strategy", category: "Campaign Idea", color: "from-success to-success/70" },
  { title: "Infographic: Insurance market 2026", category: "Visual", color: "from-destructive to-destructive/70" },
];
const boards = ["Post Ideas", "Campaign Ideas", "Hooks & Angles", "Competitor Intel"];
export default function IdeasLabPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display text-foreground">Ideas Lab</h1><p className="text-muted-foreground text-sm mt-1">Brain dump, mind map, and organize creative ideas.</p></div>
        <button className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"><Plus className="w-4 h-4" />New Idea</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {boards.map((board, i) => <button key={board} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${i === 0 ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>{board}</button>)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideaCards.map((idea, i) => (
          <motion.div key={idea.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-4 shadow-soft hover:border-primary/30 transition-colors cursor-grab group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${idea.color}`} />
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-sm font-medium text-foreground mb-2">{idea.title}</h4>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{idea.category}</span>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Link2 className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Image className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 rounded text-muted-foreground hover:bg-muted"><StickyNote className="w-3.5 h-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
