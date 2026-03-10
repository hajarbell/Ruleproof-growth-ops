import { motion } from "framer-motion";
import { Upload, Image, FileText, File } from "lucide-react";
const folders = [{ name: "Campaign Assets", files: 24, icon: Image }, { name: "Templates", files: 8, icon: FileText }, { name: "Brand Guidelines", files: 5, icon: File }, { name: "Reports", files: 12, icon: FileText }];
const recentFiles = [
  { name: "LinkedIn Banner v3.png", type: "Image", size: "1.8 MB", date: "Today" },
  { name: "Q1 Growth Report.pdf", type: "PDF", size: "3.2 MB", date: "Yesterday" },
  { name: "Email Template.html", type: "Document", size: "24 KB", date: "Mar 6" },
  { name: "Logo Pack.zip", type: "Archive", size: "12 MB", date: "Mar 5" },
];
export default function FilesPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display text-foreground">Files & Assets</h1><p className="text-muted-foreground text-sm mt-1">Central library for all marketing assets.</p></div>
        <button className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"><Upload className="w-4 h-4" />Upload</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {folders.map((folder, i) => (
          <motion.div key={folder.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-4 shadow-soft hover:border-primary/30 transition-colors cursor-pointer group text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10 transition-colors"><folder.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /></div>
            <p className="text-sm font-medium text-foreground">{folder.name}</p>
            <p className="text-xs text-muted-foreground">{folder.files} files</p>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-5 shadow-soft">
        <h3 className="font-semibold font-display text-foreground mb-4">Recent Files</h3>
        <div className="space-y-2">
          {recentFiles.map((file) => (
            <div key={file.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div><p className="text-sm font-medium text-foreground">{file.name}</p><p className="text-xs text-muted-foreground">{file.type} · {file.size}</p></div>
              <span className="text-xs text-muted-foreground">{file.date}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
