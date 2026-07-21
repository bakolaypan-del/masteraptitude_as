import { auth } from './firebase';

async function getAuthToken(): Promise<string> {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("[mockFirestore] Failed to get user auth token:", e);
    }
  }
  return '';
}

// Mock Firestore Classes
export class DocumentReference {
  constructor(public firestore: any, public path: string, public id: string) {}
}

export class CollectionReference {
  constructor(public firestore: any, public path: string) {}
}

export class Query {
  public clauses: any[] = [];
  constructor(public ref: CollectionReference) {}
}

export class DocumentSnapshot {
  constructor(public id: string, private _data: any, private _exists: boolean) {}
  exists() {
    return this._exists;
  }
  data() {
    return this._data;
  }
}

export class QueryDocumentSnapshot {
  constructor(public id: string, private _data: any) {}
  exists() {
    return true;
  }
  data() {
    return this._data;
  }
}

export class QuerySnapshot {
  public docs: QueryDocumentSnapshot[] = [];
  constructor(docsData: { id: string; data: any }[]) {
    this.docs = (docsData || []).map(d => new QueryDocumentSnapshot(d.id, d.data));
  }
  get empty() {
    return this.docs.length === 0;
  }
  get size() {
    return this.docs.length;
  }
  forEach(callback: (doc: QueryDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// Mock Firestore Web SDK functions
export function getFirestore(app: any, databaseId?: string) {
  return { app, databaseId };
}

export function collection(db: any, path: string) {
  return new CollectionReference(db, path);
}

export function doc(db: any, collectionOrPath: string | CollectionReference, ...args: string[]) {
  let colPath = typeof collectionOrPath === 'string' ? collectionOrPath : collectionOrPath.path;
  let id = '';
  
  if (args.length > 0) {
    id = args[args.length - 1];
    // Reconstruct nested path if needed
    for (let i = 0; i < args.length - 1; i++) {
      colPath += '/' + args[i];
    }
  } else {
    // Generate a random ID (matching Firestore behaviour for doc(collectionRef))
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  return new DocumentReference(db, colPath, id);
}

export function query(ref: CollectionReference, ...clauses: any[]) {
  const q = new Query(ref);
  q.clauses = clauses;
  return q;
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(lim: number) {
  return { type: 'limit', limit: lim };
}

export function increment(n: number) {
  return { __type: 'increment', value: n };
}

export function serverTimestamp() {
  return { __type: 'serverTimestamp' };
}

// Client-to-Server API Requests
export async function getDoc(docRef: DocumentReference): Promise<DocumentSnapshot> {
  const token = await getAuthToken();
  const res = await fetch('/api/mock-firestore/getDoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: docRef.path,
      id: docRef.id
    })
  });
  if (!res.ok) throw new Error("Failed to fetch document");
  const result = await res.json();
  return new DocumentSnapshot(docRef.id, result.data, result.exists);
}

export async function getDocs(queryRef: CollectionReference | Query): Promise<QuerySnapshot> {
  const token = await getAuthToken();
  const path = queryRef instanceof CollectionReference ? queryRef.path : queryRef.ref.path;
  const clauses = queryRef instanceof Query ? queryRef.clauses : [];
  
  const res = await fetch('/api/mock-firestore/getDocs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ path, clauses })
  });
  if (!res.ok) throw new Error("Failed to fetch documents query");
  const result = await res.json();
  return new QuerySnapshot(result.docs);
}

export async function setDoc(docRef: DocumentReference, data: any, options?: { merge?: boolean }): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch('/api/mock-firestore/setDoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: docRef.path,
      id: docRef.id,
      data,
      merge: options?.merge ?? false
    })
  });
  if (!res.ok) throw new Error("Failed to set document");
}

export async function updateDoc(docRef: DocumentReference, data: any): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch('/api/mock-firestore/updateDoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: docRef.path,
      id: docRef.id,
      data
    })
  });
  if (!res.ok) throw new Error("Failed to update document");
}

export async function addDoc(colRef: CollectionReference, data: any): Promise<DocumentReference> {
  const token = await getAuthToken();
  const res = await fetch('/api/mock-firestore/addDoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: colRef.path,
      data
    })
  });
  if (!res.ok) throw new Error("Failed to add document");
  const result = await res.json();
  return new DocumentReference(colRef.firestore, colRef.path, result.id);
}

export async function deleteDoc(docRef: DocumentReference): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch('/api/mock-firestore/deleteDoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: docRef.path,
      id: docRef.id
    })
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

// Simulates onSnapshot (real-time listener) with a one-shot fetch for compatibility
export function onSnapshot(
  ref: DocumentReference | CollectionReference | Query,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  // Execute standard fetch immediately
  if (ref instanceof DocumentReference) {
    getDoc(ref).then(onNext).catch(onError);
  } else {
    getDocs(ref).then(onNext).catch(onError);
  }
  
  // Return dummy unsubscribe function
  return () => {};
}
