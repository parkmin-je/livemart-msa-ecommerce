package com.livemart.order.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI orderServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("LiveMart Order Service API")
                        .description("주문 생성, 조회, 취소 및 상태 관리를 위한 REST API")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("LiveMart Team")
                                .email("dev@livemart.com")))
                .servers(List.of(
                        new Server().url("http://localhost:8083").description("Local"),
                        new Server().url("http://localhost:8080/order-service").description("Gateway")
                ));
    }
}
