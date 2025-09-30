import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import { FlashCardViewer } from "@/components/flashcard-viewer";
import { Users, BookOpen, UserPlus, Trash2, GraduationCap } from "lucide-react";
import { apiGet, apiPost, apiDelete, getApiUrl } from "@/lib/api-utils";

interface ClassroomDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string | null;
}

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

export function ClassroomDetailsDialog({ open, onOpenChange, classroomId }: ClassroomDetailsDialogProps) {
  const { user, firebaseUser } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [flashCardViewerOpen, setFlashCardViewerOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<{id: string, name: string} | null>(null);
  const [allSubjects, setAllSubjects] = useState<Array<{id: string, name: string, description: string}>>([]);
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState<string>("");

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isStudent = user?.role === 'student' || (!user?.role);
  const isOwner = classroom?.ownerId === user?.id;
  const canManage = isSuperAdmin || isOwner;

  useEffect(() => {
    if (open && classroomId) {
      loadClassroomDetails();
      loadAllSubjects();
    }
  }, [open, classroomId]);

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

  const addAdmin = async () => {
    if (!classroomId || !newAdminEmail.trim()) return;

    try {
      const response = await apiPost(`/api/classrooms/${classroomId}/admins`, {
        email: newAdminEmail.trim(),
      });

      if (!response.ok) {
        throw new Error("Failed to add admin");
      }

      setNewAdminEmail("");
      await loadClassroomDetails();
    } catch (error) {
      console.error("Error adding admin:", error);
    }
  };

  const addStudent = async () => {
    if (!classroomId || !newStudentEmail.trim()) return;

    try {
      const response = await apiPost(`/api/classrooms/${classroomId}/students`, {
        email: newStudentEmail.trim(),
      });

      if (!response.ok) {
        throw new Error("Failed to add student");
      }

      setNewStudentEmail("");
      await loadClassroomDetails();
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const removeAdmin = async (adminId: string) => {
    if (!classroomId) return;

    try {
      const response = await apiDelete(`/api/classrooms/${classroomId}/admins/${adminId}`);

      if (!response.ok) {
        throw new Error("Failed to remove admin");
      }

      await loadClassroomDetails();
    } catch (error) {
      console.error("Error removing admin:", error);
    }
  };

  const removeStudent = async (studentId: string) => {
    if (!classroomId) return;

    try {
      const response = await apiDelete(`/api/classrooms/${classroomId}/students/${studentId}`);

      if (!response.ok) {
        throw new Error("Failed to remove student");
      }

      await loadClassroomDetails();
    } catch (error) {
      console.error("Error removing student:", error);
    }
  };

  const handleSubjectClick = (subject: { id: string; name: string }) => {
    setSelectedSubject(subject);
    setFlashCardViewerOpen(true);
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

  if (loading || !classroom) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="text-lg">Loading classroom details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{classroom.name}</DialogTitle>
          <DialogDescription>
            {classroom.description || "No description provided"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={isStudent ? "subjects" : "overview"} className="w-full">
          {isStudent ? (
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="subjects" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Study Materials
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classroom.students.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classroom.subjects.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flash Cards</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {classroom.subjects.reduce((sum, subject) => sum + subject.flashCardCount, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Student</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Student email address"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                    />
                    <Button onClick={addStudent} disabled={!newStudentEmail.trim()}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {classroom.students.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-600">No students enrolled yet.</p>
                  </CardContent>
                </Card>
              ) : (
                classroom.students.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <div className="font-medium">{student.displayName || student.email}</div>
                        {student.displayName && (
                          <div className="text-sm text-gray-500">{student.email}</div>
                        )}
                        <div className="text-xs text-gray-400">
                          Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeStudent(student.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            {isSuperAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Admin email address"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                    />
                    <Button onClick={addAdmin} disabled={!newAdminEmail.trim()}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {classroom.admins.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-600">No additional admins assigned.</p>
                  </CardContent>
                </Card>
              ) : (
                classroom.admins.map((admin) => (
                  <Card key={admin.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <div className="font-medium">{admin.displayName || admin.email}</div>
                        {admin.displayName && (
                          <div className="text-sm text-gray-500">{admin.email}</div>
                        )}
                        <div className="text-xs text-gray-400">
                          Assigned: {new Date(admin.assignedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeAdmin(admin.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign Subject</CardTitle>
                  <CardDescription>Add existing subjects to this classroom</CardDescription>
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

            <div className="space-y-2">
              {classroom.subjects.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No subjects available</h3>
                    <p className="text-muted-foreground">
                      {isStudent
                        ? "There are no study materials available in this classroom yet."
                        : "No subjects created yet."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                classroom.subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className={isStudent ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                    onClick={isStudent ? () => handleSubjectClick(subject) : undefined}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isStudent ? 'bg-primary/10' : 'bg-muted'}`}>
                            <BookOpen className={`h-5 w-5 ${isStudent ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="font-medium">{subject.name}</div>
                            {subject.description && (
                              <div className="text-sm text-muted-foreground">{subject.description}</div>
                            )}
                            {isStudent && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Click to study with flash cards
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {subject.flashCardCount} flash cards
                          </Badge>
                          {isStudent && subject.flashCardCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Ready to study
                            </Badge>
                          )}
                          {canManage && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeSubject(subject.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Flash Card Viewer */}
      <FlashCardViewer
        open={flashCardViewerOpen}
        onOpenChange={setFlashCardViewerOpen}
        subjectId={selectedSubject?.id || null}
        subjectName={selectedSubject?.name || ""}
      />
    </Dialog>
  );
}