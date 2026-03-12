import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  where,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type MemberRole = "admin" | "vip" | "guest";

export interface WorkspaceMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: MemberRole;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  inviteToken: string;
  members: WorkspaceMember[];
  createdAt: unknown;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  members: WorkspaceMember[];
  myRole: MemberRole | null;
  loading: boolean;
  wsLoading: boolean;
  banned: boolean;
  signInWithGoogle: (
    inviteToken?: string,
    inviteRole?: string,
  ) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (name: string) => Promise<void>;
  generateNewInviteToken: () => Promise<string>;
  joinWorkspaceByToken: (
    token: string,
    role?: MemberRole,
  ) => Promise<{ workspaceName: string; role: MemberRole }>;
  updateMemberRole: (uid: string, role: MemberRole) => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

function generateToken() {
  return (
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  );
}

// ─── Reads workspaceId regardless of capitalisation ──────────────────────────
// Firestore is case-sensitive so "workspaceId" and "workspaceID" are different
// fields. This helper checks both and returns whichever exists.
function getWorkspaceIdFromDoc(
  data: Record<string, any> | undefined,
): string | null {
  if (!data) return null;
  // Prefer lowercase (canonical), fall back to uppercase D variant
  const id = data["workspaceId"] ?? data["workspaceID"] ?? null;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsLoading, setWsLoading] = useState(false);
  const [banned, setBanned] = useState(false);

  const wsUnsubRef = useRef<(() => void) | null>(null);
  const userUnsubRef = useRef<(() => void) | null>(null);
  const popupInFlightRef = useRef(false);

  // ─── Live workspace listener ───────────────────────────────────────────────
  const subscribeToWorkspace = (workspaceId: string, uid: string) => {
    if (wsUnsubRef.current) {
      wsUnsubRef.current();
      wsUnsubRef.current = null;
    }
    setWsLoading(true);

    const unsub = onSnapshot(doc(db, "workspaces", workspaceId), (snap) => {
      if (!snap.exists()) {
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
        setWsLoading(false);
        return;
      }
      const wsData = snap.data();
      const ws: Workspace = { id: snap.id, ...wsData } as Workspace;
      const membersArr: WorkspaceMember[] = Array.isArray(wsData.members)
        ? wsData.members.filter((m: any) => m && typeof m === "object" && m.uid)
        : [];

      setWorkspace(ws);
      setMembers(membersArr);

      const me = membersArr.find((m) => m.uid === uid);

      if (ws.ownerId === uid) {
        setMyRole("admin");
      } else if (me) {
        setMyRole(me.role);
      } else {
        console.warn("User not found in members yet");
      }
      setWsLoading(false);
    });
    wsUnsubRef.current = unsub;
  };

  // ─── Live user doc listener — instant ban ─────────────────────────────────
  const subscribeToUserDoc = (uid: string) => {
    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }

    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      if (snap.data()?.banned === true) {
        setBanned(true);
        if (wsUnsubRef.current) {
          wsUnsubRef.current();
          wsUnsubRef.current = null;
        }
      }
    });
    userUnsubRef.current = unsub;
  };

  // ─── 3-pass workspace finder ───────────────────────────────────────────────
  // Pass 1: user doc (handles both workspaceId and workspaceID)
  // Pass 2: workspaces where ownerId == uid
  // Pass 3: full scan — finds any workspace with this uid in members array
  // After pass 2 or 3, writes canonical workspaceId back so pass 1 always wins.
  const findWorkspaceId = async (uid: string): Promise<string | null> => {
    // Pass 1
    const userDoc = await getDoc(doc(db, "users", uid));
    const fromDoc = getWorkspaceIdFromDoc(userDoc.data());

    if (fromDoc) {
      const ws = await getDoc(doc(db, "workspaces", fromDoc));
      if (ws.exists()) return fromDoc;
    }

    // Pass 2 — owner
    const ownerSnap = await getDocs(
      query(collection(db, "workspaces"), where("ownerId", "==", uid)),
    );
    if (!ownerSnap.empty) {
      const wsId = ownerSnap.docs[0].id;
      await setDoc(
        doc(db, "users", uid),
        { workspaceId: wsId },
        { merge: true },
      );
      return wsId;
    }

    // Pass 3 — member scan (JS-side filter because Firestore can't query nested uid)
    const allSnap = await getDocs(collection(db, "workspaces"));
    for (const d of allSnap.docs) {
      const mems: any[] = Array.isArray(d.data().members)
        ? d.data().members
        : [];
      if (mems.some((m) => m?.uid === uid)) {
        const wsId = d.id;
        await setDoc(
          doc(db, "users", uid),
          { workspaceId: wsId },
          { merge: true },
        );
        return wsId;
      }
    }

    return null;
  };

  // ─── Load workspace ────────────────────────────────────────────────────────
  const loadWorkspace = async (uid: string, currentUser?: User | null) => {
    const u = currentUser ?? user;
    setWsLoading(true);

    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.data()?.banned === true) {
        setBanned(true);
        setWsLoading(false);
        return;
      }

      const workspaceId = await findWorkspaceId(uid);
      if (!workspaceId) {
        setWsLoading(false);
        return;
      }

      // Bootstrap empty members array (one-time fix for old accounts)
      const wsDoc = await getDoc(doc(db, "workspaces", workspaceId));
      if (wsDoc.exists()) {
        const wsData = wsDoc.data();
        const mems: WorkspaceMember[] = Array.isArray(wsData.members)
          ? wsData.members.filter((m: any) => m?.uid)
          : [];
        if (mems.length === 0) {
          const ownerMember: WorkspaceMember = {
            uid,
            email: userDoc.data()?.email ?? u?.email ?? "",
            displayName: userDoc.data()?.displayName ?? u?.displayName ?? "",
            photoURL: userDoc.data()?.photoURL ?? u?.photoURL ?? "",
            role: "admin",
            joinedAt: new Date().toISOString(),
          };
          await updateDoc(doc(db, "workspaces", workspaceId), {
            members: [ownerMember],
          });
        }
      }

      subscribeToWorkspace(workspaceId, uid);
    } catch (err) {
      console.error("loadWorkspace error:", err);
      setWsLoading(false);
    }
  };

  // ─── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          // merge:true means workspaceId / banned are NEVER overwritten here
          await setDoc(
            doc(db, "users", u.uid),
            {
              email: u.email ?? "",
              displayName: u.displayName ?? "",
              photoURL: u.photoURL ?? "",
            },
            { merge: true },
          );

          subscribeToUserDoc(u.uid);
          await loadWorkspace(u.uid, u);
        } else {
          if (wsUnsubRef.current) {
            wsUnsubRef.current();
            wsUnsubRef.current = null;
          }
          if (userUnsubRef.current) {
            userUnsubRef.current();
            userUnsubRef.current = null;
          }
          setWorkspace(null);
          setMembers([]);
          setMyRole(null);
          setBanned(false);
          setWsLoading(false);
        }
      } catch (err) {
        console.error("AuthContext error:", err);
        setWsLoading(false);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ─── Google popup — guarded against double-fire ───────────────────────────
  const signInWithGoogle = async (
    inviteToken?: string,
    inviteRole?: string,
  ): Promise<User | null> => {
    if (popupInFlightRef.current) return null;
    popupInFlightRef.current = true;
    try {
      if (inviteToken) {
        sessionStorage.setItem("pendingInviteToken", inviteToken);
        sessionStorage.setItem("pendingInviteRole", inviteRole ?? "guest");
      }
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      return result.user;
    } catch (err: any) {
      if (
        err?.code !== "auth/cancelled-popup-request" &&
        err?.code !== "auth/popup-closed-by-user"
      ) {
        throw err;
      }
      return null;
    } finally {
      popupInFlightRef.current = false;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await setDoc(doc(db, "users", result.user.uid), {
      email,
      displayName: name,
      photoURL: "",
      createdAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    if (wsUnsubRef.current) {
      wsUnsubRef.current();
      wsUnsubRef.current = null;
    }
    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }
    await signOut(auth);
    setWorkspace(null);
    setMembers([]);
    setMyRole(null);
  };

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  const createWorkspace = async (name: string) => {
    if (!user) return;
    const inviteToken = generateToken();
    const ownerMember: WorkspaceMember = {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      role: "admin",
      joinedAt: new Date().toISOString(),
    };
    const wsRef = doc(collection(db, "workspaces"));
    await setDoc(wsRef, {
      name,
      ownerId: user.uid,
      inviteToken,
      members: [ownerMember],
      createdAt: serverTimestamp(),
    });
    // Always write canonical lowercase workspaceId
    await setDoc(
      doc(db, "users", user.uid),
      { workspaceId: wsRef.id },
      { merge: true },
    );
    subscribeToWorkspace(wsRef.id, user.uid);
  };

  const renameWorkspace = async (name: string) => {
    if (!workspace || !name.trim()) return;
    await updateDoc(doc(db, "workspaces", workspace.id), { name: name.trim() });
  };

  const generateNewInviteToken = async (): Promise<string> => {
    if (!workspace) throw new Error("No workspace");
    const newToken = generateToken();
    await updateDoc(doc(db, "workspaces", workspace.id), {
      inviteToken: newToken,
    });
    return newToken;
  };

  const joinWorkspaceByToken = async (
    token: string,
    invitedRole?: MemberRole,
  ): Promise<{ workspaceName: string; role: MemberRole }> => {
    if (!user) throw new Error("Not logged in");
    const snap = await getDocs(
      query(collection(db, "workspaces"), where("inviteToken", "==", token)),
    );
    if (snap.empty) throw new Error("Invalid or expired invite link.");

    const wsDoc = snap.docs[0];
    const wsData = wsDoc.data();
    const workspaceId = wsDoc.id;
    const existingMembers: WorkspaceMember[] = Array.isArray(wsData.members)
      ? wsData.members
      : [];
    const alreadyMember = existingMembers.find((m) => m.uid === user.uid);

    if (alreadyMember) {
      await setDoc(
        doc(db, "users", user.uid),
        { workspaceId, banned: false },
        { merge: true },
      );
      subscribeToWorkspace(workspaceId, user.uid);
      return { workspaceName: wsData.name, role: alreadyMember.role };
    }

    const role: MemberRole =
      wsData.ownerId === user.uid ? "admin" : (invitedRole ?? "guest");
    const newMember: WorkspaceMember = {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      role,
      joinedAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, "workspaces", workspaceId), {
      members: arrayUnion(newMember),
    });
    await setDoc(
      doc(db, "users", user.uid),
      { workspaceId, banned: false },
      { merge: true },
    );
    subscribeToWorkspace(workspaceId, user.uid);
    return { workspaceName: wsData.name, role };
  };

  const updateMemberRole = async (uid: string, role: MemberRole) => {
    if (!workspace) return;
    const updatedMembers = members.map((m) =>
      m.uid === uid ? { ...m, role } : m,
    );
    await updateDoc(doc(db, "workspaces", workspace.id), {
      members: updatedMembers,
    });
  };

  const removeMember = async (uid: string) => {
    if (!workspace) return;
    const member = members.find((m) => m.uid === uid);
    if (!member) return;
    await updateDoc(doc(db, "workspaces", workspace.id), {
      members: arrayRemove(member),
    });
    await setDoc(
      doc(db, "users", uid),
      { workspaceId: null, banned: true },
      { merge: true },
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        members,
        myRole,
        loading,
        wsLoading,
        banned,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        resetPassword,
        createWorkspace,
        renameWorkspace,
        generateNewInviteToken,
        joinWorkspaceByToken,
        updateMemberRole,
        removeMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
