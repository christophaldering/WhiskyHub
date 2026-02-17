import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { friendsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Pencil, Trash2, Check, User, UserPlus, X } from "lucide-react";

export default function WhiskyFriends() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends", currentParticipant?.id],
    queryFn: () => friendsApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["friends-pending", currentParticipant?.id],
    queryFn: () => friendsApi.getPending(currentParticipant!.id),
    enabled: !!currentParticipant,
    refetchInterval: 30000,
  });

  const addMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string }) =>
      friendsApi.create(currentParticipant!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", currentParticipant?.id] });
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setShowAddForm(false);
      toast({ title: t("friends.friendAdded") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ friendId, data }: { friendId: string; data: { firstName: string; lastName: string; email: string } }) =>
      friendsApi.update(currentParticipant!.id, friendId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", currentParticipant?.id] });
      setEditingId(null);
      toast({ title: t("friends.friendUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (friendId: string) =>
      friendsApi.delete(currentParticipant!.id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", currentParticipant?.id] });
      toast({ title: t("friends.friendRemoved") });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (friendId: string) =>
      friendsApi.accept(currentParticipant!.id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", currentParticipant?.id] });
      queryClient.invalidateQueries({ queryKey: ["friends-pending", currentParticipant?.id] });
      toast({ title: t("friends.accepted") });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (friendId: string) =>
      friendsApi.decline(currentParticipant!.id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-pending", currentParticipant?.id] });
      toast({ title: t("friends.declined") });
    },
  });

  const handleAdd = () => {
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;
    addMutation.mutate({ firstName: newFirstName.trim(), lastName: newLastName.trim(), email: newEmail.trim() });
  };

  const handleUpdate = (friendId: string) => {
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) return;
    updateMutation.mutate({ friendId, data: { firstName: editFirstName.trim(), lastName: editLastName.trim(), email: editEmail.trim() } });
  };

  const startEditing = (friend: any) => {
    setEditingId(friend.id);
    setEditFirstName(friend.firstName);
    setEditLastName(friend.lastName);
    setEditEmail(friend.email);
  };

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-serif" data-testid="text-login-required">
              Please sign in to manage your whisky friends.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-10 px-4 space-y-6 min-w-0 overflow-x-hidden">
      {pendingRequests.length > 0 && (
        <Card className="w-full border-primary/30 bg-primary/5 shadow-sm" data-testid="card-pending-requests">
          <CardHeader>
            <div>
              <h2 className="font-serif text-xl text-primary tracking-tight flex items-center gap-2" data-testid="text-pending-title">
                <UserPlus className="w-5 h-5" />
                {t("friends.pendingRequests")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{t("friends.pendingSubtitle")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((req: any) => (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-card hover:bg-secondary/10 transition-colors"
                data-testid={`card-pending-${req.id}`}
              >
                <Avatar className="w-9 h-9 border border-primary/20">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-serif">
                    {req.firstName.charAt(0).toUpperCase()}{req.lastName ? req.lastName.charAt(0).toUpperCase() : ""}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" data-testid={`text-pending-name-${req.id}`}>
                    {req.firstName} {req.lastName}
                  </p>
                  {req.email && (
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-pending-email-${req.id}`}>
                      {req.email}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => acceptMutation.mutate(req.id)}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    className="h-8 px-3 font-serif text-xs"
                    data-testid={`button-accept-${req.id}`}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {t("friends.accept")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => declineMutation.mutate(req.id)}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive"
                    data-testid={`button-decline-${req.id}`}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    {t("friends.decline")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="w-full border-border/50 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-xl sm:text-3xl text-primary tracking-tight flex items-center gap-3" data-testid="text-friends-title">
                <Users className="w-7 h-7" />
                {t("friends.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">{t("friends.subtitle")}</p>
            </div>
            {!showAddForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="font-serif"
                data-testid="button-add-friend"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("friends.addFriend")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {showAddForm && (
            <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3" data-testid="form-add-friend">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("friends.firstName")}
                  </Label>
                  <Input
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder={t("friends.firstNamePlaceholder")}
                    className="bg-background"
                    data-testid="input-friend-first-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("friends.lastName")}
                  </Label>
                  <Input
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder={t("friends.lastNamePlaceholder")}
                    className="bg-background"
                    data-testid="input-friend-last-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("friends.email")}
                  </Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t("friends.emailPlaceholder")}
                    className="bg-background"
                    data-testid="input-friend-email"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowAddForm(false); setNewFirstName(""); setNewLastName(""); setNewEmail(""); }}
                  className="font-serif"
                  data-testid="button-cancel-add-friend"
                >
                  {t("friends.cancelEdit")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || addMutation.isPending}
                  className="font-serif"
                  data-testid="button-confirm-add-friend"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t("friends.addFriend")}
                </Button>
              </div>
            </div>
          )}

          {friends.length === 0 && !showAddForm && (
            <p className="text-sm text-muted-foreground text-center py-8 font-serif" data-testid="text-no-friends">
              {t("friends.noFriends")}
            </p>
          )}

          <div className="space-y-2">
            {friends.map((friend: any) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                data-testid={`card-friend-${friend.id}`}
              >
                {editingId === friend.id ? (
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 md:grid-cols-3">
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder={t("friends.firstNamePlaceholder")}
                        className="bg-background text-sm"
                        data-testid={`input-edit-friend-first-name-${friend.id}`}
                      />
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder={t("friends.lastNamePlaceholder")}
                        className="bg-background text-sm"
                        data-testid={`input-edit-friend-last-name-${friend.id}`}
                      />
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder={t("friends.emailPlaceholder")}
                        className="bg-background text-sm"
                        data-testid={`input-edit-friend-email-${friend.id}`}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(friend.id)}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        className="text-xs"
                        data-testid={`button-cancel-edit-${friend.id}`}
                      >
                        {t("friends.cancelEdit")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(friend.id)}
                        disabled={!editFirstName.trim() || !editLastName.trim() || !editEmail.trim() || updateMutation.isPending}
                        className="text-xs"
                        data-testid={`button-save-friend-${friend.id}`}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {t("friends.saveFriend")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Avatar className="w-9 h-9 border border-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                        {friend.firstName.charAt(0).toUpperCase()}{friend.lastName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" data-testid={`text-friend-name-${friend.id}`}>
                        {friend.firstName} {friend.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`text-friend-email-${friend.id}`}>
                        {friend.email}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(friend)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        data-testid={`button-edit-friend-${friend.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(friend.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-friend-${friend.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
