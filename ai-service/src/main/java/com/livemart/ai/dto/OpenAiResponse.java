package com.livemart.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * OpenAI Chat Completions API 응답 DTO (동기 + 스트리밍 공용)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenAiResponse(
        String id,
        String object,
        Long created,
        String model,
        List<Choice> choices,
        Usage usage
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Choice(
            Integer index,
            Message message,
            Delta delta,                    // 스트리밍 전용
            @JsonProperty("finish_reason")
            String finishReason
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Message(String role, String content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Delta(String role, String content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Usage(
            @JsonProperty("prompt_tokens")    Integer promptTokens,
            @JsonProperty("completion_tokens") Integer completionTokens,
            @JsonProperty("total_tokens")     Integer totalTokens
    ) {}

    /** 응답 텍스트 추출 헬퍼 */
    public String extractContent() {
        if (choices == null || choices.isEmpty()) return "";
        var msg = choices.get(0).message();
        return msg != null ? msg.content() : "";
    }
}
