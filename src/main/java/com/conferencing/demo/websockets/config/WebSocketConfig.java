package com.conferencing.demo.websockets.config;

import com.conferencing.demo.websockets.service.RelayWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(relayHandler(), "/ws/av")
                .setAllowedOrigins("*");
    }

    @Bean
    public RelayWebSocketHandler relayHandler() {
        return new RelayWebSocketHandler();
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxBinaryMessageBufferSize(8 * 1024 * 1024); // 8 MB
        container.setMaxTextMessageBufferSize(1024 * 1024);        // not used
        return container;
    }
}

