import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Loader2, MessageSquare, Plus } from 'lucide-react';
import { chatConversationsAPI } from '../../services/api';
import type { ChatConversation, ChatMessage } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export const MeitiChat: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [currentEmployeeId] = useState('mock-employee-id'); // TODO: Get from auth context
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['chatConversations', currentEmployeeId],
    queryFn: async () => {
      const response = await chatConversationsAPI.getAll({ employee_id: currentEmployeeId, is_active: true });
      return response.data;
    },
  });

  // Fetch selected conversation details
  const { data: selectedConversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['chatConversation', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const response = await chatConversationsAPI.getById(selectedConversationId);
      return response.data;
    },
    enabled: !!selectedConversationId,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return await chatConversationsAPI.create({
        employee: currentEmployeeId,
        title: 'Neue Unterhaltung',
        is_active: true,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
      setSelectedConversationId(response.data.id);
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      return await chatConversationsAPI.sendMessage(selectedConversationId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversation', selectedConversationId] });
      setMessageInput('');
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messages = selectedConversation?.messages || [];

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-lg shadow overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => createConversationMutation.mutate()}
            disabled={createConversationMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createConversationMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Neue Unterhaltung
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-bavaria-blue" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Keine Unterhaltungen</p>
              <p className="text-sm mt-1">Erstellen Sie eine neue Unterhaltung</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conv: ChatConversation) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedConversationId === conv.id ? 'bg-blue-50 border-l-4 border-bavaria-blue' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-bavaria-blue flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conv.title || 'Unterhaltung'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {conv.message_count || 0} Nachrichten
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(conv.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-bavaria-blue" />
            <div>
              <h2 className="font-semibold text-gray-900">Meiti AI Assistent</h2>
              <p className="text-sm text-gray-500">Ihr intelligenter Helfer für BAVARIABOOKINGX</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedConversationId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Bot className="h-16 w-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Willkommen bei Meiti AI</h3>
              <p className="text-center max-w-md">
                Wählen Sie eine Unterhaltung aus oder erstellen Sie eine neue, um mit Ihrem KI-Assistenten zu chatten.
              </p>
            </div>
          ) : conversationLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-bavaria-blue" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Bot className="h-16 w-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Starten Sie eine Unterhaltung</h3>
              <p className="text-center max-w-md mb-4">
                Fragen Sie mich nach Auslastung, Reservierungen, Personal, Tischen oder Umsatz!
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-2xl">
                {[
                  'Wie ist die aktuelle Auslastung?',
                  'Welche Tische sind frei?',
                  'Wie viele Reservierungen haben wir heute?',
                  'Gib mir Empfehlungen für heute',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setMessageInput(suggestion);
                      sendMessageMutation.mutate(suggestion);
                    }}
                    className="p-3 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message: ChatMessage) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-bavaria-blue flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-bavaria-blue text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {format(new Date(message.created_at), 'HH:mm', { locale: de })}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {sendMessageMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-bavaria-blue flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="max-w-2xl px-4 py-3 rounded-lg bg-gray-100">
                    <Loader2 className="h-5 w-5 animate-spin text-bavaria-blue" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {selectedConversationId && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Frage Meiti AI etwas..."
                rows={1}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bavaria-blue resize-none"
                disabled={sendMessageMutation.isPending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                className="px-6 py-3 bg-bavaria-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Drücken Sie Enter zum Senden, Shift+Enter für neue Zeile
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
