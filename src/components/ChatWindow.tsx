import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import GroupManagementDialog from './GroupManagementDialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_API = 'https://functions.poehali.dev/196c0fd9-ff0b-453b-93a7-725c4e5a97e6';

interface Chat {
  id: number;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
}

interface User {
  user_id: number;
  username: string;
}

interface Message {
  id: number;
  content: string;
  file_url: string | null;
  is_system_message: boolean;
  created_at: string;
  sender: {
    id: number;
    nickname: string;
    avatar_url: string | null;
  } | null;
  is_delivered?: boolean;
  is_read?: boolean;
}

interface ChatWindowProps {
  chat: Chat | null;
  currentUser: User;
  onBack: () => void;
  onChatUpdate: () => void;
}

export default function ChatWindow({ chat, currentUser, onBack, onChatUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadMessages = async () => {
    if (!chat) return;

    try {
      const response = await fetch(`${MESSAGES_API}?chat_id=${chat.id}&user_id=${currentUser.user_id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  useEffect(() => {
    if (chat) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [chat?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !fileToUpload) || !chat || sending) return;

    setSending(true);
    const messageText = inputMessage;
    setInputMessage('');

    let fileUrl = null;
    if (fileToUpload) {
      const reader = new FileReader();
      fileUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(fileToUpload);
      });
      setFileToUpload(null);
    }

    try {
      const response = await fetch(MESSAGES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          sender_id: currentUser.user_id,
          content: messageText || '📎 Файл',
          file_url: fileUrl,
        }),
      });

      if (response.ok) {
        loadMessages();
        onChatUpdate();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось отправить сообщение',
          variant: 'destructive',
        });
        setInputMessage(messageText);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive',
      });
      setInputMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoTime: string) => {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatus = (message: Message) => {
    if (message.is_read) return <Icon name="CheckCheck" size={14} className="text-blue-500" />;
    if (message.is_delivered) return <Icon name="CheckCheck" size={14} className="text-muted-foreground" />;
    return <Icon name="Check" size={14} className="text-muted-foreground" />;
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center glass w-full">
        <div className="text-center">
          <Icon name="MessageCircle" size={64} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">Выберите чат</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen glass w-full">
      <div className="p-4 border-b border-primary/30 glass-strong flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden hover:bg-primary/20"
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>

        <Avatar className="h-10 w-10 border-2 border-primary/30">
          <AvatarImage src={chat.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {chat.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h2 className="font-semibold">{chat.name || 'Неизвестный'}</h2>
          {chat.is_group && (
            <p className="text-xs text-muted-foreground">Группа</p>
          )}
        </div>

        {chat.is_group && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGroupManagement(true)}
            className="hover:bg-primary/20"
          >
            <Icon name="Users" size={20} />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Нет сообщений</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender?.id === currentUser.user_id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isOwn
                        ? 'bg-primary/20 border-primary/30'
                        : 'glass border-primary/20'
                    } rounded-2xl p-3 border`}
                  >
                    {chat.is_group && !isOwn && (
                      <p className="text-xs font-semibold text-primary mb-1">
                        {message.sender?.nickname || 'Неизвестный'}
                      </p>
                    )}
                    
                    {message.file_url && (
                      <img
                        src={message.file_url}
                        alt="attachment"
                        className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.file_url!, '_blank')}
                      />
                    )}
                    
                    <p className="text-sm break-words">{message.content}</p>
                    
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                      {isOwn && !chat.is_group && getMessageStatus(message)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-4 border-t border-primary/30 glass-strong">
        {fileToUpload && (
          <div className="mb-2 p-2 rounded-lg glass flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Paperclip" size={16} />
              <span className="text-sm">{fileToUpload.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFileToUpload(null)}
            >
              <Icon name="X" size={16} />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="glass border-primary/30 hover:bg-primary/20"
            disabled={sending}
          >
            <Icon name="Paperclip" size={20} />
          </Button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Сообщение..."
            className="flex-1 glass border-primary/30 focus:border-primary"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary hover:bg-primary/90"
            disabled={sending || (!inputMessage.trim() && !fileToUpload)}
          >
            {sending ? (
              <Icon name="Loader2" className="animate-spin" size={20} />
            ) : (
              <Icon name="Send" size={20} />
            )}
          </Button>
        </div>
      </form>

      <GroupManagementDialog
        open={showGroupManagement}
        onClose={() => setShowGroupManagement(false)}
        chat={chat}
        currentUser={currentUser.user_id}
        onUpdate={() => {
          loadMessages();
          onChatUpdate();
        }}
      />
    </div>
  );
}