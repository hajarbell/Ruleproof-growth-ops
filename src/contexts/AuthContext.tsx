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
  signInWithRedirect,
  getRedirectResult,
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
  loading: boolean; // true while Firebase auth state is resolving
  wsLoading: boolean; // true while workspace data is being fetched
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
  const [loading, setLoading] = useState(true); // auth loading
  const [wsLoading, setWsLoading] = useState(true); // start true — stays true until first workspace fetch resolves

  // Holds the Firestore unsubscribe function for the live workspace listener
  const wsUnsubRef = useRef<(() => void) | null>(null);

  // ─── Subscribe to workspace with live updates ─────────────────────────────
  // Called once we know the workspaceId. Sets up onSnapshot so members list
  // and roles update in real-time across all tabs/users without a page refresh.
  const subscribeToWorkspace = (workspaceId: string, uid: string) => {
    // Unsubscribe from any previous workspace listener first
    if (wsUnsubRef.current) {
      wsUnsubRef.current();
      wsUnsubRef.current = null;
    }

    setWsLoading(true);

    const wsRef = doc(db, "workspaces", workspaceId);
    const unsub = onSnapshot(wsRef, (snap) => {
      if (!snap.exists()) {
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
        setWsLoading(false);
        return;
      }

      const wsData = snap.data();
      const ws: Workspace = { id: snap.id, ...wsData } as Workspace;

      let membersArr: WorkspaceMember[] = Array.isArray(wsData.members)
        ? wsData.members.filter((m: any) => m && typeof m === "object" && m.uid)
        : [];

      setWorkspace(ws);
      setMembers(membersArr);

      // Check if current user is still a member (handles removal case)
      const me = membersArr.find((m) => m.uid === uid);
      if (ws.ownerId === uid) {
        setMyRole("admin");
      } else if (me) {
        setMyRole(me.role);
      } else {
        // User was removed — clear workspace access
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
      }

      setWsLoading(false);
    });

    wsUnsubRef.current = unsub;
  };

  // ─── Load workspace for a user ────────────────────────────────────────────
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

    // 3. Also check: is this user a member of any workspace?
    if (!workspaceId) {
      const q = query(
        collection(db, "workspaces"),
        where("members", "array-contains", { uid } as any),
      );
      // array-contains on object doesn't work directly — skip this,
      // rely on user doc having workspaceId set during joinWorkspaceByToken
    }

    if (!workspaceId) return; // No workspace found — user needs setup

    // 4. Subscribe to live updates (replaces one-time getDoc)
    subscribeToWorkspace(workspaceId, uid);

    // 5. Bootstrap owner member if empty (one-time fix for old accounts)
    // We do this via a separate getDoc so we don't block the listener
    const wsDoc = await getDoc(doc(db, "workspaces", workspaceId));
    if (wsDoc.exists()) {
      const wsData = wsDoc.data();
      const membersArr: WorkspaceMember[] = Array.isArray(wsData.members)
        ? wsData.members.filter((m: any) => m && typeof m === "object" && m.uid)
        : [];

      if (membersArr.length === 0) {
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
        // The onSnapshot listener above will pick up this change automatically
      }
    }
  };

  // ─── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadWorkspace(u.uid, u);
      } else {
        // Logged out — clean up workspace listener and state
        if (wsUnsubRef.current) {
          wsUnsubRef.current();
          wsUnsubRef.current = null;
        }
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
        setWsLoading(false); // no user = no workspace fetch needed
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ─── Handle Google redirect result ────────────────────────────────────────
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        const u = result.user;
        await setDoc(
          doc(db, "users", u.uid),
          {
            email: u.email ?? "",
            displayName: u.displayName ?? "",
            photoURL: u.photoURL ?? "",
          },
          { merge: true },
        );
        // onAuthStateChanged will fire and call loadWorkspace automatically
      })
      .catch(() => {
        // No redirect result — normal page load
      });
  }, []);

  // ─── Google sign-in (redirect flow) ───────────────────────────────────────
  const signInWithGoogle = async (
    inviteToken?: string,
    inviteRole?: string,
  ): Promise<User | null> => {
    if (inviteToken) {
      sessionStorage.setItem("pendingInviteToken", inviteToken);
      sessionStorage.setItem("pendingInviteRole", inviteRole ?? "guest");
    }
    await signInWithRedirect(auth, new GoogleAuthProvider());
    return null; // redirect navigates away, never reached
  };

  // ─── Email sign-in ────────────────────────────────────────────────────────
  // NOTE: Do NOT call loadWorkspace here — onAuthStateChanged fires after
  // signInWithEmailAndPassword and handles workspace loading automatically.
  // Calling loadWorkspace here too creates duplicate Firestore listeners and
  // a race condition that breaks navigation/loading state.
  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged fires next and calls loadWorkspace
  };

  // ─── Email sign-up ────────────────────────────────────────────────────────
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

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    if (wsUnsubRef.current) {
      wsUnsubRef.current();
      wsUnsubRef.current = null;
    }
    await signOut(auth);
    setWorkspace(null);
    setMembers([]);
    setMyRole(null);
  };

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  // ─── Create workspace ─────────────────────────────────────────────────────
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
    // Subscribe to the new workspace for live updates
    subscribeToWorkspace(wsRef.id, user.uid);
  };

  // ─── Generate new invite token ────────────────────────────────────────────
  const generateNewInviteToken = async (): Promise<string> => {
    if (!workspace) throw new Error("No workspace");
    const newToken = generateToken();
    await updateDoc(doc(db, "workspaces", workspace.id), {
      inviteToken: newToken,
    });
    // onSnapshot picks up the change — no need to manually update state
    return newToken;
  };

  // ─── Join workspace by invite token ──────────────────────────────────────
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
    await setDoc(doc(db, "users", user.uid), { workspaceId }, { merge: true });
    subscribeToWorkspace(workspaceId, user.uid);
    return { workspaceName: wsData.name, role };
  };

  // ─── Update member role ───────────────────────────────────────────────────
  // Writes to Firestore — the onSnapshot listener updates all clients instantly
  const updateMemberRole = async (uid: string, role: MemberRole) => {
    if (!workspace) return;
    const updatedMembers = members.map((m) =>
      m.uid === uid ? { ...m, role } : m,
    );
    await updateDoc(doc(db, "workspaces", workspace.id), {
      members: updatedMembers,
    });
    // No need to setMembers manually — onSnapshot handles it
  };

  // ─── Remove member ────────────────────────────────────────────────────────
  // Removes the member object from the array AND clears their workspaceId
  // so they can't re-enter without a new invite.
  const removeMember = async (uid: string) => {
    if (!workspace) return;
    const member = members.find((m) => m.uid === uid);
    if (!member) return;

    // 1. Remove from workspace members array
    await updateDoc(doc(db, "workspaces", workspace.id), {
      members: arrayRemove(member),
    });

    // 2. Clear their workspaceId so RequireWorkspace boots them to /setup-workspace
    //    This means they truly lose access — they can't even see the app shell
    await setDoc(doc(db, "users", uid), { workspaceId: null }, { merge: true });

    // onSnapshot handles local state update
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
