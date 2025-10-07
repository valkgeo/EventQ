import { nanoid } from "nanoid";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  type Query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Room = {
  id: string;
  title: string;
  organizationName: string;
  organizationEmail: string;
  moderatorName?: string | null;
  moderatorEmail?: string | null;
  allowedEmails: string[];
  createdAt?: Date;
  status?: string;
  allowModeratorManageModerators?: boolean;
  allowModeratorDeleteRoom?: boolean;
  moderationHistory?: Array<{
    type: "added" | "removed";
    actorEmail?: string | null;
    targetEmail: string;
    createdAt?: Date;
  }>;
};

export const roomsCollection = collection(db, "rooms");

export const roomDoc = (roomId: string) => doc(db, "rooms", roomId);

export const createRoom = async (input: {
  title: string;
  organizationName: string;
  organizationEmail: string;
  // Deprecated: moderatorName and moderatorEmail
  moderatorName?: string;
  moderatorEmail?: string;
  // New: support multiple moderator emails
  moderatorEmails?: string[];
  createdBy: string;
}) => {
  const id = nanoid(8).toLowerCase();

  const initialModerators = Array.isArray(input.moderatorEmails)
    ? input.moderatorEmails
    : input.moderatorEmail
    ? [input.moderatorEmail]
    : [];

  // Filter out emails from users who opted out of moderator invites
  const filteredModerators = await filterAllowedModeratorEmails(initialModerators);

  const allowedEmails = [input.organizationEmail]
    .concat(filteredModerators)
    .map((email) => email.toLowerCase())
    .filter((value, index, array) => array.indexOf(value) === index);

  await setDoc(roomDoc(id), {
    title: input.title,
    organizationName: input.organizationName,
    organizationEmail: input.organizationEmail,
    // keep old fields for backward compatibility as null
    moderatorName: null,
    moderatorEmail: null,
    allowedEmails,
    createdBy: input.createdBy,
    status: "active",
    allowModeratorManageModerators: true,
    allowModeratorDeleteRoom: true,
    moderationHistory: [],
    createdAt: serverTimestamp(),
  });

  return id;
};

export const getRoom = async (roomId: string) => {
  const snapshot = await getDoc(roomDoc(roomId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title as string,
    organizationName: data.organizationName as string,
    organizationEmail: data.organizationEmail as string,
    moderatorName: (data.moderatorName as string | null) ?? undefined,
    moderatorEmail: (data.moderatorEmail as string | null) ?? undefined,
    allowedEmails: (data.allowedEmails as string[]) ?? [],
    createdAt: data.createdAt?.toDate?.(),
    status: data.status as string | undefined,
    allowModeratorManageModerators: (data.allowModeratorManageModerators as boolean | undefined) ?? true,
    allowModeratorDeleteRoom: (data.allowModeratorDeleteRoom as boolean | undefined) ?? true,
  } satisfies Room;
};

export type RoomsQuery = Query;

export const roomsByEmailQuery = (email: string) =>
  query(roomsCollection, where("allowedEmails", "array-contains", email.toLowerCase()));

export const deleteRoom = async (roomId: string) => {
  await deleteDoc(roomDoc(roomId));
};

export const deleteRoomWithQuestions = async (roomId: string) => {
  const questionsRef = collection(db, "rooms", roomId, "questions");
  const snapshot = await getDocs(questionsRef);
  const batch = writeBatch(db);

  snapshot.forEach((questionDoc) => {
    batch.delete(questionDoc.ref);
  });

  batch.delete(roomDoc(roomId));
  await batch.commit();
};

export const addModeratorEmail = async (roomId: string, email: string, actorEmail?: string) => {
  const { updateDoc, arrayUnion } = await import("firebase/firestore");
  const emailLower = email.toLowerCase();
  const optedOut = await isUserOptedOut(emailLower);
  if (optedOut) {
    throw new Error("Este usuário recusou convites de moderador.");
  }
  await updateDoc(roomDoc(roomId), {
    allowedEmails: arrayUnion(emailLower),
    moderationHistory: arrayUnion({
      type: "added",
      actorEmail: actorEmail ? actorEmail.toLowerCase() : null,
      targetEmail: emailLower,
      createdAt: Date.now(),
    }),
  });
};

export const removeModeratorEmail = async (roomId: string, email: string, actorEmail?: string) => {
  const { updateDoc, arrayRemove, arrayUnion } = await import("firebase/firestore");
  const emailLower = email.toLowerCase();
  await updateDoc(roomDoc(roomId), {
    allowedEmails: arrayRemove(emailLower),
    moderationHistory: arrayUnion({
      type: "removed",
      actorEmail: actorEmail ? actorEmail.toLowerCase() : null,
      targetEmail: emailLower,
      createdAt: Date.now(),
    }),
  });
};

// Helpers
const isUserOptedOut = async (emailLower: string) => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(query(usersRef, where("email", "==", emailLower)));
    if (snapshot.empty) return false; // user not found -> allow
    const docData = snapshot.docs[0].data() as { acceptModeratorInvites?: boolean; blockModeratorInvites?: boolean };
    if (docData.blockModeratorInvites === true) return true;
    if (docData.acceptModeratorInvites === false) return true;
    return false;
  } catch {
    // On failure to check, default to allowing (fail-open) to not block legitimate use
    return false;
  }
};

const filterAllowedModeratorEmails = async (emails: string[]) => {
  const lower = emails.map((e) => e.toLowerCase());
  const results: string[] = [];
  for (const e of lower) {
    const optedOut = await isUserOptedOut(e);
    if (!optedOut) results.push(e);
  }
  return results;
};
