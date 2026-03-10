import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export interface Workspace {
  id: string;
  name: string;
  type: "personal" | "agency";
  ownerId: string;
  members: string[];
  createdAt: unknown;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  loading: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createWorkspace: (name: string, type: "personal" | "agency") => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const fetchWorkspace = async (uid: string): Promise<Workspace | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) return null;
      const workspaceId = userDoc.data()?.workspaceId;
      if (!workspaceId) return null;
      const wsDoc = await getDoc(doc(db, "workspaces", workspaceId));
      if (!wsDoc.exists()) return null;
      return { id: wsDoc.id, ...wsDoc.data() } as Workspace;
    } catch (err) {
      console.error("fetchWorkspace error:", err);
      return null;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ws = await fetchWorkspace(firebaseUser.uid);
        setWorkspace(ws);
      } else {
        setWorkspace(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          workspaceId: null,
          createdAt: serverTimestamp(),
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    setAuthLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(result.user, { displayName });
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email,
        displayName,
        photoURL: null,
        workspaceId: null,
        createdAt: serverTimestamp(),
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setWorkspace(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const createWorkspace = async (name: string, type: "personal" | "agency") => {
    if (!user) throw new Error("Not authenticated");
    setAuthLoading(true);
    try {
      const workspaceId = `ws_${user.uid}_${Date.now()}`;
      const workspaceData = {
        name,
        type,
        ownerId: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "workspaces", workspaceId), workspaceData);
      await setDoc(
        doc(db, "users", user.uid),
        { workspaceId },
        { merge: true },
      );
      setWorkspace({ id: workspaceId, ...workspaceData });
    } finally {
      setAuthLoading(false);
    }
  };

  const refreshWorkspace = async () => {
    if (!user) return;
    const ws = await fetchWorkspace(user.uid);
    setWorkspace(ws);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        loading,
        authLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
        resetPassword,
        createWorkspace,
        refreshWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
