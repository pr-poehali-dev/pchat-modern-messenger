import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Chat {
  id: number;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
}

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingChats: Chat[];
  currentUserId: number;
}

export default function CreateGroupDialog({
  open,
  onClose,
  onSuccess,
  existingChats,
  currentUserId,
}: CreateGroupDialogProps) {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название группы',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/2f19c6bc-5b44-4f12-a380-4f5c4255084e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          is_group: true,
          name: groupName,
          avatar_url: avatarPreview || null,
          members: selectedMembers,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Группа создана',
          description: `Группа "${groupName}" успешно создана`,
        });
        handleClose();
        onSuccess();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать группу',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать группу',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setGroupName('');
    setAvatarFile(null);
    setAvatarPreview('');
    setSelectedMembers([]);
    onClose();
  };

  const nonGroupChats = existingChats.filter((chat) => !chat.is_group);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step === 1 && 'Название группы'}
            {step === 2 && 'Аватарка группы'}
            {step === 3 && 'Участники группы'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Название</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Введите название группы"
                  className="glass border-primary/30 mt-1"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!groupName.trim()}
              >
                Далее
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-primary/30">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                    {groupName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <Label
                  htmlFor="avatar-upload"
                  className="cursor-pointer px-4 py-2 rounded-lg glass border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-2"
                >
                  <Icon name="Upload" size={16} />
                  Выбрать аватарку
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 glass border-primary/30"
                >
                  Назад
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Далее
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <ScrollArea className="h-64">
                {nonGroupChats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет доступных контактов
                  </p>
                ) : (
                  <div className="space-y-2">
                    {nonGroupChats.map((chat) => (
                      <div
                        key={chat.id}
                        className="flex items-center gap-3 p-2 rounded-lg glass hover:bg-primary/10 cursor-pointer"
                        onClick={() => handleMemberToggle(chat.id)}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(chat.id)}
                          onCheckedChange={() => handleMemberToggle(chat.id)}
                        />
                        <Avatar className="h-10 w-10 border-2 border-primary/30">
                          <AvatarImage src={chat.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {chat.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{chat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 glass border-primary/30"
                >
                  Назад
                </Button>
                <Button
                  onClick={handleCreate}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={loading || selectedMembers.length === 0}
                >
                  {loading ? (
                    <Icon name="Loader2" className="animate-spin" />
                  ) : (
                    'Создать группу'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
