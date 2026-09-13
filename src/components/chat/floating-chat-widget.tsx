'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  MessageCircle,
  X,
  Minus,
  Maximize2,
  Send,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  Loader2,
  Users,
  Sparkles,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { playMessageChime } from '@/lib/chat-sound'
import type { ConversationItem } from '@/app/api/chat/conversations/route'

export interface ChatTargetUser {
  id: string
  username: string
  name?: string | null
  avatar?: string | null
}

interface ChatMessageItem {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    username: string
    name: string | null
    avatar: string | null
    image: string | null
  }
}

export function FloatingChatWidget() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id

  // State
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activePartner, setActivePartner] = useState<ChatTargetUser | null>(null)

  // Unread badge count across all conversations
  const [totalUnread, setTotalUnread] = useState(0)

  // Conversations list state
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Messages in active chat state
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null)

  // Input state
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Refs for auto-scroll and tracking sound
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const lastKnownMessageIdRef = useRef<string | null>(null)
  const prevTotalUnreadRef = useRef<number>(0)

  // 1. Fetch total unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUserId) return
    try {
      const res = await fetch('/api/chat/unread-count')
      if (res.ok) {
        const data = await res.json()
        const newUnread = data.unreadCount || 0
        if (newUnread > prevTotalUnreadRef.current) {
          playMessageChime()
        }
        prevTotalUnreadRef.current = newUnread
        setTotalUnread(newUnread)
      }
    } catch {
      // Ignore background network errors
    }
  }, [currentUserId])

  // 2. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return
    try {
      const res = await fetch(`/api/chat/conversations${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch {
      // Ignore background errors
    }
  }, [currentUserId, searchQuery])

  // 3. Fetch active chat messages
  const fetchActiveMessages = useCallback(async (isPolling = false) => {
    if (!currentUserId || !activePartner) return
    if (!isPolling) setLoadingMessages(true)

    try {
      const res = await fetch(`/api/chat?withUserId=${activePartner.id}`)
      if (res.ok) {
        const data = await res.json()
        const newMessages: ChatMessageItem[] = data.messages || []

        if (newMessages.length > 0) {
          const lastMsg = newMessages[newMessages.length - 1]

          // Check if a new message from partner arrived during polling
          if (
            isPolling &&
            lastKnownMessageIdRef.current &&
            lastMsg.id !== lastKnownMessageIdRef.current &&
            lastMsg.senderId === activePartner.id
          ) {
            playMessageChime()
          }

          lastKnownMessageIdRef.current = lastMsg.id
        }

        setMessages(newMessages)
        setHasMore(Boolean(data.hasMore))
        setOldestTimestamp(data.oldestTimestamp || null)

        // Scroll to bottom on initial load or if user is already at bottom
        if (!isPolling) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }
    } catch (err) {
      console.warn('Error fetching chat messages:', err)
    } finally {
      if (!isPolling) setLoadingMessages(false)
    }
  }, [currentUserId, activePartner])

  // 4. Load older messages (scroll-up pagination)
  const handleLoadOlderMessages = async () => {
    if (!currentUserId || !activePartner || !oldestTimestamp || loadingMore) return
    setLoadingMore(true)

    const prevScrollHeight = messagesContainerRef.current?.scrollHeight || 0

    try {
      const res = await fetch(`/api/chat?withUserId=${activePartner.id}&before=${encodeURIComponent(oldestTimestamp)}`)
      if (res.ok) {
        const data = await res.json()
        const olderMessages: ChatMessageItem[] = data.messages || []
        setMessages((prev) => [...olderMessages, ...prev])
        setHasMore(Boolean(data.hasMore))
        setOldestTimestamp(data.oldestTimestamp || null)

        // Maintain scroll position after prepending older messages
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight
          }
        }, 50)
      }
    } catch {
      // Ignore pagination errors
    } finally {
      setLoadingMore(false)
    }
  }

  // 5. Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || !activePartner || isSending || !currentUserId) return

    const messageText = inputText.trim()
    setInputText('')
    setIsSending(true)

    // Optimistic message item
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      senderId: currentUserId,
      receiverId: activePartner.id,
      content: messageText,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        username: session?.user?.name || 'Ja',
        name: session?.user?.name || null,
        avatar: session?.user?.image || null,
        image: session?.user?.image || null,
      },
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activePartner.id,
          content: messageText,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          lastKnownMessageIdRef.current = data.message.id
          setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)))
        }
      } else {
        // Rollback optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        alert('Nie udało się wysłać wiadomości')
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  // Listen for custom global event to open chat with specific user from profile or friend list
  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<ChatTargetUser>
      if (customEvent.detail) {
        setActivePartner(customEvent.detail)
        setIsOpen(true)
        setIsMinimized(false)
      }
    }

    window.addEventListener('open_chat_with_user', handleOpenChat)
    return () => {
      window.removeEventListener('open_chat_with_user', handleOpenChat)
    }
  }, [])

  // Periodic polling
  useEffect(() => {
    if (!currentUserId) return

    fetchUnreadCount()
    const unreadInterval = setInterval(fetchUnreadCount, 8000)

    return () => clearInterval(unreadInterval)
  }, [currentUserId, fetchUnreadCount])

  // Polling active chat messages when chat is open and expanded
  useEffect(() => {
    if (!isOpen || isMinimized || !activePartner) return

    fetchActiveMessages(false)
    const chatInterval = setInterval(() => {
      fetchActiveMessages(true)
    }, 3500)

    return () => clearInterval(chatInterval)
  }, [isOpen, isMinimized, activePartner, fetchActiveMessages])

  // Polling conversation list when conversation panel is open
  useEffect(() => {
    if (!isOpen || isMinimized || activePartner) return

    setLoadingConversations(true)
    fetchConversations().finally(() => setLoadingConversations(false))

    const convInterval = setInterval(fetchConversations, 5000)
    return () => clearInterval(convInterval)
  }, [isOpen, isMinimized, activePartner, fetchConversations])

  // Scroll listener for top pagination
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    if (messagesContainerRef.current.scrollTop <= 10 && hasMore && !loadingMore) {
      handleLoadOlderMessages()
    }
  }

  if (!currentUserId) return null

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING CTA BUTTON (Docked directly above ScrollToTop)   */}
      {/* ========================================================= */}
      <div className="fixed bottom-34 right-4 md:bottom-22 md:right-8 z-50 animate-in fade-in zoom-in-75 duration-200">
        <div className="relative">
          <Button
            type="button"
            size="icon"
            onClick={() => {
              if (isOpen && isMinimized) {
                setIsMinimized(false)
              } else {
                setIsOpen(!isOpen)
                if (isOpen) setIsMinimized(false)
              }
            }}
            aria-label="Czat użytkowników"
            className={`h-11 w-11 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-200 active:scale-95 ${
              isOpen && !isMinimized
                ? 'bg-cyan-500 text-black border-cyan-300 shadow-cyan-500/30'
                : 'bg-[#0A0F1D]/90 border-cyan-500/40 text-cyan-400 hover:text-white hover:bg-cyan-600/90 shadow-black/60'
            }`}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* Unread Message Badge Count */}
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-md shadow-rose-500/30 border-2 border-[#090D18] animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CHAT WINDOW / CONVERSATIONS MODAL (Messenger style)      */}
      {/* ========================================================= */}
      {isOpen && (
        <div
          className={`fixed right-4 md:right-8 z-50 transition-all duration-300 ${
            isMinimized
              ? 'bottom-34 md:bottom-22 w-72'
              : 'bottom-4 md:bottom-6 w-[calc(100vw-2rem)] sm:w-96'
          }`}
        >
          <div className="flex flex-col rounded-3xl bg-[#090D18]/95 border border-white/15 shadow-2xl backdrop-blur-3xl overflow-hidden text-white">
            {/* ----------------------------------------------------- */}
            {/* HEADER BAR                                            */}
            {/* ----------------------------------------------------- */}
            <div className="flex items-center justify-between p-3.5 px-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-[#0B1020] to-purple-950/40">
              {activePartner ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setActivePartner(null)
                      fetchConversations()
                    }}
                    className="h-7 w-7 text-muted-foreground hover:text-white rounded-lg -ml-1 shrink-0"
                    title="Wróć do listy konwersacji"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  {/* Recipient Avatar */}
                  <Link
                    href={`/users/${activePartner.username}`}
                    className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-cyan-500/40 group"
                    title={`Zobacz profil @${activePartner.username}`}
                  >
                    {activePartner.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activePartner.avatar}
                        alt={activePartner.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-cyan-950 text-xs font-black text-cyan-300">
                        {activePartner.name?.[0] || activePartner.username[0].toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Recipient Name & Username */}
                  <div className="min-w-0">
                    <Link
                      href={`/users/${activePartner.username}`}
                      className="text-xs font-black text-white hover:text-cyan-300 truncate block transition-colors leading-tight"
                    >
                      {activePartner.name || activePartner.username}
                    </Link>
                    <span className="text-[10px] text-cyan-400 font-semibold block leading-tight">
                      @{activePartner.username}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white leading-tight">Czat MangOwO</h3>
                    <span className="text-[10px] text-muted-foreground block leading-tight">
                      Wiadomości prywatne
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons (Minimize, Close) */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-7 w-7 text-muted-foreground hover:text-white rounded-lg"
                  title={isMinimized ? 'Rozwiń okno' : 'Zminimalizuj'}
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setIsOpen(false)
                    setIsMinimized(false)
                  }}
                  className="h-7 w-7 text-muted-foreground hover:text-rose-400 rounded-lg"
                  title="Zamknij czat"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* If Minimized: Do not render body */}
            {!isMinimized && (
              <>
                {/* ----------------------------------------------------- */}
                {/* VIEW 1: ACTIVE CHAT CONVERSATION                     */}
                {/* ----------------------------------------------------- */}
                {activePartner ? (
                  <div className="flex flex-col h-[400px] sm:h-[440px]">
                    {/* Message list container */}
                    <div
                      ref={messagesContainerRef}
                      onScroll={handleScroll}
                      className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-[#070A14]"
                    >
                      {/* Load Older Messages Trigger */}
                      {hasMore && (
                        <div className="flex justify-center pb-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleLoadOlderMessages}
                            disabled={loadingMore}
                            className="h-6 text-[10px] font-bold text-cyan-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full px-3 gap-1"
                          >
                            {loadingMore ? (
                              <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )}
                            Wczytaj starsze wiadomości
                          </Button>
                        </div>
                      )}

                      {loadingMessages ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                          <span className="text-xs">Ładowanie rozmowy...</span>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
                          <div className="h-10 w-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-white">Rozpocznij konwersację</p>
                          <p className="text-[11px] max-w-[200px]">
                            Napisz pierwszą wiadomość do @{activePartner.username}!
                          </p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMine = msg.senderId === currentUserId
                          const timeString = new Date(msg.createdAt).toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs break-words shadow-md ${
                                  isMine
                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs'
                                    : 'bg-white/10 text-white rounded-bl-xs border border-white/10'
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 px-1 text-[9px] text-muted-foreground/75">
                                <span>{timeString}</span>
                                {isMine && (
                                  <span>
                                    {msg.isRead ? (
                                      <CheckCheck className="h-2.5 w-2.5 text-cyan-400 inline" />
                                    ) : (
                                      <Check className="h-2.5 w-2.5 inline" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <form
                      onSubmit={handleSendMessage}
                      className="p-2.5 border-t border-white/10 bg-[#090D18] flex items-center gap-2"
                    >
                      <Input
                        type="text"
                        placeholder="Napisz wiadomość... (Enter aby wysłać)"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="h-9 bg-white/5 border-white/15 text-xs text-white placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-cyan-400"
                        disabled={isSending}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!inputText.trim() || isSending}
                        className="h-9 w-9 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl shrink-0 transition-transform active:scale-95 disabled:opacity-40"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  /* ----------------------------------------------------- */
                  /* VIEW 2: CONVERSATIONS LIST & USER SEARCH              */
                  /* ----------------------------------------------------- */
                  <div className="flex flex-col h-[400px] sm:h-[440px]">
                    {/* Search bar */}
                    <div className="p-3 border-b border-white/10 bg-[#090D18]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Szukaj znajomego lub użytkownika..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-cyan-400"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Conversations list */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#070A14]">
                      {loadingConversations ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                          <span className="text-xs">Ładowanie konwersacji...</span>
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
                          <Users className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-xs font-bold text-white">Brak aktywnych konwersacji</p>
                          <p className="text-[11px] max-w-[200px]">
                            Wyszukaj znajomego powyżej lub kliknij przycisk wiadomości na jego profilu!
                          </p>
                        </div>
                      ) : (
                        conversations.map((conv) => {
                          const timeText = conv.lastMessageAt
                            ? new Date(conv.lastMessageAt).toLocaleDateString('pl-PL', {
                                day: '2-digit',
                                month: 'short',
                              })
                            : null

                          return (
                            <button
                              key={conv.id}
                              type="button"
                              onClick={() => setActivePartner(conv)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.06] transition-all text-left group border border-transparent hover:border-white/10"
                            >
                              {/* Avatar */}
                              <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0 border border-white/15">
                                {conv.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={conv.avatar}
                                    alt={conv.username}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-cyan-950 text-xs font-black text-cyan-300">
                                    {conv.name?.[0] || conv.username[0].toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                    {conv.name || conv.username}
                                  </span>
                                  {timeText && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {timeText}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {conv.lastMessage || (
                                      <span className="text-cyan-400/80 italic">Kliknij, aby napisać</span>
                                    )}
                                  </p>

                                  {conv.unreadCount > 0 && (
                                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shrink-0 shadow-sm">
                                      {conv.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
