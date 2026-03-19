package com.livemart.ai.memory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Redis 기반 Spring AI ChatMemory 구현체
 *
 * - 세션 ID 기준으로 대화 이력을 Redis에 저장
 * - 최대 20턴(40 메시지) 보관, 30분 TTL
 * - Spring AI MessageChatMemoryAdvisor와 완전 통합
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisChatMemory implements ChatMemory {

    private static final String KEY_PREFIX = "ai:memory:";
    private static final Duration TTL = Duration.ofMinutes(30);
    private static final int MAX_MESSAGES = 40; // 20턴

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void add(String conversationId, List<Message> messages) {
        String key = KEY_PREFIX + conversationId;
        try {
            List<Map<String, String>> stored = getStored(key);
            for (Message msg : messages) {
                stored.add(Map.of(
                        "type", msg.getMessageType().getValue(),
                        "content", msg.getText()
                ));
            }
            // 최근 MAX_MESSAGES개만 유지
            if (stored.size() > MAX_MESSAGES) {
                stored = new ArrayList<>(stored.subList(stored.size() - MAX_MESSAGES, stored.size()));
            }
            redisTemplate.opsForValue().set(key, stored, TTL);
        } catch (Exception e) {
            log.warn("Failed to save chat memory: conversationId={}, error={}", conversationId, e.getMessage());
        }
    }

    @Override
    public List<Message> get(String conversationId, int lastN) {
        String key = KEY_PREFIX + conversationId;
        try {
            List<Map<String, String>> stored = getStored(key);
            if (stored.isEmpty()) return List.of();

            int fromIndex = Math.max(0, stored.size() - lastN);
            return stored.subList(fromIndex, stored.size()).stream()
                    .map(this::toMessage)
                    .filter(m -> m != null)
                    .toList();
        } catch (Exception e) {
            log.warn("Failed to load chat memory: conversationId={}, error={}", conversationId, e.getMessage());
            return List.of();
        }
    }

    @Override
    public void clear(String conversationId) {
        try {
            redisTemplate.delete(KEY_PREFIX + conversationId);
        } catch (Exception e) {
            log.warn("Failed to clear chat memory: conversationId={}", conversationId);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> getStored(String key) {
        Object raw = redisTemplate.opsForValue().get(key);
        if (raw instanceof List<?> list) {
            return new ArrayList<>((List<Map<String, String>>) list);
        }
        return new ArrayList<>();
    }

    private Message toMessage(Map<String, String> map) {
        String type = map.get("type");
        String content = map.get("content");
        if (content == null) return null;

        return switch (type) {
            case "user" -> new UserMessage(content);
            case "assistant" -> new AssistantMessage(content);
            default -> null;
        };
    }
}
