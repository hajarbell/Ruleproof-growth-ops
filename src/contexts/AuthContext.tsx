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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  signInWithGoogle: () => Promise<User | null>; // ← returns User so InvitePage can pass it directly
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspace = async (uid: string, currentUser?: User | null) => {
    const u = currentUser ?? user;

    // 1. Try user doc
    const userDoc = await getDoc(doc(db, "users", uid));
    let workspaceId: string | undefined = userDoc.data()?.workspaceId;

    // 2. Fallback: find workspace where ownerId == uid
    if (!workspaceId) {
      const q = query(
        collection(db, "workspaces"),
        where("ownerId", "==", uid),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        workspaceId = snap.docs[0].id;
        await setDoc(doc(db, "users", uid), { workspaceId }, { merge: true });
      }
    }

    if (!workspaceId) return;

    const wsDoc = await getDoc(doc(db, "workspaces", workspaceId));
    if (!wsDoc.exists()) return;

    const wsData = wsDoc.data();
    const ws: Workspace = { id: wsDoc.id, ...wsData } as Workspace;

    // 3. Parse members array
    let membersArr: WorkspaceMember[] = Array.isArray(wsData.members)
      ? wsData.members.filter((m: any) => m && typeof m === "object" && m.uid)
      : [];

    // 4. Bootstrap owner if empty
    if (membersArr.length === 0) {
      const ownerMember: WorkspaceMember = {
        uid,
        email: userDoc.data()?.email ?? u?.email ?? "",
        displayName: userDoc.data()?.displayName ?? u?.displayName ?? "",
        photoURL: userDoc.data()?.photoURL ?? u?.photoURL ?? "",
        role: "admin",
        joinedAt: new Date().toISOString(),
      };
      membersArr = [ownerMember];
      await updateDoc(doc(db, "workspaces", workspaceId), {
        members: membersArr,
      });
    }

    setWorkspace(ws);
    setMembers(membersArr);
    const me = membersArr.find((m) => m.uid === uid);
    setMyRole(ws.ownerId === uid ? "admin" : (me?.role ?? "guest"));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadWorkspace(u.uid, u);
      } else {
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Returns the Firebase User so InvitePage can pass it directly to doJoin
  // without relying on stale React state
  const signInWithGoogle = async (): Promise<User | null> => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await setDoc(
      doc(db, "users", result.user.uid),
      {
        email: result.user.email ?? "",
        displayName: result.user.displayName ?? "",
        photoURL: result.user.photoURL ?? "",
      },
      { merge: true },
    );
    await loadWorkspace(result.user.uid, result.user);
    return result.user;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await loadWorkspace(result.user.uid, result.user);
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
    await setDoc(
      doc(db, "users", user.uid),
      { workspaceId: wsRef.id },
      { merge: true },
    );
    const ws: Workspace = {
      id: wsRef.id,
      name,
      ownerId: user.uid,
      inviteToken,
      members: [ownerMember],
      createdAt: null,
    };
    setWorkspace(ws);
    setMembers([ownerMember]);
    setMyRole("admin");
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
    invitedRole?: MemberRole,
  ): Promise<{ workspaceName: string; role: MemberRole }> => {
    if (!user) throw new Error("Not logged in");
    const q = query(
      collection(db, "workspaces"),
      where("inviteToken", "==", token),
    );
    const snap = await getDocs(q);
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
        { workspaceId },
        { merge: true },
      );
      await loadWorkspace(user.uid, user);
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
    await setDoc(doc(db, "users", user.uid), { workspaceId }, { merge: true });
    await loadWorkspace(user.uid, user);
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
    setMembers(updatedMembers);
  };

  const removeMember = async (uid: string) => {
    if (!workspace) return;
    const member = members.find((m) => m.uid === uid);
    if (!member) return;
    await updateDoc(doc(db, "workspaces", workspace.id), {
      members: arrayRemove(member),
    });
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
