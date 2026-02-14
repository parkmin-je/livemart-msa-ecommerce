package com.livemart.product.ai;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@ConditionalOnBean(ProductAiService.class)
public class ProductAiController {

    private final ProductAiService productAiService;

    public ProductAiController(ProductAiService productAiService) {
        this.productAiService = productAiService;
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> aiSearch(@RequestParam String query) {
        String result = productAiService.searchWithAi(query);
        return ResponseEntity.ok(Map.of("query", query, "result", result));
    }

    @PostMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> getRecommendations(
            @RequestParam Long userId,
            @RequestBody List<Long> recentProductIds) {
        String result = productAiService.getRecommendations(userId, recentProductIds);
        return ResponseEntity.ok(Map.of("userId", userId, "result", result));
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody Map<String, String> request) {
        String message = request.get("message");
        String context = request.get("context");
        String response = productAiService.chat(message, context);
        return ResponseEntity.ok(Map.of("response", response));
    }
}
