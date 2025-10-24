import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  user_id: number;
  username: string;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
}

export default function SettingsDialog({ open, onClose, currentUser, onLogout }: SettingsDialogProps) {
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [hideOnline, setHideOnline] = useState(false);
  const [theme, setTheme] = useState('system');
  const [email, setEmail] = useState('');
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadUserSettings();
    }
  }, [open]);

  const loadUserSettings = async () => {
    try {
      const response = await fetch(`https://functions.poehali.dev/2a9e541b-ebd0-4366-8b3d-be92ef4828fa?user_id=${currentUser.user_id}`);
      if (response.ok) {
        const data = await response.json();
        setNickname(data.nickname || currentUser.username);
        setAvatarPreview(data.avatar_url || '');
        setHideOnline(data.hide_online_status || false);
        setTheme(data.theme || 'system');
        setEmail(data.email || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/2a9e541b-ebd0-4366-8b3d-be92ef4828fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          nickname,
          avatar_url: avatarPreview,
          hide_online_status: hideOnline,
          theme,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Настройки сохранены',
          description: 'Ваши настройки успешно обновлены',
        });
        onClose();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось сохранить настройки',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: 'Ошибка',
        description: 'Введите пароль для подтверждения',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/2a9e541b-ebd0-4366-8b3d-be92ef4828fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: currentUser.user_id,
          password: deletePassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Аккаунт удален',
          description: 'Ваш аккаунт был успешно удален',
        });
        onLogout();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось удалить аккаунт',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить аккаунт',
        variant: 'destructive',
      });
    }
  };

  const handleAddEmail = async () => {
    if (!email.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите email',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'В разработке',
      description: 'Защита через email будет добавлена в следующей версии',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-strong border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Настройки</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary/30">
              <AvatarImage src={avatarPreview} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                {nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Label
              htmlFor="settings-avatar-upload"
              className="cursor-pointer px-4 py-2 rounded-lg glass border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              <Icon name="Upload" size={16} />
              Изменить аватарку
            </Label>
            <input
              id="settings-avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Никнейм</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ваш никнейм"
              className="glass border-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label>Username (логин)</Label>
            <Input
              value={currentUser.username}
              disabled
              className="glass border-primary/30 opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Username нельзя изменить</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg glass">
            <div>
              <Label>Скрыть статус "онлайн"</Label>
              <p className="text-xs text-muted-foreground">Вы будете всегда оффлайн</p>
            </div>
            <Switch checked={hideOnline} onCheckedChange={setHideOnline} />
          </div>

          <div className="space-y-2">
            <Label>Тема оформления</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="glass border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-primary/30">
                <SelectItem value="system">Системная</SelectItem>
                <SelectItem value="light">Светлая</SelectItem>
                <SelectItem value="dark">Темная</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!showEmailSetup ? (
            <Button
              onClick={() => setShowEmailSetup(true)}
              variant="outline"
              className="w-full glass border-primary/30"
            >
              <Icon name="Shield" size={16} className="mr-2" />
              Добавить защиту аккаунту
            </Button>
          ) : (
            <div className="space-y-2 p-4 rounded-lg glass">
              <Label>Email для 2FA</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="glass border-primary/30"
              />
              <Button onClick={handleAddEmail} className="w-full bg-primary hover:bg-primary/90 mt-2">
                Привязать email
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Icon name="Loader2" className="animate-spin" /> : 'Сохранить'}
            </Button>
            <Button onClick={onLogout} variant="outline" className="flex-1 glass border-primary/30">
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
          </div>

          {!showDeleteConfirm ? (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              className="w-full"
            >
              <Icon name="Trash2" size={16} className="mr-2" />
              Удалить аккаунт
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg glass border-2 border-destructive/50">
              <div className="flex items-center gap-2 text-destructive">
                <Icon name="AlertTriangle" size={20} />
                <p className="font-semibold">Удаление аккаунта</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Это действие необратимо. Все ваши чаты и сообщения будут удалены.
              </p>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Введите пароль для подтверждения"
                className="glass border-destructive/50"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                  variant="outline"
                  className="flex-1 glass"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  className="flex-1"
                >
                  Удалить навсегда
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}