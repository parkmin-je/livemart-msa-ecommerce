package com.livemart.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.util.List;

/**
 * OpenAI Chat Completions API 요청 DTO
 * https://platform.openai.com/docs/api-reference/chat/create
 */
@Builder
public record OpenAiRequest(
        String model,
        List<Message> messages,

        @JsonProperty("max_tokens")
        Integer maxTokens,

        Double temperature,
        Boolean stream,

        @JsonProperty("response_format")
        ResponseFormat responseFormat
) {
    public record Message(String role, String content) {
        public static Message system(String content) { return new Message("system", content); }
        public static Message user(String content)   { return new Message("user", content); }
        public static Message assistant(String content) { return new Message("assistant", content); }
    }

    public record ResponseFormat(String type) {
        public static ResponseFormat jsonObject() { return new ResponseFormat("json_object"); }
        public static ResponseFormat text()        { return new ResponseFormat("text"); }
    }
}
