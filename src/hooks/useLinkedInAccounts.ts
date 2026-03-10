import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { LinkedInAccount } from "@/pages/LinkedInPage";

export function useLinkedInAccounts() {
  const { workspace } = useAuth();
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) {
      setLoading(false);
      return;
    }
    const colRef = collection(
      db,
      "workspaces",
      workspace.id,
      "linkedinAccounts",
    );
    getDocs(colRef).then((snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LinkedInAccount[];
      setAccounts(data);
      setLoading(false);
    });
  }, [workspace?.id]);

  return { accounts, loading };
}
