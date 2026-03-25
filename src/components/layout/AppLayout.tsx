import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/CommandPalette";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const [commandOpen, setCommandOpen] = useState(false);
  const { workspace } = useAuth();

  // Expose workspace ID on window so the Star extension can auto-detect it
  // without the user needing to manually paste anything.
  useEffect(() => {
    if (workspace?.id) {
      (window as any).__ruproof_workspace_id = workspace.id;
    } else {
      delete (window as any).__ruproof_workspace_id;
    }
  }, [workspace?.id]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenCommand={() => setCommandOpen(true)} />
        <main className="flex-1 p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
