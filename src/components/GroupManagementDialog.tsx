import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Chat {
  id: number;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
}

interface Member {
  user_id: number;
  nickname: string;
  avatar_url: string | null;
  is_owner: boolean;
}

interface GroupManagementDialogProps {
  open: boolean;
  onClose: () => void;
  chat: Chat | null;
  currentUserId: number;
  onUpdate: () => void;
}

export default function GroupManagementDialog({
  open,
  onClose,
  chat,
  currentUserId,
  onUpdate,
}: GroupManagementDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && chat) {
      loadGroupData();
    }
  }, [open, chat?.id]);

  const loadGroupData = async () => {
    if (!chat) return;

    try {
      const response = await fetch(
        `https://functions.poehali.dev/2f19c6bc-5b44-4f12-a380-4f5c4255084e/members?chat_id=${chat.id}&user_id=${currentUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
        setIsOwner(data.is_owner);
        setGroupName(chat.name);
        setAvatarPreview(chat.avatar_url || '');
      }
    } catch (error) {
      console.error('Failed to load group data:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateGroup = async () => {
    if (!chat) return;

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/2f19c6bc-5b44-4f12-a380-4f5c4255084e', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          user_id: currentUserId,
          name: groupName,
          avatar_url: avatarPreview,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Группа обновлена',
          description: 'Настройки группы успешно обновлены',
        });
        onUpdate();
        onClose();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось обновить группу',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить группу',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!chat) return;

    const confirmed = confirm('Вы уверены, что хотите покинуть эту группу?');
    if (!confirmed) return;

    try {
      const response = await fetch('https://functions.poehali.dev/196c0fd9-ff0b-453b-93a7-725c4e5a97e6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          sender_id: currentUserId,
          content: `покинул(а) эту группу`,
          is_system_message: true,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Вы покинули группу',
          description: 'Вы успешно вышли из группы',
        });
        onUpdate();
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выйти из группы',
        variant: 'destructive',
      });
    }
  };

  const handleKickMember = async (memberId: number, memberName: string) => {
    if (!chat) return;

    const confirmed = confirm(`Вы уверены, что хотите выгнать ${memberName}?`);
    if (!confirmed) return;

    try {
      const response = await fetch('https://functions.poehali.dev/2f19c6bc-5b44-4f12-a380-4f5c4255084e/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          user_id: currentUserId,
          kick_user_id: memberId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Участник удален',
          description: `${memberName} был удален из группы`,
        });
        loadGroupData();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить участника',
        variant: 'destructive',
      });
    }
  };

  if (!chat) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-strong border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Управление группой</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass">
            <TabsTrigger value="members">Участники</TabsTrigger>
            {isOwner && <TabsTrigger value="settings">Настройки</TabsTrigger>}
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg glass hover:bg-primary/10"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/30">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {member.nickname.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.nickname}</span>
                        {member.is_owner && (
                          <Icon name="Crown" size={16} className="text-yellow-500" />
                        )}
                      </div>
                    </div>

                    {isOwner && !member.is_owner && member.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleKickMember(member.user_id, member.nickname)}
                        className="hover:bg-destructive/20"
                      >
                        <Icon name="UserMinus" size={16} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={handleLeaveGroup}
              variant="outline"
              className="w-full glass border-destructive/30 hover:bg-destructive/20"
            >
              <Icon name="LogOut" size={16} className="mr-2" />
              Покинуть группу
            </Button>
          </TabsContent>

          {isOwner && (
            <TabsContent value="settings" className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-primary/30">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                    {groupName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <Label
                  htmlFor="group-avatar-upload"
                  className="cursor-pointer px-4 py-2 rounded-lg glass border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-2"
                >
                  <Icon name="Upload" size={16} />
                  Изменить аватарку
                </Label>
                <input
                  id="group-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-name">Название группы</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Название группы"
                  className="glass border-primary/30"
                />
              </div>

              <Button
                onClick={handleUpdateGroup}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? <Icon name="Loader2" className="animate-spin" /> : 'Сохранить изменения'}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
