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
import { PlusIcon, TrashIcon } from "lucide-react";

const StudyProgressTracker = () => {
  const [lessons, setLessons] = useState(() => {
    // Load lessons from localStorage on initial render
    const savedLessons = localStorage.getItem("studyLessons");
    return savedLessons ? JSON.parse(savedLessons) : [];
  });

  const [newLesson, setNewLesson] = useState("");

  // Save lessons to localStorage whenever lessons change
  useEffect(() => {
    localStorage.setItem("studyLessons", JSON.stringify(lessons));
  }, [lessons]);

  const addLesson = () => {
    if (newLesson.trim() === "") return;

    const newLessonEntry = {
      id: Date.now(),
      name: newLesson,
      dateStudied: format(new Date(), "yyyy-MM-dd"),
      reviews: [],
    };

    setLessons([...lessons, newLessonEntry]);
    setNewLesson("");
  };

  const addReview = (lessonId: any) => {
    setLessons(
      lessons.map((lesson: any) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              reviews: [...lesson.reviews, format(new Date(), "yyyy-MM-dd")],
            }
          : lesson
      )
    );
  };

  const deleteLesson = (lessonId: any) => {
    setLessons(lessons.filter((lesson: any) => lesson.id !== lessonId));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Study Progress Tracker</h1>

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
