package com.edualto.ai.service;

import com.edualto.common.exception.BusinessException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AiChatRateLimitService {
    private record Window(Instant start, int count) { }
    private final Map<String, Window> clients = new HashMap<>();

    public synchronized void claim(String client) {
        Instant now = Instant.now();
        clients.entrySet().removeIf(entry -> entry.getValue().start().isBefore(now.minusSeconds(60)));
        Window window = clients.get(client);
        if (window == null) {
            if (clients.size() >= 10000) throw exhausted();
            clients.put(client, new Window(now, 1));
        } else {
            if (window.count() >= 8) throw exhausted();
            clients.put(client, new Window(window.start(), window.count() + 1));
        }
    }

    private static BusinessException exhausted() {
        return new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "AI_CHAT_RATE_LIMIT",
                "Bạn đã gửi nhiều tin nhắn liên tiếp. Vui lòng chờ một phút rồi thử lại.");
    }
}
