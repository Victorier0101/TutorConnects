import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  CircularProgress,
  TextField,
  IconButton,
  Paper,
  ListItemButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: number;
  participant1_id: number;
  participant2_id: number;
  participant1_name: string;
  participant2_name: string;
  participant1_avatar?: string;
  participant2_avatar?: string;
  last_message: string;
  unread_count: number;
  post_subject?: string;
}

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const MessagesPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    const fetchConvs = async () => {
      setLoadingConversations(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/conversations`);
        setConversations(res.data);
        if (res.data.length > 0) {
          setSelectedConv(res.data[0]);
        }
      } catch (error) {
        console.error('Fetch conversations error:', error);
      } finally {
        setLoadingConversations(false);
      }
    };
    fetchConvs();
  }, [token, navigate]);

  useEffect(() => {
    const fetchMsgs = async () => {
      if (!selectedConv) return;
      setLoadingMessages(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/conversations/${selectedConv.id}/messages`);
        setMessages(res.data);
        scrollToBottom();
      } catch (error) {
        console.error('Fetch messages error:', error);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMsgs();
  }, [selectedConv]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/conversations/${selectedConv.id}/messages`, {
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Conversations list */}
      <Paper elevation={0} sx={{ width: 300, borderRight: '1px solid #e0e0e0', overflowY: 'auto' }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Messages
        </Typography>
        <Divider />
        {loadingConversations ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 2, color: 'text.secondary' }}>No conversations yet.</Box>
        ) : (
          <List disablePadding>
            {conversations.map((conv) => {
              const otherName = conv.participant1_id === user?.id ? conv.participant2_name : conv.participant1_name;
              const otherAvatar = conv.participant1_id === user?.id ? conv.participant2_avatar : conv.participant1_avatar;
              return (
                <React.Fragment key={conv.id}>
                  <ListItemButton
                    selected={selectedConv?.id === conv.id}
                    onClick={() => setSelectedConv(conv)}
                    alignItems="flex-start"
                  >
                    <ListItemAvatar>
                      <Avatar src={otherAvatar}>{otherName?.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={otherName}
                      secondary={conv.last_message || 'No messages yet.'}
                    />
                  </ListItemButton>
                  <Divider component="li" />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Chat area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', p: 2 }}>
          <Typography variant="h6">
            {selectedConv ? (
              selectedConv.participant1_id === user?.id ? selectedConv.participant2_name : selectedConv.participant1_name
            ) : (
              'Select a conversation'
            )}
          </Typography>
        </Paper>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {loadingMessages ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ color: 'text.secondary' }}>No messages.</Box>
          ) : (
            messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  flexDirection: msg.sender_id === user?.id ? 'row-reverse' : 'row',
                  mb: 1.5,
                }}
              >
                <Avatar src={msg.sender_avatar} sx={{ ml: msg.sender_id === user?.id ? 1 : 0, mr: msg.sender_id === user?.id ? 0 : 1 }}>
                  {msg.sender_name.charAt(0)}
                </Avatar>
                <Box
                  sx={{
                    bgcolor: msg.sender_id === user?.id ? 'primary.main' : 'grey.300',
                    color: msg.sender_id === user?.id ? 'white' : 'black',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    maxWidth: '70%',
                  }}
                >
                  <Typography variant="body2">{msg.content}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        {selectedConv && (
          <Paper elevation={0} sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                variant="outlined"
                size="small"
              />
              <IconButton color="primary" onClick={handleSend} disabled={!newMessage.trim()}>
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default MessagesPage; 