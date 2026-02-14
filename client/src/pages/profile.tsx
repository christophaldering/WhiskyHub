import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { profileApi, participantApi, participantUpdateApi, friendsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, X, User, KeyRound, Users, Plus, Pencil, Trash2, Check } from "lucide-react";

const REGIONS = [
  "Speyside", "Highlands", "Islay", "Lowlands", "Campbeltown",
  "Islands", "Ireland", "Japan", "USA", "Taiwan", "Other",
];

const PEAT_LEVELS = ["None", "Light", "Medium", "Heavy"];
const CASK_TYPES = ["Bourbon", "Sherry", "Port", "Wine", "Rum", "Other"];

function WhiskyFriendsSection({ participantId }: { participantId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: friends = [] } = useQuery({
    queryKey: ["friends", participantId],
    queryFn: () => friendsApi.getAll(participantId),
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      friendsApi.create(participantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", participantId] });
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
      toast({ title: t("profile.friendAdded") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ friendId, data }: { friendId: string; data: { name: string; email: string } }) =>
      friendsApi.update(participantId, friendId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", participantId] });
      setEditingId(null);
      toast({ title: t("profile.friendUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (friendId: string) =>
      friendsApi.delete(participantId, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", participantId] });
      toast({ title: t("profile.friendRemoved") });
    },
  });

  const handleAdd = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    addMutation.mutate({ name: newName.trim(), email: newEmail.trim() });
  };

  const handleUpdate = (friendId: string) => {
    if (!editName.trim() || !editEmail.trim()) return;
    updateMutation.mutate({ friendId, data: { name: editName.trim(), email: editEmail.trim() } });
  };

  const startEditing = (friend: any) => {
    setEditingId(friend.id);
    setEditName(friend.name);
    setEditEmail(friend.email);
  };

  return (
    <Card className="w-full border-border/50 bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-primary flex items-center gap-2" data-testid="text-friends-title">
              <Users className="w-5 h-5" />
              {t("profile.friends")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t("profile.friendsSubtitle")}</p>
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
              {t("profile.addFriend")}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3" data-testid="form-add-friend">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.friendName")}
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("profile.friendNamePlaceholder")}
                  className="bg-background"
                  data-testid="input-friend-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.friendEmail")}
                </Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t("profile.friendEmailPlaceholder")}
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
                onClick={() => { setShowAddForm(false); setNewName(""); setNewEmail(""); }}
                className="font-serif"
                data-testid="button-cancel-add-friend"
              >
                {t("profile.cancelEdit")}
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newName.trim() || !newEmail.trim() || addMutation.isPending}
                className="font-serif"
                data-testid="button-confirm-add-friend"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t("profile.addFriend")}
              </Button>
            </div>
          </div>
        )}

        {friends.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground text-center py-6 font-serif" data-testid="text-no-friends">
            {t("profile.noFriends")}
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
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t("profile.friendNamePlaceholder")}
                      className="bg-background text-sm"
                      data-testid={`input-edit-friend-name-${friend.id}`}
                    />
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder={t("profile.friendEmailPlaceholder")}
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
                      {t("profile.cancelEdit")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(friend.id)}
                      disabled={!editName.trim() || !editEmail.trim() || updateMutation.isPending}
                      className="text-xs"
                      data-testid={`button-save-friend-${friend.id}`}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {t("profile.saveFriend")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Avatar className="w-9 h-9 border border-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                      {friend.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" data-testid={`text-friend-name-${friend.id}`}>
                      {friend.name}
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
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteWhisky, setFavoriteWhisky] = useState("");
  const [goToDram, setGoToDram] = useState("");
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [preferredPeatLevel, setPreferredPeatLevel] = useState("");
  const [preferredCaskInfluence, setPreferredCaskInfluence] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: participant, isLoading: participantLoading } = useQuery({
    queryKey: ["participant", currentParticipant?.id],
    queryFn: () => participantApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setFavoriteWhisky(profile.favoriteWhisky || "");
      setGoToDram(profile.goToDram || "");
      setPreferredRegions(profile.preferredRegions || []);
      setPreferredPeatLevel(profile.preferredPeatLevel || "");
      setPreferredCaskInfluence(profile.preferredCaskInfluence || "");
    }
  }, [profile]);

  useEffect(() => {
    if (participant) {
      setDisplayName(participant.name || "");
      setEmail(participant.email || "");
    }
  }, [participant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentParticipant) return;

      if (removePhoto && !photoFile) {
        await profileApi.deletePhoto(currentParticipant.id);
      }
      if (photoFile) {
        await profileApi.uploadPhoto(currentParticipant.id, photoFile);
      }

      await profileApi.update(currentParticipant.id, {
        bio,
        favoriteWhisky,
        goToDram,
        preferredRegions,
        preferredPeatLevel,
        preferredCaskInfluence,
      });

      const participantUpdates: any = {};
      if (displayName.trim() && displayName !== participant?.name) {
        participantUpdates.name = displayName.trim();
      }
      if (email !== (participant?.email || "")) {
        participantUpdates.email = email;
      }

      if (newPin) {
        if (newPin.length < 4) {
          throw new Error("PIN must be at least 4 characters");
        }
        if (newPin !== confirmPin) {
          throw new Error(t("profile.pinMismatch"));
        }
        if (!currentPin) {
          throw new Error(t("profile.currentPinRequired"));
        }
        participantUpdates.currentPin = currentPin;
        participantUpdates.pin = newPin;
      }

      if (Object.keys(participantUpdates).length > 0) {
        const updated = await participantUpdateApi.update(currentParticipant.id, participantUpdates);
        if (updated.name !== currentParticipant.name) {
          setParticipant({ ...currentParticipant, name: updated.name });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", currentParticipant?.id] });
      queryClient.invalidateQueries({ queryKey: ["participant", currentParticipant?.id] });
      setPhotoFile(null);
      setPhotoPreview(null);
      setRemovePhoto(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      toast({ title: t("profile.saved") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    setPhotoFile(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleRegion = (region: string) => {
    setPreferredRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const currentPhotoUrl = removePhoto ? null : (photoPreview || profile?.photoUrl);

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-serif" data-testid="text-login-required">
              Please sign in to view your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading || participantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-10 px-4 space-y-6">
      <Card className="w-full border-border/50 bg-card shadow-sm">
        <CardHeader>
          <h1 className="font-serif text-3xl text-primary tracking-tight" data-testid="text-profile-title">
            {t("profile.title")}
          </h1>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("profile.photo")}
            </Label>
            <div className="flex items-center gap-4">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-avatar-upload"
              >
                <Avatar className="w-24 h-24 border-2 border-primary/20">
                  {currentPhotoUrl ? (
                    <AvatarImage src={currentPhotoUrl} alt={currentParticipant.name} />
                  ) : null}
                  <AvatarFallback className="bg-secondary/30 text-primary text-2xl font-serif">
                    {currentParticipant.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                data-testid="input-profile-photo"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-serif"
                  data-testid="button-upload-photo"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  {currentPhotoUrl ? t("profile.changePhoto") : t("profile.uploadPhoto")}
                </Button>
                {currentPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="text-xs text-destructive"
                    data-testid="button-remove-photo"
                  >
                    <X className="w-3 h-3 mr-1" />
                    {t("profile.removePhoto")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("profile.accountDetails")}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.name")}
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("profile.namePlaceholder")}
                  className="bg-secondary/20"
                  data-testid="input-display-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.email")}
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("profile.emailPlaceholder")}
                  className="bg-secondary/20"
                  data-testid="input-email"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              {t("profile.newPin")}
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.currentPin")}
                </Label>
                <Input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder={t("profile.currentPinPlaceholder")}
                  maxLength={6}
                  className="bg-secondary/20"
                  data-testid="input-current-pin"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.newPin")}
                </Label>
                <Input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder={t("profile.newPinPlaceholder")}
                  maxLength={6}
                  className="bg-secondary/20"
                  data-testid="input-new-pin"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.confirmPin")}
                </Label>
                <Input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder={t("profile.confirmPinPlaceholder")}
                  maxLength={6}
                  className="bg-secondary/20"
                  data-testid="input-confirm-pin"
                />
              </div>
            </div>
            {newPin && confirmPin && newPin !== confirmPin && (
              <p className="text-xs text-destructive mt-2" data-testid="text-pin-mismatch">
                {t("profile.pinMismatch")}
              </p>
            )}
          </div>

          <div className="border-t border-border/30 pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.bio")}
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 400))}
                placeholder={t("profile.bioPlaceholder")}
                className="bg-secondary/20 min-h-[100px] resize-none"
                maxLength={400}
                data-testid="input-bio"
              />
              <p className="text-xs text-muted-foreground text-right" data-testid="text-bio-counter">
                {bio.length}/400
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.favoriteWhisky")}
              </Label>
              <Input
                value={favoriteWhisky}
                onChange={(e) => setFavoriteWhisky(e.target.value)}
                placeholder={t("profile.favoritePlaceholder")}
                className="bg-secondary/20"
                data-testid="input-favorite-whisky"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.goToDram")}
              </Label>
              <Input
                value={goToDram}
                onChange={(e) => setGoToDram(e.target.value)}
                placeholder={t("profile.goToDramPlaceholder")}
                className="bg-secondary/20"
                data-testid="input-go-to-dram"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.preferredRegions")}
              </Label>
              <div className="flex flex-wrap gap-2" data-testid="select-regions">
                {REGIONS.map((region) => (
                  <Badge
                    key={region}
                    variant={preferredRegions.includes(region) ? "default" : "outline"}
                    className="cursor-pointer select-none transition-all"
                    onClick={() => toggleRegion(region)}
                    data-testid={`badge-region-${region.toLowerCase()}`}
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.preferredPeatLevel")}
              </Label>
              <Select value={preferredPeatLevel} onValueChange={setPreferredPeatLevel}>
                <SelectTrigger className="bg-secondary/20" data-testid="select-peat-level">
                  <SelectValue placeholder={t("profile.selectPeat")} />
                </SelectTrigger>
                <SelectContent>
                  {PEAT_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.preferredCaskInfluence")}
              </Label>
              <Select value={preferredCaskInfluence} onValueChange={setPreferredCaskInfluence}>
                <SelectTrigger className="bg-secondary/20" data-testid="select-cask-influence">
                  <SelectValue placeholder={t("profile.selectCask")} />
                </SelectTrigger>
                <SelectContent>
                  {CASK_TYPES.map((cask) => (
                    <SelectItem key={cask} value={cask}>{cask}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (newPin !== "" && newPin !== confirmPin)}
            className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? t("profile.saving") : t("profile.save")}
          </Button>
        </CardContent>
      </Card>

      <WhiskyFriendsSection participantId={currentParticipant.id} />
    </div>
  );
}
