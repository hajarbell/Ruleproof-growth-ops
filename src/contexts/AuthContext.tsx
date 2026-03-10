import {
  createContext,
  useContext,
  useEffect,
  useState,
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
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────
export type MemberRole = "admin" | "guest";

export interface WorkspaceMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: MemberRole;
  joinedAt: unknown;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  inviteToken: string;
  createdAt: unknown;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  members: WorkspaceMember[];
  myRole: MemberRole | null;
  loading: boolean;
  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Workspace actions
  createWorkspace: (name: string) => Promise<void>;
  generateNewInviteToken: () => Promise<string>;
  joinWorkspaceByToken: (
    token: string,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Load workspace + members for a user ──
  const loadWorkspace = async (uid: string) => {
    // Check if user is a member of any workspace
    const userDoc = await getDoc(doc(db, "users", uid));
    const workspaceId = userDoc.data()?.workspaceId;
    if (!workspaceId) return;

    const wsDoc = await getDoc(doc(db, "workspaces", workspaceId));
    if (!wsDoc.exists()) return;

    const ws = { id: wsDoc.id, ...wsDoc.data() } as Workspace;
    setWorkspace(ws);

    // Load members
    const membersSnap = await getDocs(
      collection(db, "workspaces", workspaceId, "members"),
    );
    const membersData = membersSnap.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    })) as WorkspaceMember[];
    setMembers(membersData);

    // Find my role
    const me = membersData.find((m) => m.uid === uid);
    setMyRole(me?.role ?? "guest");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadWorkspace(u.uid);
      } else {
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Auth actions ──
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await loadWorkspace(result.user.uid);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await loadWorkspace(result.user.uid);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    // Create user doc (no workspace yet)
    await setDoc(doc(db, "users", result.user.uid), {
      email,
      displayName: name,
      photoURL: "",
      createdAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    await signOut(auth);
    setWorkspace(null);
    setMembers([]);
    setMyRole(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // ── Workspace actions ──
  const createWorkspace = async (name: string) => {
    if (!user) return;
    const inviteToken = generateToken();
    const wsRef = doc(collection(db, "workspaces"));
    await setDoc(wsRef, {
      name,
      ownerId: user.uid,
      inviteToken,
      createdAt: serverTimestamp(),
    });

    // Add owner as admin member
    await setDoc(doc(db, "workspaces", wsRef.id, "members", user.uid), {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      role: "admin" as MemberRole,
      joinedAt: serverTimestamp(),
    });

    // Save workspaceId to user doc
    await setDoc(
      doc(db, "users", user.uid),
      {
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? "",
        workspaceId: wsRef.id,
      },
      { merge: true },
    );

    const ws: Workspace = {
      id: wsRef.id,
      name,
      ownerId: user.uid,
      inviteToken,
      createdAt: null,
    };
    setWorkspace(ws);
    setMyRole("admin");
    setMembers([
      {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? "",
        role: "admin",
        joinedAt: null,
      },
    ]);
  };

  const generateNewInviteToken = async (): Promise<string> => {
    if (!workspace) throw new Error("No workspace");
    const newToken = generateToken();
    await updateDoc(doc(db, "workspaces", workspace.id), {
      inviteToken: newToken,
    });
    setWorkspace((w) => (w ? { ...w, inviteToken: newToken } : w));
    return newToken;
  };

  const joinWorkspaceByToken = async (
    token: string,
  ): Promise<{ workspaceName: string; role: MemberRole }> => {
    if (!user) throw new Error("Not logged in");

    // Find workspace by invite token
    const wsQuery = query(
      collection(db, "workspaces"),
      where("inviteToken", "==", token),
    );
    const snap = await getDocs(wsQuery);
    if (snap.empty) throw new Error("Invalid invite link");

    const wsDoc = snap.docs[0];
    const wsData = wsDoc.data();
    const workspaceId = wsDoc.id;

    // Check if already a member
    const existingMember = await getDoc(
      doc(db, "workspaces", workspaceId, "members", user.uid),
    );
    const role: MemberRole = wsData.ownerId === user.uid ? "admin" : "guest";

    if (!existingMember.exists()) {
      // Add as guest member
      await setDoc(doc(db, "workspaces", workspaceId, "members", user.uid), {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? "",
        role,
        joinedAt: serverTimestamp(),
      });
    }

    // Save workspaceId to user
    await setDoc(
      doc(db, "users", user.uid),
      {
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? "",
        workspaceId,
      },
      { merge: true },
    );

    await loadWorkspace(user.uid);
    return { workspaceName: wsData.name, role };
  };

  const updateMemberRole = async (uid: string, role: MemberRole) => {
    if (!workspace) return;
    await updateDoc(doc(db, "workspaces", workspace.id, "members", uid), {
      role,
    });
    setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, role } : m)));
  };

  const removeMember = async (uid: string) => {
    if (!workspace) return;
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "workspaces", workspace.id, "members", uid));
    setMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        members,
        myRole,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        resetPassword,
        createWorkspace,
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
