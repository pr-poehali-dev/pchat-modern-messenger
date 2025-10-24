import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface Chat {
  id: number;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
  last_message: string | null;
  last_message_time: string | null;
}

interface User {
  user_id: number;
  username: string;
}

interface ChatListProps {
  chats: Chat[];
  onChatSelect: (chat: Chat) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onSettings: () => void;
  onDeleteChat: (chatId: number) => void;
  currentUser: User;
}

export default function ChatList({
  chats,
  onChatSelect,
  onNewChat,
  onNewGroup,
  onSettings,
  onDeleteChat,
}: ChatListProps) {
  const formatTime = (isoTime: string | null) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
    if (diff < 86400000) return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex flex-col h-full glass-strong border-r border-primary/30">
      <div className="p-4 border-b border-primary/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PChat
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            className="hover:bg-primary/20"
          >
            <Icon name="Settings" size={20} />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onNewChat}
            className="flex-1 glass hover:bg-primary/20 border-primary/30"
            variant="outline"
          >
            <Icon name="UserPlus" size={16} className="mr-1" />
            <span className="text-xs">ЛС</span>
          </Button>
          <Button
            size="sm"
            onClick={onNewGroup}
            className="flex-1 glass hover:bg-primary/20 border-primary/30"
            variant="outline"
          >
            <Icon name="Users" size={16} className="mr-1" />
            <span className="text-xs">Группа</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {chats.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Icon name="MessageCircle" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                Нет чатов. Создайте новый!
              </p>
            </div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="relative group/chat mb-2">
                <button
                  onClick={() => onChatSelect(chat)}
                  className="w-full p-3 rounded-xl glass hover:bg-primary/10 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/30">
                      <AvatarImage src={chat.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {chat.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {chat.name || 'Неизвестный'}
                        </h3>
                        {chat.last_message_time && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chat.last_message_time)}
                          </span>
                        )}
                      </div>
                      {chat.last_message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat:opacity-100 transition-opacity hover:bg-destructive/20 h-8 w-8"
                >
                  <Icon name="Trash2" size={14} className="text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}