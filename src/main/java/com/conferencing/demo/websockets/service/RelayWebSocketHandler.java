package com.conferencing.demo.websockets.service;


import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class RelayWebSocketHandler extends BinaryWebSocketHandler {

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        System.out.println("Connected: " + session.getId());
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession sender, BinaryMessage message) {
        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen() && !session.getId().equals(sender.getId())) {
                    session.sendMessage(message);
                }
            } catch (Exception e) {
                System.err.println("Failed to send to session " + session.getId() + ": " + e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        sessions.remove(session);
        System.out.println("Disconnected: " + session.getId());
    }
}



