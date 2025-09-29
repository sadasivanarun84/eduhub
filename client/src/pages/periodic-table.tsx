import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateClassroomDialog } from "@/components/create-classroom-dialog";
import { ClassroomDetailsDialog } from "@/components/classroom-details-dialog";
import { CreateSubjectDialog } from "@/components/create-subject-dialog";
import { FlashCardDisplay } from "@/components/flashcard-display";
import { apiGet, apiDelete } from "@/lib/api-utils";
import { Users, BookOpen, Plus, Settings, Trash2 } from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  description: string;
  students: number;
  subjects: string[];
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  flashCardCount: number;
  classroomId: string;
}

export function PeriodicTablePage() {
  const { user, firebaseUser, login, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createClassroomOpen, setCreateClassroomOpen] = useState(false);
  const [classroomDetailsOpen, setClassroomDetailsOpen] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [selectedClassroomForSubject, setSelectedClassroomForSubject] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");
  const [showFlashCards, setShowFlashCards] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'subject' | 'classroom', id: string, name: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Use the role from the database instead of hardcoded emails
  const userRole = user?.role || 'user';
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Fetch classrooms
      const classroomsResponse = await apiGet('/api/classrooms');
      if (classroomsResponse.ok) {
        const classroomsData = await classroomsResponse.json();
        setClassrooms(classroomsData.map((c: any) => ({
          ...c,
          students: 0, // TODO: Calculate student count from API
          subjects: new Array(c.subjectCount || 0).fill('') // Use subjectCount from API
        })));
      }

      // Fetch subjects
      const subjectsResponse = await apiGet('/api/subjects');
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomCreated = () => {
    loadData();
  };

  const handleClassroomClick = (classroomId: string) => {
    navigate(`/classroom/${classroomId}`);
  };

  const handleSubjectCreated = () => {
    loadData();
  };

  const handleAddSubject = () => {
    setCreateSubjectOpen(true);
  };

  const handleSubjectClick = (subjectId: string, subjectName: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedSubjectName(subjectName);
    setShowFlashCards(true);
  };

  const handleBackToSubjects = () => {
    setShowFlashCards(false);
    setSelectedSubjectId(null);
    setSelectedSubjectName("");
  };

  const handleDeleteClick = (type: 'subject' | 'classroom', id: string, name: string, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Delete clicked:', { type, id, name });
    setItemToDelete({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    console.log('Delete confirm clicked:', { itemToDelete, hasFirebaseUser: !!firebaseUser });
    if (!itemToDelete || !firebaseUser) return;

    setDeleteLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const endpoint = itemToDelete.type === 'subject' ? `/api/subjects/${itemToDelete.id}` : `/api/classrooms/${itemToDelete.id}`;

      const response = await apiDelete(endpoint, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${itemToDelete.type}`);
      }

      loadData();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Periodic Table Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              Please sign in to access the Periodic Table learning system.
            </p>
            <div className="flex justify-center">
              <Button onClick={login} disabled={authLoading} className="w-full">
                {authLoading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Periodic Table Learning
            </h1>
            <p className="text-gray-600">
              Interactive flash cards for chemistry education
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isSuperAdmin ? 'default' : isAdmin ? 'secondary' : 'outline'}>
              {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Student'}
            </Badge>
            <div className="text-sm text-gray-600">
              {user.displayName || user.email}
            </div>
          </div>
        </div>

        {/* Super Admin / Admin View */}
        {isAdmin && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Classroom Management</h2>
              {isSuperAdmin && (
                <Button
                  className="flex items-center gap-2"
                  onClick={() => setCreateClassroomOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Create Classroom
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No classrooms created yet.</p>
                    {isSuperAdmin && (
                      <p className="text-sm text-gray-500 mt-2">
                        Create your first classroom to get started.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                classrooms.map((classroom) => (
                  <Card
                    key={classroom.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleClassroomClick(classroom.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{classroom.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteClick('classroom', classroom.id, classroom.name, e)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm mb-4">{classroom.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span>{classroom.students} students</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-500" />
                          <span>{classroom.subjects.length} subjects</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Flash Cards Display */}
        {showFlashCards ? (
          <div>
            <div className="mb-6">
              <Button variant="outline" onClick={handleBackToSubjects} className="mb-4">
                ← Back to Subjects
              </Button>
            </div>
            <FlashCardDisplay
              subjectId={selectedSubjectId}
              subjectName={selectedSubjectName}
            />
          </div>
        ) : (
        /* Student View or Subject Selection */
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {!isAdmin ? 'Your Subjects' : 'All Subjects'}
            </h2>
            {isAdmin && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleAddSubject()}
              >
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjects.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No subjects available yet.</p>
                  {isAdmin && (
                    <p className="text-sm text-gray-500 mt-2">
                      Add subjects to start creating flash cards.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              subjects.map((subject) => (
                <Card key={subject.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleSubjectClick(subject.id, subject.name)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClick('subject', subject.id, subject.name, e)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">{subject.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {subject.flashCardCount} flash cards
                      </span>
                      <Button size="sm">
                        Study
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        )}

        {/* Dialogs */}
        <CreateClassroomDialog
          open={createClassroomOpen}
          onOpenChange={setCreateClassroomOpen}
          onClassroomCreated={handleClassroomCreated}
        />

        <ClassroomDetailsDialog
          open={classroomDetailsOpen}
          onOpenChange={setClassroomDetailsOpen}
          classroomId={selectedClassroomId}
        />

        <CreateSubjectDialog
          open={createSubjectOpen}
          onOpenChange={setCreateSubjectOpen}
          onSubjectCreated={handleSubjectCreated}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete {itemToDelete?.type === 'classroom' ? 'Classroom' : 'Subject'}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{itemToDelete?.name}"?
                {itemToDelete?.type === 'subject'
                  ? ' This will also delete all associated flash cards.'
                  : ' This will remove all student and admin associations.'}
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}