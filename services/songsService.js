// ===== SONGS SERVICE =====
// Collection: "songs" (Store: loadSongs() -> getDocs(collection(db,"songs")),
// memakai field title, artist, url untuk music player).
import { db } from "../firebase-config.js";
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { genId } from "../utils/format.js";

const COL = "songs";

export async function listSongs() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveSong(id, data) {
  const payload = {
    title: data.title || "",
    artist: data.artist || "",
    url: data.url || "",
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, COL, id), payload);
    return id;
  }
  const newId = genId("song");
  await setDoc(doc(db, COL, newId), { ...payload, createdAt: serverTimestamp() });
  return newId;
}

export async function deleteSong(id) {
  await deleteDoc(doc(db, COL, id));
}
