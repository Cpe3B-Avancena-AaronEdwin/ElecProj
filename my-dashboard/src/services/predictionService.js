import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export async function savePrediction(prediction, user) {
  return addDoc(collection(db, "predictions"), {
    ...prediction,
    createdBy: user?.uid || null,
    generatedAt: serverTimestamp(),
  });
}