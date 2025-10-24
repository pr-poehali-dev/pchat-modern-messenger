import { useState, useEffect } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import CreateGroupDialog from './CreateGroupDialog';
import SettingsDialog from './SettingsDialog';
import { useToast } from '@/hooks/use-toast';

const CHATS_API = 'https://functions.poehali.dev/2f19c6bc-5b44-4f12-a380-4f5c4255084e';

interface User {
  user_id: number;
  username: string;
}

interface Chat {
  id: number;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
  last_message: string | null;
  last_message_time: string | null;
}

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

export default function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const loadChats = async () => {
    try {
      const response = await fetch(`${CHATS_API}?user_id=${user.user_id}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [user.user_id]);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  const handleNewChat = async () => {
    const otherUsername = prompt('Введите username собеседника:');
    if (!otherUsername) return;

    try {
      const response = await fetch(CHATS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          is_group: false,
          other_user: otherUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Чат создан',
          description: `Чат с ${otherUsername} создан`,
        });
        loadChats();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать чат',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать чат',
        variant: 'destructive',
      });
    }
  };

  const handleNewGroup = () => {
    setShowGroupDialog(true);
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      const response = await fetch(`${CHATS_API}/${chatId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      });

      if (response.ok) {
        toast({
          title: 'Чат удален',
          description: 'Чат удален из списка',
        });
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
        }
        loadChats();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить чат',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 lg:w-[420px] flex-shrink-0`}>
        <ChatList
          chats={chats}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onNewGroup={handleNewGroup}
          onSettings={handleSettings}
          onDeleteChat={handleDeleteChat}
          currentUser={user}
        />
      </div>
      
      <CreateGroupDialog
        open={showGroupDialog}
        onClose={() => setShowGroupDialog(false)}
        onSuccess={loadChats}
        existingChats={chats}
        currentUserId={user.user_id}
      />
      
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={user}
        onLogout={onLogout}
      />
      
      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0`}>
        <ChatWindow
          chat={selectedChat}
          currentUser={user}
          onBack={handleBackToList}
          onChatUpdate={loadChats}
        />
      </div>
    </div>
  );
}