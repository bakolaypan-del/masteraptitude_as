export class FirebaseError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'FirebaseError';
  }
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerId: string;
  getIdToken: () => Promise<string>;
}

class MockAuth {
  public currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    const token = localStorage.getItem('ma_auth_token');
    if (!token) {
      this.currentUser = null;
      this.triggerListeners();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        this.currentUser = {
          uid: data.uid,
          email: data.email || null,
          displayName: data.name || null,
          phoneNumber: data.phoneNumber || null,
          emailVerified: true,
          isAnonymous: false,
          providerId: 'password',
          getIdToken: async () => localStorage.getItem('ma_auth_token') || ""
        };
      } else {
        localStorage.removeItem('ma_auth_token');
        this.currentUser = null;
      }
    } catch (e) {
      console.error("[MockAuth] Initialization failed:", e);
      this.currentUser = null;
    }
    this.triggerListeners();
  }

  public triggerListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  onAuthStateChanged(cb: (user: User | null) => void) {
    this.listeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  async signInWithEmailAndPassword(email: string, pass: string): Promise<{ user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new FirebaseError('auth/invalid-credential', err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('ma_auth_token', data.token);
    this.currentUser = {
      uid: data.user.uid,
      email: data.user.email || null,
      displayName: data.user.name || null,
      phoneNumber: data.user.phoneNumber || null,
      emailVerified: true,
      isAnonymous: false,
      providerId: 'password',
      getIdToken: async () => data.token
    };
    this.triggerListeners();
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email: string, pass: string): Promise<{ user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new FirebaseError('auth/email-already-in-use', err.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('ma_auth_token', data.token);
    this.currentUser = {
      uid: data.user.uid,
      email: data.user.email || null,
      displayName: data.user.name || null,
      phoneNumber: data.user.phoneNumber || null,
      emailVerified: true,
      isAnonymous: false,
      providerId: 'password',
      getIdToken: async () => data.token
    };
    this.triggerListeners();
    return { user: this.currentUser };
  }

  async signOut(): Promise<void> {
    localStorage.removeItem('ma_auth_token');
    localStorage.removeItem('ma_profile');
    localStorage.removeItem('ma_profile_ts');
    this.currentUser = null;
    this.triggerListeners();
  }
}

export const auth = new MockAuth();

export function getAuth() {
  return auth;
}

export function onAuthStateChanged(authInstance: MockAuth, cb: (user: User | null) => void) {
  return authInstance.onAuthStateChanged(cb);
}

export async function signInWithEmailAndPassword(authInstance: MockAuth, email: string, pass: string) {
  return authInstance.signInWithEmailAndPassword(email, pass);
}

export async function createUserWithEmailAndPassword(authInstance: MockAuth, email: string, pass: string) {
  return authInstance.createUserWithEmailAndPassword(email, pass);
}

export async function signOut(authInstance: MockAuth) {
  return authInstance.signOut();
}

export class GoogleAuthProvider {
  // Mock Google Provider (unused in our login routes)
}
