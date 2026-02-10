package com.livemart.product.config;

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
    public OpenAPI productServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("LiveMart Product Service API")
                        .description("상품 등록, 조회, 수정, 삭제 및 재고 관리 REST API")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("LiveMart Team")
                                .email("dev@livemart.com")))
                .servers(List.of(
                        new Server().url("http://localhost:8082").description("Local"),
                        new Server().url("http://localhost:8080/product-service").description("Gateway")
                ));
    }
}
