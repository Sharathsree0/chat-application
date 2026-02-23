import axios from 'axios'

const API = axios.create({
    baseURL: "http://localhost:5000/api",
    withCredentials: true
});

export const fetchUsers = () => API.get("/messages/users");
export const fetchMessages = (recipientId) => API.get(`/message/${recipientId}`);
export const markAsRead = (messageId) => API.put(`/message/read/${messageId}`);
export const editMessage = (messageId, content) => API.put(`/message/edit/${messageId}`, { content });
export const deleteMessage = (messageId) => API.delete(`/message/delete/${messageId}`);
export const reactToMessage = (messageId, emoji) => API.post(`/message/react/${messageId}`, { emoji });

export default API;