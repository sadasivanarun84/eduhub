import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlashCardViewer } from "@/components/flashcard-viewer";
import { ArrowLeft, BookOpen, Users, Plus, Trash2, UserPlus } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api-utils";

interface ClassroomDetails {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  students: Array<{
    id: string;
    email: string;
    displayName: string;
    enrolledAt: string;
  }>;
  admins: Array<{
    id: string;
    email: string;
    displayName: string;
    assignedAt: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    description: string;
    flashCardCount: number;
  }>;
}

export default function ClassroomPage() {
  const { id: classroomId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, firebaseUser } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [flashCardViewerOpen, setFlashCardViewerOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<{id: string, name: string} | null>(null);
  const [allSubjects, setAllSubjects] = useState<Array<{id: string, name: string, description: string}>>([]);
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState<string>("");

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isOwner = classroom?.ownerId === user?.id;
  const canManage = isSuperAdmin || isOwner;

  useEffect(() => {
    if (classroomId) {
      loadClassroomDetails();
      loadAllSubjects();
    }
  }, [classroomId]);

  const loadAllSubjects = async () => {
    if (!firebaseUser) return;

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await apiGet('/api/subjects', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      if (response.ok) {
        const subjects = await response.json();
        setAllSubjects(subjects);
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  const loadClassroomDetails = async () => {
    if (!classroomId || !firebaseUser) return;

    setLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await apiGet(`/api/classrooms/${classroomId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load classroom details");
      }
      const data = await response.json();
      setClassroom(data);
    } catch (error) {
      console.error("Error loading classroom details:", error);
    } finally {
      setLoading(false);
    }
  };

  const copySubject = async () => {
    if (!classroomId || !selectedSubjectToAdd || !firebaseUser) return;

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await apiPost(`/api/classrooms/${classroomId}/subjects`, {
        subjectId: selectedSubjectToAdd,
      }, {
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to copy subject");
      }

      const result = await response.json();
      console.log(`Subject copied successfully: ${result.flashcardsCount} flashcards copied`);

      setSelectedSubjectToAdd("");
      await loadClassroomDetails();
    } catch (error) {
      console.error("Error copying subject:", error);
    }
  };

  const removeSubject = async (subjectId: string) => {
    if (!classroomId || !firebaseUser) return;

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await apiDelete(`/api/classrooms/${classroomId}/subjects/${subjectId}`, {
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to remove subject");
      }

      await loadClassroomDetails();
    } catch (error) {
      console.error("Error removing subject:", error);
    }
  };

  const handleSubjectClick = (subject: { id: string; name: string }) => {
    setSelectedSubject(subject);
    setFlashCardViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <div>Loading classroom details...</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <div>Classroom not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/periodic-table">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classrooms
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            {classroom.description && (
              <p className="text-muted-foreground mt-1">{classroom.description}</p>
            )}
          </div>
        </div>

        {/* Classroom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{classroom.subjects.length}</div>
                <div className="text-sm text-muted-foreground">Subjects</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{classroom.students.length}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{classroom.admins.length}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Subjects Section */}
        {canManage && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Subject
              </CardTitle>
              <CardDescription>
                Copy an existing subject from another classroom to this classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={selectedSubjectToAdd} onValueChange={setSelectedSubjectToAdd}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a subject to copy" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSubjects
                      .filter(subject => !classroom.subjects.some(cs => cs.id === subject.id))
                      .map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={copySubject} disabled={!selectedSubjectToAdd}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subjects List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Subjects</h2>
          {classroom.subjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No subjects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding subjects to this classroom.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classroom.subjects.map((subject) => (
                <Card key={subject.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSubject(subject.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {subject.description && (
                      <CardDescription>{subject.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        {subject.flashCardCount} flash cards
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubjectClick(subject)}
                      >
                        Study
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flash Card Viewer */}
      <FlashCardViewer
        open={flashCardViewerOpen}
        onOpenChange={setFlashCardViewerOpen}
        subjectId={selectedSubject?.id || null}
        subjectName={selectedSubject?.name || ""}
      />
    </div>
  );
}