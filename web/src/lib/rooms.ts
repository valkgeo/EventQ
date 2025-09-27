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
};

export const roomsCollection = collection(db, "rooms");

export const roomDoc = (roomId: string) => doc(db, "rooms", roomId);

export const createRoom = async (input: {
  title: string;
  organizationName: string;
  organizationEmail: string;
  moderatorName?: string;
  moderatorEmail?: string;
  createdBy: string;
}) => {
  const id = nanoid(8).toLowerCase();

  const allowedEmails = [input.organizationEmail]
    .concat(input.moderatorEmail ? [input.moderatorEmail] : [])
    .map((email) => email.toLowerCase())
    .filter((value, index, array) => array.indexOf(value) === index);

  await setDoc(roomDoc(id), {
    title: input.title,
    organizationName: input.organizationName,
    organizationEmail: input.organizationEmail,
    moderatorName: input.moderatorName ?? null,
    moderatorEmail: input.moderatorEmail?.toLowerCase() ?? null,
    allowedEmails,
    createdBy: input.createdBy,
    status: "active",
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
