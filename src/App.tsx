import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { PlusIcon, TrashIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

interface Lesson {
  id: string | number;
  name: string;
  dateStudied: string;
  reviews: string[];
  userId?: string;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

//initialize firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const analytics = getAnalytics(app);

const StudyProgressTracker = () => {
  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newLesson, setNewLesson] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  //handle state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      loadLessons(currentUser);
    });
    return () => unsubscribe();
  }, []);
  //load lessons - I need to stop writing comments like this :)
  const loadLessons = async (currentUser: User | null) => {
    setLoading(true);
    try {
      if (currentUser) {
        //load from fire base
        const q = query(
          collection(db, "lessons"),
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const lessonData: Lesson[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Lesson, "id">),
        }));
        setLessons(lessonData);
      } else {
        //load from localStorage
        const savedLessons = localStorage.getItem("studyLessons");
        setLessons(savedLessons ? JSON.parse(savedLessons) : []);
      }
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  //save lessons based on auth state
  useEffect(() => {
    if (!user) {
      localStorage.setItem("studyLessons", JSON.stringify(lessons));
    }
  }, [lessons, user]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      //merge local lessons if there any
      const localLessons = JSON.parse(
        localStorage.getItem("studyLessons") || "[]"
      ) as Lesson[];

      if (localLessons.length > 0) {
        for (const lesson of localLessons) {
          await addDoc(collection(db, "lessons"), {
            ...lesson,
            userId: result.user.uid,
          });
        }
        localStorage.removeItem("studyLessons");
      }
      void loadLessons(result.user);
    } catch (error) {
      console.error("Erorr signing in :(", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setLessons([]);
      void loadLessons(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const addLesson = async () => {
    if (newLesson.trim() === "") return;

    const newLessonEntry: Omit<Lesson, "id"> = {
      name: newLesson,
      dateStudied: format(new Date(), "yyyy-MM-dd"),
      reviews: [],
      userId: user?.uid,
    };

    try {
      if (user) {
        //add to firebase
        const docRef = await addDoc(collection(db, "lessons"), newLessonEntry);
        setLessons((prev) => [...prev, { ...newLessonEntry, id: docRef.id }]);
      } else {
        //add to to local state
        setLessons((prev) => [...prev, { ...newLessonEntry, id: Date.now() }]);
      }

      setNewLesson("");
    } catch (error) {
      console.error("Error adding lesson", error);
    }
  };

  const addReview = async (lessonId: string | number) => {
    const newReviewDate = format(new Date(), "yyyy-MM-dd");

    try {
      if (user) {
        //update in firebase
        const lessonRef = doc(db, "lessons", lessonId.toString());
        const lesson = lessons.find((l) => l.id === lessonId);
        if (lesson) {
          await updateDoc(lessonRef, {
            reviews: [...lesson.reviews, newReviewDate],
          });
        }
      }

      setLessons((prev) =>
        prev.map((lesson: any) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                reviews: [...lesson.reviews, newReviewDate],
              }
            : lesson
        )
      );
    } catch (error) {
      console.error("Error adding review:", error);
    }
  };

  const deleteLesson = async (lessonId: string | number) => {
    try {
      if (user) {
        //delete from firebase
        await deleteDoc(doc(db, "lessons", lessonId.toString()));
      }
      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
    } catch (error) {
      console.error("Error Deleting Lesson", error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Study Progress Tracker</h1>

      {user ? (
        <div className="flex items-center gap-2 justify-between mb-4">
          <span className="text-sm text-gray-600">{user.displayName}</span>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOutIcon className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      ) : (
        <Button onClick={handleGoogleSignIn} variant="outline" size="sm">
          <LogInIcon className="h-4 w-4 mr-2" /> Sign In With Google
        </Button>
      )}

      <div className="flex mb-4">
        <Input
          value={newLesson}
          onChange={(e) => setNewLesson(e.target.value)}
          placeholder="Enter lesson name"
          className="mr-2"
        />
        <Button onClick={addLesson} className="flex items-center">
          <PlusIcon className="mr-2 h-4 w-4" /> Add Lesson
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lesson Name</TableHead>
            <TableHead>Date Studied</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Review Dates</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((lesson: any) => (
            <TableRow key={lesson.id}>
              <TableCell>{lesson.name}</TableCell>
              <TableCell>{lesson.dateStudied}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addReview(lesson.id)}
                >
                  Add Review
                </Button>
              </TableCell>
              <TableCell>
                {lesson.reviews.map((reviewDate: any, index: any) => (
                  <div key={index}>{reviewDate}</div>
                ))}
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLesson(lesson.id)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudyProgressTracker;
