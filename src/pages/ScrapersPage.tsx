import { motion } from "framer-motion";
import { Linkedin, Facebook, Globe, Building2, Play, Clock, CheckCircle2 } from "lucide-react";
const scraperTypes = [
  { name: "LinkedIn Post Scraper", icon: Linkedin, description: "Scrape engagers from any LinkedIn post", status: "ready" },
  { name: "Facebook Group Finder", icon: Facebook, description: "Find groups by keyword", status: "ready" },
  { name: "Website Scraper", icon: Globe, description: "Extract data from any website", status: "ready" },
  { name: "Broker Directory", icon: Building2, description: "Scrape broker directories", status: "coming" },
];
const recentJobs = [
  { name: "LI Post: AI Insurance Trends", type: "LinkedIn", results: 142, status: "completed", date: "2 hours ago" },
  { name: "Groups: Insurance Tech", type: "Facebook", results: 28, status: "completed", date: "5 hours ago" },
  { name: "LI Post: Growth Playbook", type: "LinkedIn", results: 89, status: "running", date: "Just now" },
];
export default function ScrapersPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-2xl font-bold font-display text-foreground">Scrapers</h1><p className="text-muted-foreground text-sm mt-1">Launch scraping jobs and collect lead data.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scraperTypes.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass rounded-xl p-5 shadow-soft text-center ${s.status === "coming" ? "opacity-60" : "hover:border-primary/30 cursor-pointer"} transition-colors`}>
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3"><s.icon className="w-6 h-6 text-primary-foreground" /></div>
            <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
            {s.status === "coming" && <span className="text-xs text-muted-foreground mt-2 inline-block">Coming soon</span>}
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-5 shadow-soft">
        <h3 className="font-semibold font-display text-foreground mb-3">LinkedIn Lead Generator</h3>
        <p className="text-xs text-muted-foreground mb-4">Paste a LinkedIn post URL to scrape engagers.</p>
        <div className="flex gap-3">
          <input type="url" placeholder="https://linkedin.com/posts/..." className="flex-1 rounded-lg bg-muted/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90"><Play className="w-4 h-4" />Scrape</button>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5 shadow-soft">
        <h3 className="font-semibold font-display text-foreground mb-4">Recent Jobs</h3>
        <div className="space-y-2">
          {recentJobs.map((job) => (
            <div key={job.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                {job.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-primary animate-pulse" />}
                <div><p className="text-sm font-medium text-foreground">{job.name}</p><p className="text-xs text-muted-foreground">{job.type} · {job.date}</p></div>
              </div>
              <span className="text-sm font-semibold text-foreground">{job.results} leads</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
