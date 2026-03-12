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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsLoading, setWsLoading] = useState(false);
  const [banned, setBanned] = useState(false);

  const wsUnsubRef = useRef<(() => void) | null>(null);
  // Separate listener for the user's own doc — detects real-time ban
  const userUnsubRef = useRef<(() => void) | null>(null);

  // ─── Subscribe to workspace doc (live) ────────────────────────────────────
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
        // Member was removed from workspace array — clear state immediately
        // ProtectedRoute will redirect them to the banned/removed screen
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
      }
      setWsLoading(false);
    });

    wsUnsubRef.current = unsub;
  };

  // ─── Subscribe to user's own doc (live) ───────────────────────────────────
  // This is what enables INSTANT kick when banned — no page refresh needed.
  // When owner sets banned:true, this listener fires immediately on the
  // deleted member's client and sets banned:true in state.
  // ProtectedRoute then renders the removed screen right away.
  const subscribeToUserDoc = (uid: string) => {
    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }

    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data?.banned === true) {
        setBanned(true);
        // Clear all workspace state instantly
        if (wsUnsubRef.current) {
          wsUnsubRef.current();
          wsUnsubRef.current = null;
        }
        setWorkspace(null);
        setMembers([]);
        setMyRole(null);
      }
    });

    userUnsubRef.current = unsub;
  };

  // ─── Load workspace for a user ────────────────────────────────────────────
  // FIX: Every early-return path now calls setWsLoading(false) so the app
  // never gets stuck on the loading screen after login.
  const loadWorkspace = async (uid: string, currentUser?: User | null) => {
    const u = currentUser ?? user;
    setWsLoading(true);

    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      const userData = userDoc.data();

      // Banned check
      if (userData?.banned === true) {
        setBanned(true);
        setWsLoading(false);
        return;
      }

      let workspaceId: string | undefined = userData?.workspaceId;

      // Fallback: find workspace where ownerId == uid
      if (!workspaceId) {
        const q = query(
          collection(db, "workspaces"),
          where("ownerId", "==", uid),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          workspaceId = snap.docs[0].id;
          // Save it back so we find it instantly next login
          await setDoc(doc(db, "users", uid), { workspaceId }, { merge: true });
        }
      }

      if (!workspaceId) {
        // No workspace — user needs to create one
        setWsLoading(false);
        return;
      }

      // Bootstrap empty members array (one-time fix for old accounts)
      const wsDoc = await getDoc(doc(db, "workspaces", workspaceId));
      if (wsDoc.exists()) {
        const wsData = wsDoc.data();
        const membersArr: WorkspaceMember[] = Array.isArray(wsData.members)
          ? wsData.members.filter(
              (m: any) => m && typeof m === "object" && m.uid,
            )
          : [];
        if (membersArr.length === 0) {
          const ownerMember: WorkspaceMember = {
            uid,
            email: userData?.email ?? u?.email ?? "",
            displayName: userData?.displayName ?? u?.displayName ?? "",
            photoURL: userData?.photoURL ?? u?.photoURL ?? "",
            role: "admin",
            joinedAt: new Date().toISOString(),
          };
          await updateDoc(doc(db, "workspaces", workspaceId), {
            members: [ownerMember],
          });
        }
      }

      // Start live listener — this sets wsLoading false when data arrives
      subscribeToWorkspace(workspaceId, uid);
    } catch (err) {
      console.error("loadWorkspace error", err);
      setWsLoading(false);
    }
  };

  // ─── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          // Merge-safe: only updates profile fields, never touches workspaceId
          await setDoc(
            doc(db, "users", u.uid),
            {
              email: u.email ?? "",
              displayName: u.displayName ?? "",
              photoURL: u.photoURL ?? "",
            },
            { merge: true },
          );

          // Start listening to user doc for instant ban detection
          subscribeToUserDoc(u.uid);

          await loadWorkspace(u.uid, u);
        } else {
          // Logged out — tear down all listeners
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
        console.error("AuthContext error", err);
        setWsLoading(false);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ─── Google sign-in (popup) ────────────────────────────────────────────────
  const signInWithGoogle = async (
    inviteToken?: string,
    inviteRole?: string,
  ): Promise<User | null> => {
    if (inviteToken) {
      sessionStorage.setItem("pendingInviteToken", inviteToken);
      sessionStorage.setItem("pendingInviteRole", inviteRole ?? "guest");
    }
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return result.user;
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

  // ─── Remove member — instant kick via user doc listener ───────────────────
  // Sets banned:true on the user's doc. Their onSnapshot listener (subscribeToUserDoc)
  // fires immediately on their client — no page refresh needed. They see the
  // "Access Removed" screen within milliseconds.
  const removeMember = async (uid: string) => {
    if (!workspace) return;
    const member = members.find((m) => m.uid === uid);
    if (!member) return;

    // Remove from workspace members array
    await updateDoc(doc(db, "workspaces", workspace.id), {
      members: arrayRemove(member),
    });

    // Set banned:true — their live user doc listener fires this instantly
    await setDoc(
      doc(db, "users", uid),
      {
        workspaceId: null,
        banned: true,
      },
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
