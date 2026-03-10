import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { LinkedInAccount } from "@/pages/LinkedInPage";

/**
 * useLinkedInAccounts
 * Fetches LinkedIn accounts for the current workspace.
 * Use this in ContentStudio to populate the account picker.
 *
 * Usage:
 *   const { accounts, loading } = useLinkedInAccounts();
 */
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
      setAccounts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as LinkedInAccount[],
      );
      setLoading(false);
    });
  }, [workspace?.id]);

  return { accounts, loading };
}
